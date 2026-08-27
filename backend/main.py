import os
import uuid
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .models import (
    ResumeAnalysisResponse, InterviewStartRequest, InterviewStartResponse,
    InterviewQuestion, InterviewNextQuestionRequest,
    InterviewAnswerEvaluationRequest, InterviewAnswerEvaluationResponse,
    InterviewFinalReportRequest, InterviewFinalReportResponse,
    InterviewSessionHistoryItem
)
from .parser import ResumeParser
from .analyzer import analyzer
from .interview_engine import interview_engine
from .database import db

# Initialize FastAPI App
app = FastAPI(
    title="CareerAI - Resume Analysis & Upgraded Interview Coach Engine API",
    description="AI-Powered Resume Analysis, ATS Compatibility & Personalized Mock Interview Engine (PCE-SW-PS-9)",
    version="2.2.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "CareerAI Backend Engine",
        "version": "2.2.0",
        "ai_provider": "google_gemini" if os.getenv("GEMINI_API_KEY") else ("openai" if os.getenv("OPENAI_API_KEY") else "heuristic_nlp_engine")
    }

# ============================================================================
# 1. Resume Analysis Endpoints
# ============================================================================

@app.post("/api/resume/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None)
):
    filename = file.filename or "uploaded_resume.pdf"
    name_lower = filename.lower()
    ext = os.path.splitext(name_lower)[1]

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{ext}'. Only .pdf, .docx, and .txt files are supported."
        )

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded file: {str(e)}"
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({(len(file_bytes)/(1024*1024)):.2f}MB) exceeds the 5MB limit."
        )

    try:
        raw_text = ResumeParser.extract_text(file_bytes, filename)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text extraction failed: {str(e)}"
        )

    if len(raw_text.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The extracted resume text contains fewer than 20 characters."
        )

    try:
        analysis_result = analyzer.analyze(raw_text, filename, job_description)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI analysis execution failed: {str(e)}"
        )

    analysis_id = str(uuid.uuid4())
    candidate_name = analysis_result.parsed_resume.candidate.name
    db.save_analysis(analysis_id, filename, candidate_name, analysis_result.model_dump())

    return analysis_result

@app.get("/api/analyses/recent")
async def get_recent_analyses():
    return db.get_recent_analyses(limit=10)

# ============================================================================
# 2. Upgraded AI Mock Interview Endpoints
# ============================================================================

@app.post("/api/interview/start", response_model=InterviewStartResponse)
async def start_interview(req: InterviewStartRequest):
    """
    Initializes a personalized or generic mock interview session.
    Extracts candidate resume keywords & JD requirements to synthesize tailored questions.
    """
    try:
        response = interview_engine.start_interview(req)
        return response
    except Exception as e:
        print(f"[ERROR] /api/interview/start failed: {e}")
        # Safe fallback
        return interview_engine.start_interview(InterviewStartRequest(
            target_role=req.target_role,
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            num_questions=req.num_questions,
            use_resume=False,
            use_jd=False
        ))

@app.post("/api/interview/question", response_model=InterviewQuestion)
async def get_next_question(req: InterviewNextQuestionRequest):
    """
    Generates next adaptive question taking previous answer and performance into account.
    """
    try:
        return interview_engine.generate_next_adaptive_question(req)
    except Exception as e:
        print(f"[ERROR] /api/interview/question failed: {e}")
        return interview_engine.generate_next_adaptive_question(req)

@app.post("/api/interview/evaluate", response_model=InterviewAnswerEvaluationResponse)
async def evaluate_interview_answer(req: InterviewAnswerEvaluationRequest):
    """
    Evaluates candidate response across 6 dimensions:
    - Relevance (0-10)
    - Technical Accuracy (0-10)
    - Communication (0-10)
    - Completeness (0-10)
    - Problem Solving (0-10)
    - Confidence (0-10)
    Returns dynamic overall score (0-100), structured feedback, and model coaching answer.
    """
    try:
        return interview_engine.evaluate_answer(req)
    except Exception as e:
        print(f"[ERROR] /api/interview/evaluate failed: {e}. Executing rubric fallback.")
        return interview_engine._evaluate_with_heuristic_rubric(req)

@app.post("/api/interview/finish", response_model=InterviewFinalReportResponse)
async def finish_interview(req: InterviewFinalReportRequest):
    """
    Synthesizes overall interview performance report, strengths, areas to improve,
    and a personalized practice plan. Saves to history for authenticated users.
    """
    try:
        report = interview_engine.generate_final_report(req)
        
        # Save to database if user is authenticated (or if explicitly saving)
        if not req.is_guest:
            db.save_interview_session(
                session_id=report.session_id,
                role=report.target_role,
                interview_type=report.interview_type,
                difficulty=report.difficulty,
                overall_score=report.overall_score,
                report_dict=report.model_dump(),
                user_id="auth-user"
            )
        return report
    except Exception as e:
        print(f"[ERROR] /api/interview/finish failed: {e}")
        return interview_engine._build_default_report(req.session_id, req.target_role, req.interview_type, req.difficulty)

@app.get("/api/interview/history")
async def get_interview_history(user_id: Optional[str] = "auth-user"):
    """
    Returns saved interview session history for authenticated users.
    """
    return db.get_interview_history(user_id=user_id, limit=20)

@app.get("/api/interview/report/{session_id}")
async def get_interview_report(session_id: str):
    """
    Fetches full detailed report JSON for a previously completed interview session.
    """
    report = db.get_interview_report(session_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview report '{session_id}' not found."
        )
    return report

# ============================================================================
# 3. Static Web Frontend Serving
# ============================================================================

app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")

@app.get("/")
async def serve_index():
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse({"message": "CareerAI Backend is active. index.html not found."})

@app.get("/{catchall:path}")
async def serve_spa(catchall: str):
    file_path = os.path.join(BASE_DIR, catchall)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(BASE_DIR, "index.html"))
