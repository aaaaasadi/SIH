import os
import re
import json
import uuid
import time
from typing import Dict, Any, List, Optional, Tuple
from .models import (
    InterviewStartRequest, InterviewQuestion, InterviewStartResponse,
    InterviewNextQuestionRequest,
    InterviewAnswerEvaluationRequest, InterviewAnswerEvaluationResponse,
    InterviewEvaluationBreakdown, PracticePlanItem,
    InterviewPerformanceBreakdown, InterviewFinalReportRequest,
    InterviewFinalReportResponse, InterviewCompletedAnswerItem, SpeechAnalysis
)

# Standard taxonomy of technical and behavioral themes
TECHNICAL_QUESTION_TEMPLATES = {
    "software": [
        {
            "topic": "System Architecture & API Design",
            "q": "Explain how you would design and implement a scalable {skill} service or API that handles high traffic while maintaining low latency.",
            "criteria": ["Architecture clarity", "Caching & database indexing", "Error handling & rate limiting", "Measurable throughput"]
        },
        {
            "topic": "Object-Oriented & Design Patterns",
            "q": "In your projects using {skill}, describe how you applied core object-oriented principles or design patterns to keep the codebase maintainable and testable.",
            "criteria": ["OOP principles (Encapsulation, Polymorphism, etc.)", "Design pattern rationale", "Separation of concerns", "Unit testing strategy"]
        },
        {
            "topic": "Data Consistency & Optimization",
            "q": "How do you approach database schema design and query optimization when working with {skill}? Share a real scenario where you resolved a bottleneck.",
            "criteria": ["Indexing strategy", "Query execution plan analysis", "ACID vs eventual consistency", "Quantified performance gain"]
        },
        {
            "topic": "Debugging & Production Incidents",
            "q": "Describe your step-by-step troubleshooting methodology when a service using {skill} crashes or starts returning 500 errors in production.",
            "criteria": ["Log aggregation & metrics", "Root cause isolation", "Graceful degradation / rollback", "Post-mortem prevention"]
        }
    ],
    "data": [
        {
            "topic": "Data Pipeline & ETL",
            "q": "Walk me through how you build an end-to-end data pipeline using {skill}, ensuring data validation and idempotency.",
            "criteria": ["Data extraction & transformation", "Schema validation", "Handling corrupt data records", "Pipeline monitoring"]
        },
        {
            "topic": "SQL & Analytical Querying",
            "q": "What is the most complex SQL or {skill} analysis you have authored, and how did its insights influence a business or product decision?",
            "criteria": ["Window functions / CTEs", "Data modeling", "Business translation", "Measurable impact"]
        }
    ],
    "aiml": [
        {
            "topic": "Model Training & Evaluation",
            "q": "Explain your approach to model selection, feature engineering, and evaluation metrics when developing an ML pipeline with {skill}.",
            "criteria": ["Feature importance", "Cross-validation & overfitting prevention", "Precision/Recall/F1 trade-offs", "Inference latency"]
        }
    ]
}

BEHAVIORAL_QUESTION_TEMPLATES = [
    {
        "topic": "STAR - Handling Conflict & Trade-offs",
        "q": "Tell me about a time you encountered a significant technical or product disagreement with a teammate or stakeholder. How did you handle it?",
        "criteria": ["Situation context", "Active listening & empathy", "Data-driven objective resolution", "Constructive team outcome"]
    },
    {
        "topic": "STAR - Tight Deadlines & Prioritization",
        "q": "Describe a scenario where project scope was expanding rapidly with an immovable deadline. How did you prioritize deliverables?",
        "criteria": ["Impact vs Effort triage", "Stakeholder communication", "Phased rollout execution", "On-time delivery result"]
    },
    {
        "topic": "STAR - Overcoming Project Failure",
        "q": "Tell me about a time a project, feature, or deployment did not go as planned. What went wrong and what corrective actions did you take?",
        "criteria": ["Accountability without deflection", "Root cause analysis", "Immediate fix vs long-term prevention", "Key lessons learned"]
    },
    {
        "topic": "STAR - Rapid Learning Agility",
        "q": "Can you share an experience where you had to master an unfamiliar technology or domain in a very short timeframe to deliver a critical milestone?",
        "criteria": ["Structured learning approach", "Hands-on prototype building", "Fast turnaround", "Knowledge sharing with team"]
    }
]

