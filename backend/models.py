from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

# ============================================================================
# Resume Analysis Models
# ============================================================================

class SectionDetection(BaseModel):
    name: str
    exists: bool
    confidence: float = 1.0
    problems: List[str] = Field(default_factory=list)

class ImprovedBulletPoint(BaseModel):
    id: Optional[str] = None
    original: str
    improved: str
    type: str = "impact"  # 'impact', 'verb', 'clarity'
    reason: str

class ResumeCandidateInfo(BaseModel):
    name: str = "Unknown Candidate"
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""

class ResumeSectionItemBullet(BaseModel):
    id: str
    text: str
    hasSuggestion: bool = False
    suggestionType: Optional[str] = None
    suggestionTitle: Optional[str] = None
    impactScore: Optional[int] = None
    suggestionDesc: Optional[str] = None
    suggestedRewrite: Optional[str] = None

class ResumeSectionItem(BaseModel):
    id: str
    role: str
    company: str
    location: Optional[str] = ""
    dates: str
    bullets: List[ResumeSectionItemBullet] = Field(default_factory=list)

class ResumeSection(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    items: Optional[List[ResumeSectionItem]] = None

class ParsedResumeData(BaseModel):
    id: str
    title: str
    targetRole: str
    matchScore: int
    lastSaved: str = "Just now"
    candidate: ResumeCandidateInfo
    sections: List[ResumeSection]

class ResumeAnalysisResponse(BaseModel):
    success: bool = True
    resume_score: int
    ats_score: int
    keyword_alignment: int
    keyword_score: Optional[int] = None
    interview_readiness: int
    interview_readiness_score: Optional[int] = None
    detected_sections: Dict[str, SectionDetection]
    skills: List[str]
    missing_skills: List[str]
    matching_keywords: List[str]
    missing_keywords: List[str]
    match_percentage: int
    strengths: List[str]
    weaknesses: List[str]
    ats_issues: List[str]
    recommendations: List[str]
    improved_bullet_points: List[ImprovedBulletPoint]
    parsed_resume: ParsedResumeData
    raw_text_length: int
    processing_time_ms: Optional[float] = None
    ai_provider_used: str = "heuristic_engine"


# ============================================================================
# Upgraded Interview Coach & Question Generation Models
# ============================================================================

class InterviewStartRequest(BaseModel):
    target_role: str = "Software Developer"
    interview_type: str = "Mixed"  # "Technical", "HR / Behavioral", "Mixed"
    difficulty: str = "Intermediate"  # "Beginner", "Intermediate", "Advanced"
    num_questions: int = 5  # 5, 10, 15
    use_resume: bool = True
    use_jd: bool = True
    resume_text: Optional[str] = None
    job_description: Optional[str] = None
    candidate_name: Optional[str] = "Candidate"

class InterviewQuestion(BaseModel):
    id: str
    question_index: int
    total_questions: int
    category: str
    role: str
    difficulty: str
    question: str
    context_reason: Optional[str] = None
    recommended_duration_sec: int = 90
    expected_criteria: List[str] = Field(default_factory=list)
    sample_model_answer: Optional[str] = None

class InterviewStartResponse(BaseModel):
    success: bool = True
    session_id: str
    target_role: str
    interview_type: str
    difficulty: str
    total_questions: int
    is_personalized: bool
    context_summary: str
    first_question: InterviewQuestion
    all_questions_preview: Optional[List[InterviewQuestion]] = None

class InterviewNextQuestionRequest(BaseModel):
    session_id: str
    current_question_index: int
    total_questions: int
    target_role: str
    interview_type: str
    difficulty: str
    previous_score: Optional[int] = None
    previous_question: Optional[str] = None
    previous_answer: Optional[str] = None
    resume_text: Optional[str] = None
    job_description: Optional[str] = None

class InterviewEvaluationBreakdown(BaseModel):
    relevance: int = Field(..., ge=0, le=10, description="0-10 score")
    technical_accuracy: int = Field(..., ge=0, le=10, description="0-10 score")
    communication: int = Field(..., ge=0, le=10, description="0-10 score")
    completeness: int = Field(..., ge=0, le=10, description="0-10 score")
    problem_solving: int = Field(..., ge=0, le=10, description="0-10 score")
    confidence: int = Field(..., ge=0, le=10, description="0-10 score")

class InterviewAnswerEvaluationRequest(BaseModel):
    session_id: str
    question_index: int
    question: str
    category: str
    answer_text: str
    target_role: str
    difficulty: str
    time_taken_sec: Optional[int] = 0
    resume_text: Optional[str] = None
    job_description: Optional[str] = None
    speech_analysis: Optional[Dict[str, Any]] = None

class SpeechAnalysis(BaseModel):
    wpm: int = 0
    filler_count: int = 0
    pause_count: int = 0
    duration_seconds: int = 0
    clarity: int = 0
    feedback: str = ""

class InterviewAnswerEvaluationResponse(BaseModel):
    success: bool = True
    overall_score: int  # 0-100 (Dynamic, based on actual answer)
    scores_breakdown: InterviewEvaluationBreakdown
    what_you_did_well: str
    what_could_be_improved: str
    ai_recommendation: str
    model_answer: str  # Framed clearly as "one possible strong coaching approach"
    evaluation_mode: str = "ai_engine"  # "google_gemini", "openai", or "rubric_fallback"
    speech_analysis: Optional[SpeechAnalysis] = None

class PracticePlanItem(BaseModel):
    priority: int
    topic: str
    reason: str

class InterviewPerformanceBreakdown(BaseModel):
    technical_knowledge: int
    communication: int
    relevance: int
    problem_solving: int
    confidence: int

class InterviewCompletedAnswerItem(BaseModel):
    question_index: int
    question: str
    category: str
    answer_text: str
    overall_score: int
    scores_breakdown: InterviewEvaluationBreakdown
    what_you_did_well: str
    what_could_be_improved: str
    ai_recommendation: str
    model_answer: str
    speech_analysis: Optional[SpeechAnalysis] = None

class InterviewFinalReportRequest(BaseModel):
    session_id: str
    target_role: str
    interview_type: str
    difficulty: str
    answers: List[InterviewCompletedAnswerItem]
    resume_text: Optional[str] = None
    job_description: Optional[str] = None
    is_guest: bool = True

class InterviewFinalReportResponse(BaseModel):
    success: bool = True
    session_id: str
    target_role: str
    interview_type: str
    difficulty: str
    overall_score: int  # 0-100
    performance_breakdown: InterviewPerformanceBreakdown
    strengths: List[str]
    areas_to_improve: List[str]
    personalized_practice_plan: List[PracticePlanItem]
    date: str
    total_questions_answered: int
    detailed_answers: Optional[List[InterviewCompletedAnswerItem]] = None

class InterviewSessionHistoryItem(BaseModel):
    id: str
    date: str
    role: str
    interview_type: str
    difficulty: str
    overall_score: int
    technical_score: int
    communication_score: int
    relevance_score: int
    problem_solving_score: int
    confidence_score: int
    report_json: Optional[str] = None

class OptimizeBulletRequest(BaseModel):
    original_text: str
    section_name: Optional[str] = "experience"
    company: Optional[str] = ""
    role: Optional[str] = ""
    surrounding_bullets: Optional[List[str]] = Field(default_factory=list)
    target_role: Optional[str] = "Software Engineer"
    existing_rewrites: Optional[List[str]] = Field(default_factory=list)

class OptimizeBulletResponse(BaseModel):
    success: bool = True
    original_text: str
    rewritten_text: str
    reason: str
    type: str
    passed_fact_check: bool = True
    is_unique: bool = True