class InterviewEngine:
    """
    AI-Powered Interview Coach Engine.
    Generates personalized questions, dynamically evaluates candidate responses (Voice/Text),
    and generates post-interview analytical performance reports.
    """

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    def start_interview(self, req: InterviewStartRequest) -> InterviewStartResponse:
        session_id = f"int-sess-{uuid.uuid4().hex[:10]}"
        
        # 1. Parse Candidate Skills & Context
        skills_found = self._extract_skills(req.resume_text or "")
        jd_skills = self._extract_skills(req.job_description or "")
        
        is_personalized = bool(req.use_resume and skills_found) or bool(req.use_jd and jd_skills)

        # 2. Try LLM Question Generation
        questions = None
        if is_personalized and (self.gemini_key or self.openai_key):
            try:
                questions = self._generate_questions_with_llm(req, skills_found, jd_skills)
            except Exception as e:
                print(f"[WARN] LLM question generation failed: {e}. Falling back to dynamic rubric engine.")

        # 3. Fallback to Dynamic Personalized Heuristic Generator
        if not questions or len(questions) == 0:
            questions = self._generate_heuristic_questions(req, skills_found, jd_skills)

        # Ensure correct count
        questions = questions[:req.num_questions]
        for i, q in enumerate(questions):
            q.question_index = i
            q.total_questions = len(questions)

        context_summary = (
            f"Personalized to {req.target_role} with {len(skills_found)} resume skills & {len(jd_skills)} target JD requirements."
            if is_personalized else
            f"Standard {req.interview_type} bank for {req.target_role} ({req.difficulty} level)."
        )

        return InterviewStartResponse(
            success=True,
            session_id=session_id,
            target_role=req.target_role,
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            total_questions=len(questions),
            is_personalized=is_personalized,
            context_summary=context_summary,
            first_question=questions[0],
            all_questions_preview=questions
        )

    def evaluate_answer(self, req: InterviewAnswerEvaluationRequest) -> InterviewAnswerEvaluationResponse:
        """
        Dynamically evaluates user response (Voice or Text).
        Computes 6-dimensional breakdown (0-10) and overall score (0-100).
        """
        ans_text = (req.answer_text or "").strip()
        print(f"[INTERVIEW ENGINE] Evaluating answer for {req.target_role} ({req.category}) - Length: {len(ans_text)} chars: '{ans_text[:60]}...'")
        if not ans_text:
            result = InterviewAnswerEvaluationResponse(
                success=True,
                overall_score=15,
                scores_breakdown=InterviewEvaluationBreakdown(
                    relevance=1,
                    technical_accuracy=1,
                    communication=1,
                    completeness=1,
                    problem_solving=1,
                    confidence=1
                ),
                what_you_did_well="You initiated the question response session.",
                what_could_be_improved="The answer was empty. Please provide a complete, structured explanation using voice or text.",
                ai_recommendation="Use the STAR method: explain the Situation, the Task you owned, the Actions you took, and the quantifiable Result.",
                model_answer=self._get_fallback_model_answer(req.question, req.target_role),
                evaluation_mode="heuristic_rubric_engine"
            )
            result.speech_analysis = self._speech_analysis_model(req.speech_analysis)
            return result

        # Try LLM evaluation first
        if self.gemini_key or self.openai_key:
            try:
                llm_eval = self._evaluate_with_llm(req)
                if llm_eval:
                    llm_eval.speech_analysis = self._speech_analysis_model(req.speech_analysis)
                    return llm_eval
            except Exception as e:
                print(f"[WARN] LLM answer evaluation failed: {e}. Falling back to rubric engine.")

        # Heuristic Rubric-Based Evaluation (Deterministic & Realistic)
        result = self._evaluate_with_heuristic_rubric(req)
        result.speech_analysis = self._speech_analysis_model(req.speech_analysis)
        return result

    def _speech_analysis_model(self, data: Optional[Dict[str, Any]]) -> Optional[SpeechAnalysis]:
        return SpeechAnalysis(**data) if data else None

    def generate_next_adaptive_question(self, req: InterviewNextQuestionRequest) -> InterviewQuestion:
        """
        Adapts next question based on previous performance score and difficulty.
        """
        index = req.current_question_index
        total = req.total_questions
        target_role = req.target_role
        diff = req.difficulty
        prev_score = req.previous_score or 75

        # Adapt difficulty label for the next question
        next_diff = diff
        if prev_score < 60:
            next_diff = "Beginner" if diff != "Beginner" else "Beginner"
        elif prev_score > 85:
            next_diff = "Advanced" if diff != "Advanced" else "Advanced"

        # Determine theme based on interview type and index
        if req.interview_type == "Technical":
            category = f"Technical Deep-Dive ({next_diff})"
        elif req.interview_type == "HR / Behavioral":
            category = f"Behavioral & Culture ({next_diff})"
        else:
            category = f"Technical Architecture ({next_diff})" if index % 2 == 1 else f"Behavioral Leadership ({next_diff})"

        # Generate contextual question
        skills = self._extract_skills(req.resume_text or "")
        skill = skills[index % len(skills)] if skills else ("Python" if "Data" in target_role else "Java / Spring")

        if "Technical" in category:
            q_text = f"Following up on system concepts, how do you handle concurrency, error recovery, and unit testing when building {skill} components for a {target_role} application?"
            reason = f"Adapted to {next_diff} level following your previous response to evaluate technical depth in {skill}."
            criteria = ["Concurrency control", "Exception hierarchy", "Test coverage strategy", "Production reliability"]
        else:
            q_text = f"Can you describe a situation where you had to adapt quickly to changing technical requirements mid-sprint while working on a {target_role} deliverable?"
            reason = "Evaluating adaptability, stakeholder alignment, and execution discipline under agile pressure."
            criteria = ["Situation clarity", "Impact assessment", "Agile pivoting action", "On-time milestone outcome"]

        model_ans = (
            f"When requirements shift mid-sprint (Situation), I first coordinate a 15-minute triage with the tech lead and product manager to estimate the delta effort (Task). "
            f"I isolate reusable components, update unit test mocks, and reprioritize non-critical backlog items (Action). "
            f"As a result, we delivered the updated feature set with zero regressions and hit the sprint release target on schedule (Result)."
        )

        return InterviewQuestion(
            id=f"q-adapt-{index + 1}-{uuid.uuid4().hex[:6]}",
            question_index=index,
            total_questions=total,
            category=category,
            role=target_role,
            difficulty=next_diff,
            question=q_text,
            context_reason=reason,
            recommended_duration_sec=90,
            expected_criteria=criteria,
            sample_model_answer=model_ans
        )

    def generate_final_report(self, req: InterviewFinalReportRequest) -> InterviewFinalReportResponse:
        """
        Aggregates all answer evaluations into a comprehensive final report with practice plan.
        """
        answers = req.answers
        if not answers:
            # Fallback default report if no answers were recorded
            return self._build_default_report(req.session_id, req.target_role, req.interview_type, req.difficulty)

        avg_overall = sum(a.overall_score for a in answers) / len(answers)
        avg_rel = sum(a.scores_breakdown.relevance for a in answers) / len(answers) * 10
        avg_tech = sum(a.scores_breakdown.technical_accuracy for a in answers) / len(answers) * 10
        avg_comm = sum(a.scores_breakdown.communication for a in answers) / len(answers) * 10
        avg_comp = sum(a.scores_breakdown.completeness for a in answers) / len(answers) * 10
        avg_prob = sum(a.scores_breakdown.problem_solving for a in answers) / len(answers) * 10
        avg_conf = sum(a.scores_breakdown.confidence for a in answers) / len(answers) * 10

        overall_score = int(round(avg_overall))
        perf_breakdown = InterviewPerformanceBreakdown(
            technical_knowledge=int(round(avg_tech)),
            communication=int(round(avg_comm)),
            relevance=int(round(avg_rel)),
            problem_solving=int(round(avg_prob)),
            confidence=int(round(avg_conf))
        )

        # Dynamic Strengths
        strengths = []
        if avg_rel >= 75: strengths.append("Answers directly addressed core question prompts with relevant context.")
        if avg_tech >= 75: strengths.append("Solid technical grasp of frameworks, architecture, and language fundamentals.")
        if avg_comm >= 75: strengths.append("Clear articulation and professional delivery style.")
        if avg_prob >= 75: strengths.append("Demonstrated systematic analytical approach to troubleshooting and system design.")
        if not strengths: strengths.append("Demonstrated sincere effort with clear foundational intent across all answers.")

        # Dynamic Weaknesses & Areas to Improve
        weaknesses = []
        if avg_comp < 75: weaknesses.append("Conclude answers with measurable project outcomes and quantifiable metrics (e.g. latency, users, % improvement).")
        if avg_comm < 75: weaknesses.append("Structure behavioral responses using the full STAR format (Situation → Task → Action → Result).")
        if avg_tech < 75: weaknesses.append("Incorporate deeper technical specifics (e.g., algorithmic trade-offs, caching, indexing) in system questions.")
        if avg_conf < 70: weaknesses.append("Reduce filler phrases ('um', 'like', 'sort of') and emphasize personal ownership ('I architected' vs 'We worked on').")
        if not weaknesses: weaknesses.append("Continue practicing with advanced system design and high-scale edge cases.")

        # Dynamic Practice Plan
        practice_plan = [
            PracticePlanItem(
                priority=1,
                topic=f"{req.target_role} — Core Technical Architecture",
                reason=f"Reinforce architectural trade-offs, API design, and database optimizations relevant to {req.target_role}."
            ),
            PracticePlanItem(
                priority=2,
                topic="STAR Method & Quantifiable Outcomes",
                reason="Your responses will stand out significantly by adding measurable numbers (percentages, throughput, dollar savings)."
            ),
            PracticePlanItem(
                priority=3,
                topic="Behavioral Leadership & Conflict Scenarios",
                reason="Practice concise conflict resolution stories demonstrating empathy, objective data usage, and consensus."
            )
        ]

        date_str = time.strftime("%b %d, %Y")

        return InterviewFinalReportResponse(
            success=True,
            session_id=req.session_id,
            target_role=req.target_role,
            interview_type=req.interview_type,
            difficulty=req.difficulty,
            overall_score=overall_score,
            performance_breakdown=perf_breakdown,
            strengths=strengths,
            areas_to_improve=weaknesses,
            personalized_practice_plan=practice_plan,
            date=date_str,
            total_questions_answered=len(answers),
            detailed_answers=answers
        )

    # --------------------------------------------------------------------------
    # Private Helper & Evaluation Methods
    # --------------------------------------------------------------------------

    def _extract_skills(self, text: str) -> List[str]:
        if not text:
            return []
        common = [
            "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "SQL",
            "React", "Node.js", "FastAPI", "Django", "Spring Boot", "Docker",
            "Kubernetes", "AWS", "GCP", "REST API", "GraphQL", "Microservices",
            "Machine Learning", "System Design", "Agile", "Scrum", "Git"
        ]
        found = []
        text_lower = text.lower()
        for s in common:
            if re.search(r'\b' + re.escape(s.lower()) + r'\b', text_lower):
                found.append(s)
        return found

    def _generate_heuristic_questions(
        self,
        req: InterviewStartRequest,
        resume_skills: List[str],
        jd_skills: List[str]
    ) -> List[InterviewQuestion]:
        questions = []
        skills_pool = resume_skills + [s for s in jd_skills if s not in resume_skills]
        if not skills_pool:
            skills_pool = ["Python", "SQL", "REST API", "System Design"]

        total = req.num_questions
        role = req.target_role
        diff = req.difficulty
        itype = req.interview_type

        for i in range(total):
            skill = skills_pool[i % len(skills_pool)]
            
            # Determine question focus based on interview type
            is_technical = (itype == "Technical") or (itype == "Mixed" and i % 2 == 0)
            
            if is_technical:
                category = f"Technical ({skill})"
                q_text = (
                    f"You have experience with {skill}. Can you explain how you applied {skill} in a real project, "
                    f"and what specific architectural decisions or trade-offs you made?"
                )
                reason = f"Personalized to {skill} from your profile & target requirements."
                criteria = [f"Hands-on {skill} depth", "Architectural trade-offs", "Error handling / scaling", "Measurable project result"]
                model_ans = (
                    f"In our payment integration service (Situation), I was responsible for designing the {skill} ingestion layer to handle 10K+ requests/min (Task). "
                    f"I implemented connection pooling, asynchronous worker queues, and structured logging (Action). "
                    f"This reduced API response latency by 28% and maintained 99.95% uptime throughout peak promotional events (Result)."
                )
            else:
                tmpl = BEHAVIORAL_QUESTION_TEMPLATES[i % len(BEHAVIORAL_QUESTION_TEMPLATES)]
                category = f"Behavioral ({tmpl['topic'].split(' - ')[-1]})"
                q_text = tmpl["q"]
                reason = "Evaluating behavioral competencies, communication clarity, and STAR method structure."
                criteria = tmpl["criteria"]
                model_ans = (
                    f"At my previous organization, we faced an aggressive release timeline (Situation). "
                    f"As lead contributor, I owned the core module delivery (Task). "
                    f"I set up daily standups, prioritized blockers using an impact matrix, and pair-programmed through critical bottlenecks (Action). "
                    f"We launched on schedule with 0 rollbacks, increasing customer NPS by 18 points (Result)."
                )

            questions.append(InterviewQuestion(
                id=f"q-init-{i + 1}-{uuid.uuid4().hex[:6]}",
                question_index=i,
                total_questions=total,
                category=category,
                role=role,
                difficulty=diff,
                question=q_text,
                context_reason=reason,
                recommended_duration_sec=90,
                expected_criteria=criteria,
                sample_model_answer=model_ans
            ))

        return questions

    def _evaluate_with_heuristic_rubric(self, req: InterviewAnswerEvaluationRequest) -> InterviewAnswerEvaluationResponse:
        """
        Dynamically evaluates user response based on question keywords, topical relevance,
        technical terminology, STAR structure, action verbs, problem-solving, and outcome metrics.
        Guarantees realistic, differentiated scores spanning 10-98 across varying answer qualities.
        """
        text = (req.answer_text or "").strip()
        words = text.split()
        word_count = len(words)
        text_lower = text.lower()
        q_lower = (req.question or "").lower()
        cat_lower = (req.category or "").lower()

        # Stop words to isolate meaningful question concepts
        stop_words = {
            "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "by", "about", 
            "as", "into", "like", "through", "after", "over", "between", "out", "against", "during", 
            "without", "before", "under", "around", "among", "can", "you", "explain", "how", "what", 
            "would", "your", "describe", "tell", "me", "have", "applied", "real", "project", "specific", 
            "made", "when", "which", "who", "whom", "this", "that", "these", "those", "is", "are", 
            "was", "were", "be", "been", "being", "some", "using", "work", "worked", "experience",
            "decisions", "trade", "offs", "tradeoffs", "time", "did", "share", "give"
        }

        q_tokens = [re.sub(r'[^a-z0-9]', '', w) for w in q_lower.split() if len(re.sub(r'[^a-z0-9]', '', w)) > 2]
        q_keywords = [w for w in q_tokens if w not in stop_words]
        cat_keywords = [re.sub(r'[^a-z0-9]', '', w) for w in cat_lower.split() if len(re.sub(r'[^a-z0-9]', '', w)) > 2 and w not in stop_words]
        all_target_kw = set(q_keywords + cat_keywords)

        # 1. Relevance Analysis (1-10)
        matching_target_kw = [kw for kw in all_target_kw if re.search(r'\b' + re.escape(kw) + r'\b', text_lower)]
        
        irrelevant_indicators = [
            "pizza", "burger", "hiking", "video game", "movie", "song", "vacation", "weather", 
            "football", "cricket", "weekend", "dog", "cat", "party", "lunch", "dinner", "breakfast",
            "hobby", "sleep", "swimming", "beach", "music"
        ]
        has_irrelevant_theme = any(irr in text_lower for irr in irrelevant_indicators)
        
        if has_irrelevant_theme and len(matching_target_kw) == 0:
            rel_score = 1
        elif len(matching_target_kw) >= 3:
            rel_score = min(10, 7 + (len(matching_target_kw) - 2))
        elif len(matching_target_kw) >= 1:
            rel_score = 5 + len(matching_target_kw)
        else:
            rel_score = 3 if word_count >= 15 else (2 if word_count >= 5 else 1)

        if any(w in text_lower for w in ["specifically", "for example", "in our project", "because", "therefore", "in order to"]):
            rel_score = min(10, rel_score + 1)
        rel_score = max(1, min(10, rel_score))

        # 2. Technical Accuracy & Depth (1-10)
        tech_terms = [
            "api", "database", "sql", "performance", "latency", "async", "testing", "architecture", 
            "microservice", "microservices", "class", "function", "docker", "cloud", "cache", "redis", 
            "framework", "django", "spring", "java", "python", "aws", "kubernetes", "postgres", "mysql",
            "junit", "ci/cd", "pipeline", "kafka", "endpoint", "rest", "threads", "concurrency", "indexes",
            "hikaricp", "distributed", "scalability", "queue", "queues", "nosql", "mongodb", "orm",
            "security", "jwt", "oauth", "load balancer", "sharding", "profiling", "schema"
        ]
        found_tech = [t for t in tech_terms if re.search(r'\b' + re.escape(t) + r'\b', text_lower)]
        
        if "technical" in cat_lower or any(k in cat_lower for k in ["architecture", "deep-dive", "java", "python", "backend", "system"]):
            if len(found_tech) >= 5: tech_score = 10
            elif len(found_tech) >= 3: tech_score = 8
            elif len(found_tech) >= 2: tech_score = 6
            elif len(found_tech) == 1: tech_score = 4
            else: tech_score = 2 if word_count >= 10 else 1
        else:
            behavioral_terms = ["priorit", "stakeholder", "collaborat", "agile", "sprint", "conflict", "deadline", "team", "decision", "trade-off", "feedback", "deliver", "customer", "leadership", "mentored", "retrospective"]
            found_beh = [b for b in behavioral_terms if b in text_lower]
            if len(found_beh) >= 4: tech_score = 10
            elif len(found_beh) >= 2: tech_score = 8
            elif len(found_beh) == 1: tech_score = 6
            else: tech_score = 3 if word_count >= 10 else 1
        tech_score = max(1, min(10, tech_score))

        # 3. Communication & Pacing (1-10)
        if word_count < 8: comm_score = 1
        elif word_count < 20: comm_score = 3
        elif word_count < 35: comm_score = 6
        elif 45 <= word_count <= 190: comm_score = 9
        elif 35 <= word_count < 45: comm_score = 7
        else: comm_score = 6

        fillers = ["um", "like", "sort of", "you know", "basically", "kind of", "literally"]
        filler_cnt = sum(len(re.findall(r'\b' + re.escape(f) + r'\b', text_lower)) for f in fillers)
        comm_score = max(1, comm_score - min(3, filler_cnt))

        # 4. Completeness & STAR Structure (1-10)
        has_sit = bool(re.search(r'\b(when|during|in a project|in our|at my|we were|faced with|project|context)\b', text_lower))
        has_task = bool(re.search(r'\b(my role|responsible|tasked|objective|needed to|goal was|requirement was)\b', text_lower))
        has_act = bool(re.search(r'\b(i built|i implemented|i designed|i developed|i configured|i created|i led|i optimized|i added|i wrote|i investigated|i authored|i migrated)\b', text_lower))
        metrics_match = re.findall(r'\d+%|\$\d+|\d+\s*(?:users|ms|seconds|rps|dau|qps|requests|orders|records|hours|days|weeks|endpoints)', text_lower)
        has_res = bool(metrics_match) or bool(re.search(r'\b(result|outcome|successfully|reduced latency|improved|increased|zero downtime|delivered on time)\b', text_lower))

        comp_score = 1
        if has_sit: comp_score += 2
        if has_task: comp_score += 1
        if has_act: comp_score += 3
        if has_res: comp_score += 2
        if bool(metrics_match): comp_score = min(10, comp_score + 1)
        comp_score = max(1, min(10, comp_score))

        # 5. Problem Solving & Trade-offs (1-10)
        has_pb = bool(re.search(r'\b(challenge|problem|bottleneck|issue|bug|failure|incident|conflict|latency|struggle|limits|constraint)\b', text_lower))
        has_tradeoff = bool(re.search(r'\b(trade-off|tradeoff|alternative|chose|instead of|rather than|decided to|prioritized|because|evaluated)\b', text_lower))
        prob_score = 2
        if has_pb: prob_score += 3
        if has_tradeoff: prob_score += 4
        if "why" in text_lower or "solution" in text_lower or "investigated" in text_lower: prob_score += 1
        prob_score = max(1, min(10, prob_score))

        # 6. Confidence & First-Person Ownership (1-10)
        has_ownership = bool(re.search(r'\b(i architected|i spearheaded|i led|i decided|i delivered|i owned|i established|i was responsible|i drove)\b', text_lower))
        has_uncertainty = bool(re.search(r'\b(maybe|i guess|not sure|probably|kind of|i think it was|sort of)\b', text_lower))
        conf_score = 5
        if has_ownership: conf_score += 3
        if has_act: conf_score += 1
        if has_uncertainty: conf_score -= 3
        conf_score = max(1, min(10, conf_score))

        # Weighted Overall Score (0-100)
        if word_count < 8:
            overall = max(10, min(25, int(word_count * 3)))
        elif rel_score <= 2 or (has_irrelevant_theme and len(matching_target_kw) == 0):
            overall = max(10, min(22, int(rel_score * 8 + tech_score * 0.8)))
        elif word_count < 20:
            overall = max(25, min(45, int((rel_score*3 + tech_score*2 + comm_score*2) * 1.1)))
        else:
            raw_weighted = (
                rel_score * 0.25 + 
                tech_score * 0.25 + 
                comp_score * 0.20 + 
                comm_score * 0.15 + 
                prob_score * 0.10 + 
                conf_score * 0.05
            ) * 10
            overall = int(round(raw_weighted))
            if metrics_match and overall >= 65:
                overall = min(98, overall + 4)
            if not has_pb and not has_tradeoff and overall > 75:
                overall -= 4
            overall = max(20, min(98, overall))

        # Dynamic, Context-Specific Feedback Text
        target_subject = next(iter(matching_target_kw), None) or (q_keywords[0] if q_keywords else "the requested topic")
        
        if has_irrelevant_theme and len(matching_target_kw) == 0:
            what_well = "You submitted a response, demonstrating prompt engagement."
            what_improve = f"Your answer is off-topic and does not address the question regarding {target_subject}."
            ai_rec = "Directly answer the question asked using specific project examples and engineering principles."
        elif word_count < 15:
            what_well = f"You mentioned key terms related to {target_subject}."
            what_improve = f"Your response is very short ({word_count} words). Interviewers expect a 1-2 minute structured response."
            ai_rec = "Use the STAR method: explain the project Situation, your Task, the Actions you took, and the measurable Result."
        elif overall >= 88:
            metrics_str = f" ({metrics_match[0]})" if metrics_match else ""
            tools_str = f" ({', '.join(found_tech[:3])})" if found_tech else ""
            what_well = f"Exceptional structured STAR response with quantifiable metrics{metrics_str} and deep technical accuracy{tools_str}."
            what_improve = "To make it flawless, elaborate on how you monitored system health post-deployment and handled disaster recovery."
            ai_rec = "Maintain this executive-level depth and highlight long-term system maintainability."
        elif overall >= 72:
            what_well = f"Good technical clarity explaining your direct actions in {target_subject}."
            what_improve = "Your response lacks measurable outcome metrics (e.g. latency % reduction, RPS handled, or hours saved)."
            ai_rec = "Always quantify your results with concrete numbers to validate the business impact of your engineering work."
        elif overall >= 50:
            what_well = f"You addressed the baseline concept of {target_subject}."
            what_improve = "Your answer is somewhat high-level. Provide concrete technical implementation details and trade-offs evaluated."
            ai_rec = "Explain the 'Why' behind your decisions: why did you choose this architecture over alternative approaches?"
        else:
            what_well = "You touched on relevant terminology."
            what_improve = "The explanation lacks structure, action verbs, and technical depth."
            ai_rec = "Structure your answer using first-person ownership: 'I architected...', 'I implemented...', 'I resolved...'."

        model_answer = (
            f"Here is one possible strong approach for coaching: "
            f"\"In our project (Situation), our objective was to design a resilient {target_subject} component (Task). "
            f"I architected the solution with modular service boundaries, added automated tests, and tuned connection caching (Action). "
            f"As a result, we reduced latency by 32% and successfully handled 20,000 requests/sec with zero downtime (Result).\""
        )

        return InterviewAnswerEvaluationResponse(
            success=True,
            overall_score=overall,
            scores_breakdown=InterviewEvaluationBreakdown(
                relevance=rel_score,
                technical_accuracy=tech_score,
                communication=comm_score,
                completeness=comp_score,
                problem_solving=prob_score,
                confidence=conf_score
            ),
            what_you_did_well=what_well,
            what_could_be_improved=what_improve,
            ai_recommendation=ai_rec,
            model_answer=model_answer,
            evaluation_mode="heuristic_rubric_engine"
        )

    def _evaluate_with_llm(self, req: InterviewAnswerEvaluationRequest) -> Optional[InterviewAnswerEvaluationResponse]:
        prompt = f"""
You are an expert technical interviewer and executive career coach.
Critically evaluate the candidate's interview answer to the specific question asked.

CONTEXT:
Question: {req.question}
Category: {req.category}
Target Role: {req.target_role}
Difficulty: {req.difficulty}
Candidate Answer: "{req.answer_text}"

EVALUATION RUBRIC & SCORING TIERS:
- 90-98: Exceptional, highly structured STAR response with deep technical accuracy, clear trade-offs, and quantified metrics.
- 75-89: Strong, well-articulated answer with relevant technical concepts and clear actions, but minor gaps in metrics or trade-offs.
- 55-74: Adequate answer with basic understanding, but shallow, lacking structure, or missing concrete technical depth.
- 35-54: Weak, vague, or very brief response (1-2 sentences) lacking meaningful substance.
- 10-34: Completely irrelevant, off-topic (e.g. food, hobbies unrelated to question), nonsensical, or single-word answer.

CRITICAL INSTRUCTIONS:
1. Carefully compare the candidate's answer to the QUESTION ASKED. If the answer is off-topic or discusses something unrelated (e.g. food, vacations, video games, or unrelated topics), assign relevance=1-2, technical_accuracy=1-2, and overall_score=10-25.
2. If the answer is brief (under 25 words), cap overall_score below 45.
3. If the answer demonstrates outstanding STAR structure with specific quantified metrics (e.g. %, latency, scale), award overall_score 90+.
4. Do NOT output a fixed number like 74 or 78 for all answers. Every answer must receive a uniquely calculated score based on its true substance.

Return ONLY a valid JSON object matching this schema:
{{
  "overall_score": <integer between 10 and 98>,
  "scores_breakdown": {{
    "relevance": <integer 1-10>,
    "technical_accuracy": <integer 1-10>,
    "communication": <integer 1-10>,
    "completeness": <integer 1-10>,
    "problem_solving": <integer 1-10>,
    "confidence": <integer 1-10>
  }},
  "what_you_did_well": "<1-2 sentence specific positive feedback directly quoting or referencing their actual response>",
  "what_could_be_improved": "<1-2 sentence specific constructive feedback detailing what is missing or how to improve>",
  "ai_recommendation": "<1 actionable coaching advice regarding STAR method, metrics, or trade-offs>",
  "model_answer": "<One exemplary coaching answer demonstrating STAR structure and quantified impact for this specific question>"
}}
"""
        # 1. Try Gemini
        if self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(prompt)
                raw_text = response.text.strip()
                if raw_text.startswith("```json"): raw_text = raw_text[7:]
                if raw_text.endswith("```"): raw_text = raw_text[:-3]
                data = json.loads(raw_text.strip())

                return InterviewAnswerEvaluationResponse(
                    success=True,
                    overall_score=int(data["overall_score"]),
                    scores_breakdown=InterviewEvaluationBreakdown(**data["scores_breakdown"]),
                    what_you_did_well=data["what_you_did_well"],
                    what_could_be_improved=data["what_could_be_improved"],
                    ai_recommendation=data["ai_recommendation"],
                    model_answer=data["model_answer"],
                    evaluation_mode="google_gemini"
                )
            except Exception as e:
                print(f"[WARN] Gemini evaluation failed: {e}")

        # 2. Try OpenAI
        if self.openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=self.openai_key)
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are an expert AI interview evaluator. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3
                )
                raw_text = completion.choices[0].message.content.strip()
                if raw_text.startswith("```json"): raw_text = raw_text[7:]
                if raw_text.endswith("```"): raw_text = raw_text[:-3]
                data = json.loads(raw_text.strip())
                return InterviewAnswerEvaluationResponse(
                    success=True,
                    overall_score=int(data["overall_score"]),
                    scores_breakdown=InterviewEvaluationBreakdown(**data["scores_breakdown"]),
                    what_you_did_well=data["what_you_did_well"],
                    what_could_be_improved=data["what_could_be_improved"],
                    ai_recommendation=data["ai_recommendation"],
                    model_answer=data["model_answer"],
                    evaluation_mode="openai_gpt"
                )
            except Exception as e:
                print(f"[WARN] OpenAI evaluation failed: {e}")

        return None

    def _generate_questions_with_llm(
        self,
        req: InterviewStartRequest,
        resume_skills: List[str],
        jd_skills: List[str]
    ) -> List[InterviewQuestion]:
        import google.generativeai as genai
        genai.configure(api_key=self.gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
Generate {req.num_questions} personalized interview questions for a candidate.
Target Role: {req.target_role}
Interview Type: {req.interview_type}
Difficulty: {req.difficulty}
Candidate Resume Context: {req.resume_text[:2000] if req.resume_text else 'None provided'}
Job Description Requirements: {req.job_description[:2000] if req.job_description else 'None provided'}

Reference their actual skills (e.g. {", ".join(resume_skills[:6])}) and JD skills (e.g. {", ".join(jd_skills[:6])}).
Return ONLY a valid JSON array of objects matching:
[
  {{
    "category": "<e.g. Technical (Java OOP) or Behavioral (STAR)>",
    "question": "<the specific question text>",
    "context_reason": "<why this was generated based on their resume/JD>",
    "expected_criteria": ["<criterion 1>", "<criterion 2>", "<criterion 3>"],
    "sample_model_answer": "<one possible strong coaching answer>"
  }}
]
"""
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        if raw_text.startswith("```json"): raw_text = raw_text[7:]
        if raw_text.endswith("```"): raw_text = raw_text[:-3]
        data = json.loads(raw_text.strip())

        questions = []
        for i, item in enumerate(data):
            questions.append(InterviewQuestion(
                id=f"q-llm-{i + 1}-{uuid.uuid4().hex[:6]}",
                question_index=i,
                total_questions=len(data),
                category=item["category"],
                role=req.target_role,
                difficulty=req.difficulty,
                question=item["question"],
                context_reason=item.get("context_reason"),
                recommended_duration_sec=90,
                expected_criteria=item.get("expected_criteria", []),
                sample_model_answer=item.get("sample_model_answer")
            ))
        return questions

    def _get_fallback_model_answer(self, question: str, role: str) -> str:
        return (
            f"Here is one possible strong approach for coaching: "
            f"\"In my work as a {role}, I start by defining the core objectives and trade-offs. "
            f"I implement the solution using verified engineering best practices, write automated tests, and measure post-deployment throughput. "
            f"This ensures high reliability and positive business outcomes.\""
        )

    def _build_default_report(self, session_id: str, role: str, itype: str, diff: str) -> InterviewFinalReportResponse:
        return InterviewFinalReportResponse(
            success=True,
            session_id=session_id,
            target_role=role,
            interview_type=itype,
            difficulty=diff,
            overall_score=75,
            performance_breakdown=InterviewPerformanceBreakdown(
                technical_knowledge=78,
                communication=74,
                relevance=76,
                problem_solving=72,
                confidence=70
            ),
            strengths=[
                "Good technical foundation",
                "Clear communication of project background"
            ],
            areas_to_improve=[
                "Structure answers with the STAR method (Situation, Task, Action, Result)",
                "Add measurable outcome metrics to your project explanations"
            ],
            personalized_practice_plan=[
                PracticePlanItem(priority=1, topic=f"{role} Fundamentals", reason="Practice core technical concepts"),
                PracticePlanItem(priority=2, topic="STAR Structure", reason="Practice quantified conclusion metrics"),
                PracticePlanItem(priority=3, topic="Behavioral Leadership", reason="Improve confidence in conflict resolution")
            ],
            date=time.strftime("%b %d, %Y"),
            total_questions_answered=0
        )

interview_engine = InterviewEngine()
