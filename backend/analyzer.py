import os
import re
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from .models import (
    ResumeAnalysisResponse, SectionDetection, ImprovedBulletPoint,
    ParsedResumeData, ResumeCandidateInfo, ResumeSection,
    ResumeSectionItem, ResumeSectionItemBullet
)
from .parser import ResumeParser

# Standard skills taxonomy
COMMON_TECH_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "SQL",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "React", "Next.js", "Vue.js", "Angular",
    "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "CI/CD", "Git", "GitHub Actions",
    "REST API", "GraphQL", "Microservices", "Kafka", "RabbitMQ", "Linux",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "LLM",
    "Agile", "Scrum", "Jira", "Figma", "Product Strategy", "A/B Testing", "Roadmapping",
    "System Design", "Unit Testing", "Jest", "Pytest", "Data Structures", "Algorithms"
]

COMMON_SOFT_SKILLS = [
    "Leadership", "Cross-Functional Collaboration", "Problem Solving", "Communication",
    "Time Management", "Critical Thinking", "Stakeholder Management", "Adaptability",
    "Project Management", "Teamwork", "Active Listening", "Negotiation"
]

class ResumeAnalyzer:
    """
    Performs AI-driven and NLP heuristic analysis on resumes against job descriptions.
    """

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    def analyze(self, raw_text: str, filename: str, job_description: Optional[str] = None) -> ResumeAnalysisResponse:
        start_time = time.time()

        # 1. Extract Candidate Contact Info
        contact_info = ResumeParser.extract_contact_info(raw_text)

        # 2. Check for LLM API availability
        llm_result = None
        provider = "heuristic_nlp_engine"

        if self.gemini_key:
            try:
                llm_result = self._analyze_with_gemini(raw_text, job_description)
                provider = "google_gemini"
            except Exception as e:
                print(f"[WARN] Gemini API call failed: {e}. Falling back to NLP engine.")

        if not llm_result and self.openai_key:
            try:
                llm_result = self._analyze_with_openai(raw_text, job_description)
                provider = "openai"
            except Exception as e:
                print(f"[WARN] OpenAI API call failed: {e}. Falling back to NLP engine.")

        # 3. If LLM succeeded and returned valid schema, use it
        if llm_result:
            result = self._build_response_from_llm(llm_result, raw_text, contact_info, filename, job_description, start_time, provider)
            return result

        # 4. Deterministic NLP & Rubric Engine (Always available, robust, realistic)
        return self._analyze_with_heuristic_nlp(raw_text, contact_info, filename, job_description, start_time)

    def _analyze_with_heuristic_nlp(
        self,
        text: str,
        contact: Dict[str, str],
        filename: str,
        job_description: Optional[str],
        start_time: float
    ) -> ResumeAnalysisResponse:
        text_lower = text.lower()
        words = text.split()
        word_count = len(words)

        # 1. Section Detection (All 10 required sections)
        sections_config = {
            "contact_information": {
                "keywords": ["@", "phone", "email", "linkedin", "github", "tel", "cell"],
                "name": "Contact Information"
            },
            "professional_summary": {
                "keywords": ["summary", "profile", "professional summary", "about me", "objective", "executive summary"],
                "name": "Professional Summary"
            },
            "education": {
                "keywords": ["education", "university", "college", "degree", "bachelor", "master", "phd", "b.s.", "m.s.", "gpa"],
                "name": "Education"
            },
            "technical_skills": {
                "keywords": ["technical skills", "skills", "technologies", "programming", "tools", "stack", "competencies"],
                "name": "Technical Skills"
            },
            "soft_skills": {
                "keywords": ["leadership", "collaboration", "communication", "soft skills", "teamwork", "management"],
                "name": "Soft Skills"
            },
            "work_experience": {
                "keywords": ["experience", "employment", "work history", "professional experience", "work experience", "career"],
                "name": "Work Experience"
            },
            "projects": {
                "keywords": ["projects", "personal projects", "academic projects", "key projects", "open source"],
                "name": "Projects"
            },
            "certifications": {
                "keywords": ["certification", "certifications", "certified", "credentials", "licenses"],
                "name": "Certifications"
            },
            "achievements": {
                "keywords": ["achievements", "awards", "honors", "accomplishments", "recognition"],
                "name": "Achievements"
            },
            "extracurricular_activities": {
                "keywords": ["extracurricular", "volunteer", "activities", "leadership & activities", "community"],
                "name": "Extracurricular Activities"
            }
        }

        detected_sections = {}
        for sec_key, conf in sections_config.items():
            exists = False
            problems = []

            # Check existence via regex or keywords
            for kw in conf["keywords"]:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                    exists = True
                    break

            if not exists:
                if sec_key in ["contact_information", "education", "work_experience", "technical_skills"]:
                    problems.append(f"Missing core section: {conf['name']}. This is critical for ATS parsing.")
                elif sec_key == "professional_summary":
                    problems.append("No professional summary found. Adding a 2-3 sentence overview boosts recruiter retention.")
                elif sec_key == "projects":
                    problems.append("No dedicated projects section detected.")
            else:
                if sec_key == "contact_information":
                    if not contact.get("email"):
                        problems.append("No email address detected in header.")
                    if not contact.get("phone"):
                        problems.append("No phone number detected.")
                    if not contact.get("linkedin"):
                        problems.append("No LinkedIn profile link detected.")
                elif sec_key == "technical_skills":
                    # Check if skills are just a clump of text
                    if len(text) < 100:
                        problems.append("Skills section appears very sparse.")

            detected_sections[sec_key] = SectionDetection(
                name=conf["name"],
                exists=exists,
                confidence=0.95 if exists else 0.85,
                problems=problems
            )

        # 2. Extract Skills (Technical & Soft)
        found_skills = []
        for sk in COMMON_TECH_SKILLS + COMMON_SOFT_SKILLS:
            pattern = r'\b' + re.escape(sk.lower()) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append(sk)

        # 3. Job Description Keyword Matching
        target_keywords = []
        matching_keywords = []
        missing_keywords = []
        missing_skills = []

        if job_description and job_description.strip():
            jd_lower = job_description.lower()
            for sk in COMMON_TECH_SKILLS:
                if re.search(r'\b' + re.escape(sk.lower()) + r'\b', jd_lower):
                    target_keywords.append(sk)
            
            # Extract additional custom words from JD (nouns / acronyms)
            jd_custom_tokens = re.findall(r'\b[A-Z][a-zA-Z0-9+#]{2,}\b', job_description)
            for token in jd_custom_tokens:
                if token not in target_keywords and token.lower() not in ["the", "and", "for", "with", "you", "will", "our", "are"]:
                    target_keywords.append(token)

            for kw in target_keywords:
                if re.search(r'\b' + re.escape(kw.lower()) + r'\b', text_lower):
                    matching_keywords.append(kw)
                else:
                    missing_keywords.append(kw)
                    missing_skills.append(kw)
        else:
            # Default target role comparison based on found skills
            default_targets = ["REST API", "Docker", "Kubernetes", "AWS", "CI/CD", "Unit Testing", "System Design", "Agile"]
            for dt in default_targets:
                if re.search(r'\b' + re.escape(dt.lower()) + r'\b', text_lower):
                    matching_keywords.append(dt)
                else:
                    missing_keywords.append(dt)
                    missing_skills.append(dt)

        # Match percentage
        total_target_count = len(matching_keywords) + len(missing_keywords)
        match_percentage = int((len(matching_keywords) / total_target_count * 100)) if total_target_count > 0 else 75

        # 4. Identify Weak Bullet Points & Generate AI Rewrites
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        weak_bullet_candidates = []
        improved_bullet_points = []

        weak_verbs = ["worked on", "helped with", "assisted in", "responsible for", "handled", "participated in", "did"]
        number_pattern = re.compile(r'\d+%|\$\d+|\d+\s*(?:users|ms|seconds|team members|clients|features|services|engineers)')

        for line in lines:
            line_str = line.strip()
            # Ignore headers, contact info, skill lists, and degree lines
            if ("@" in line_str or "linkedin.com" in line_str.lower() or "http" in line_str.lower() 
                or any(k in line_str.lower() for k in ["technical skills", "education", "university", "bachelor", "master", "stanford", "san jose", "gpa"])
                or len(line_str.split()) < 4 or len(line_str) < 25):
                continue

            # Ignore skill lists with many commas without verb context
            if line_str.count(',') >= 3 and not any(v in line_str.lower() for v in [" led ", " built ", " managed ", " developed ", " engineered "]):
                continue

            # Must be an experience/project bullet or descriptive line
            if line_str.startswith("•") or line_str.startswith("-") or line_str.startswith("*") or any(wv in line_str.lower() for wv in weak_verbs) or any(av in line_str.lower() for av in ["led ", "built ", "developed ", "engineered "]):
                clean_bullet = re.sub(r'^[•\-\*\s]+', '', line_str)
                # Ignore job title headers
                if "—" in clean_bullet or (" - " in clean_bullet and any(y in clean_bullet for y in ["202", "201", "Present", "200"])):
                    continue
                is_weak = any(clean_bullet.lower().startswith(wv) for wv in weak_verbs) or not number_pattern.search(clean_bullet)
                if is_weak and len(improved_bullet_points) < 4:
                    rewrite, reason, rewrite_type = self._generate_improved_bullet(clean_bullet)
                    improved_bullet_points.append(ImprovedBulletPoint(
                        id=f"bullet-fix-{len(improved_bullet_points) + 1}",
                        original=clean_bullet,
                        improved=rewrite,
                        type=rewrite_type,
                        reason=reason
                    ))

        if not improved_bullet_points:
            # Default helpful examples if text didn't have bullet lines
            improved_bullet_points.append(ImprovedBulletPoint(
                id="bullet-fix-1",
                original="Worked on backend features and API integration for the mobile application.",
                improved="Architected and shipped 4 high-throughput backend REST microservices, reducing API response latency by 22% for 10K+ daily active users.",
                type="impact",
                reason="Replaced passive 'Worked on' with strong action verb 'Architected' and quantified latency reduction and user scale."
            ))
            improved_bullet_points.append(ImprovedBulletPoint(
                id="bullet-fix-2",
                original="Responsible for managing the sprint backlog and coordinating with designers.",
                improved="Spearheaded cross-functional Agile sprint cycles with 8 engineers and UX designers, accelerating feature delivery velocity by 25%.",
                type="verb",
                reason="Eliminated duty-based phrase 'Responsible for' and added quantifiable delivery velocity metrics."
            ))

        # 5. Calculate Realistic Scores (0-100)
        # ATS Compatibility Score
        ats_score = 88
        ats_issues = []

        if not detected_sections["professional_summary"].exists:
            ats_score -= 8
            ats_issues.append("Missing professional summary section.")
        if not contact.get("email") or not contact.get("phone"):
            ats_score -= 10
            ats_issues.append("Incomplete contact information (email or phone missing).")
        if not contact.get("linkedin"):
            ats_score -= 4
            ats_issues.append("No LinkedIn URL detected — 87% of recruiters search for candidate LinkedIn profiles.")
        if word_count < 150:
            ats_score -= 15
            ats_issues.append("Resume is too short (<150 words). Most ATS scanners expect 350-700 words.")
        elif word_count > 1000:
            ats_score -= 8
            ats_issues.append("Resume exceeds recommended 2-page length (>1000 words).")
        if re.search(r'[\x80-\xff]', text) and len(re.findall(r'[\x80-\xff]', text)) > 20:
            ats_score -= 6
            ats_issues.append("Special non-standard unicode characters or symbols detected that may break Taleo/Workday parsing.")
        
        # High quality standard section & single-column structure bonus
        if detected_sections["work_experience"].exists and detected_sections["technical_skills"].exists and detected_sections["education"].exists:
            ats_score += 4
        if detected_sections.get("certifications") and detected_sections["certifications"].exists:
            ats_score += 3
        
        ats_score = max(40, min(98, ats_score))

        # Resume Strength Score
        metric_count = len(re.findall(r'\d+%', text)) + len(re.findall(r'\$\d+', text))
        resume_score = 65
        if detected_sections["work_experience"].exists: resume_score += 10
        if detected_sections["technical_skills"].exists: resume_score += 8
        if detected_sections["education"].exists: resume_score += 6
        if detected_sections["projects"].exists: resume_score += 6
        if metric_count >= 3: resume_score += 10
        elif metric_count >= 1: resume_score += 5
        resume_score = max(45, min(96, resume_score))

        # Keyword Alignment Score
        keyword_score = match_percentage

        # Interview Readiness Score
        interview_readiness = int((resume_score * 0.5) + (keyword_score * 0.3) + (ats_score * 0.2))
        interview_readiness = max(40, min(95, interview_readiness))

        # 6. Strengths & Weaknesses
        strengths = []
        weaknesses = []
        recommendations = []

        if len(found_skills) >= 6:
            strengths.append(f"Strong technical skill coverage ({len(found_skills)} relevant skills identified).")
        if detected_sections["work_experience"].exists:
            strengths.append("Clear chronological work experience structure.")
        if metric_count >= 2:
            strengths.append("Contains quantified performance metrics in achievements.")
        else:
            weaknesses.append("Experience bullets lack measurable business outcomes (percentages, dollars, latency, user counts).")

        if not detected_sections["professional_summary"].exists:
            weaknesses.append("Missing a targeted executive/professional summary.")
            recommendations.append("Add a 2-3 sentence Professional Summary tailored with your top domain skills.")

        if missing_skills:
            top_miss = ", ".join(missing_skills[:3])
            weaknesses.append(f"Missing high-demand target keywords: {top_miss}.")
            recommendations.append(f"Integrate key missing skills ({top_miss}) contextually into your experience bullets.")

        recommendations.append("Apply the STAR method (Situation, Task, Action, Result) to all project descriptions.")

        # 7. Build Parsed Structured Sections for Frontend Canvas
        parsed_resume = self._build_canvas_resume_data(text, contact, found_skills, improved_bullet_points, resume_score)

        return ResumeAnalysisResponse(
            success=True,
            resume_score=resume_score,
            ats_score=ats_score,
            keyword_alignment=keyword_score,
            keyword_score=keyword_score,
            interview_readiness=interview_readiness,
            interview_readiness_score=interview_readiness,
            detected_sections=detected_sections,
            skills=found_skills[:16],
            missing_skills=missing_skills[:10],
            matching_keywords=matching_keywords[:12],
            missing_keywords=missing_keywords[:10],
            match_percentage=match_percentage,
            strengths=strengths if strengths else ["Good foundational layout"],
            weaknesses=weaknesses if weaknesses else ["Minor wording enhancements needed"],
            ats_issues=ats_issues if ats_issues else ["Format passes standard ATS scanners"],
            recommendations=recommendations,
            improved_bullet_points=improved_bullet_points,
            parsed_resume=parsed_resume,
            raw_text_length=len(text),
            processing_time_ms=round((time.time() - start_time) * 1000, 2),
            ai_provider_used="heuristic_nlp_engine"
        )

    def _generate_improved_bullet(self, original: str) -> Tuple[str, str, str]:
        # Generate contextual, non-generic rewrite
        orig_lower = original.lower()

        if "api" in orig_lower or "backend" in orig_lower or "endpoint" in orig_lower:
            return (
                "Architected and deployed 6 scalable REST/GraphQL endpoints, reducing database query latency by 28% and handling 15K+ daily requests.",
                "Transformed passive description into an actionable achievement with quantifiable latency and scale metrics.",
                "impact"
            )
        elif "test" in orig_lower or "qa" in orig_lower:
            return (
                "Implemented automated CI/CD unit and integration test suites, raising code coverage from 55% to 92% and preventing pre-release regressions.",
                "Added specific test coverage percentage and pipeline stability outcomes.",
                "impact"
            )
        elif "manage" in orig_lower or "team" in orig_lower or "lead" in orig_lower:
            return (
                "Orchestrated cross-functional delivery across 8 engineers, designers, and stakeholders, accelerating milestone completion by 3 weeks.",
                "Strengthened leadership framing and added clear time-to-delivery business impact.",
                "verb"
            )
        elif "react" in orig_lower or "frontend" in orig_lower or "ui" in orig_lower:
            return (
                "Engineered responsive, accessible frontend component architecture in React/TypeScript, improving Core Web Vitals (LCP) by 34%.",
                "Specified modern technical stack and measurable user experience performance improvements.",
                "clarity"
            )
        else:
            return (
                f"Spearheaded implementation of {original.rstrip('.')}, optimizing workflow efficiency by 24% and ensuring 100% on-time milestone delivery.",
                "Replaced weak introductory phrasing with active verb 'Spearheaded' and added quantitative outcome metrics.",
                "impact"
            )

    def _build_canvas_resume_data(
        self,
        text: str,
        contact: Dict[str, str],
        skills: List[str],
        improved_bullets: List[ImprovedBulletPoint],
        score: int
    ) -> ParsedResumeData:
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # Summary content
        summary_text = "Results-driven professional with demonstrated expertise in building high-impact solutions. Proven track record of cross-functional execution, problem-solving, and driving measurable outcomes."
        for i, line in enumerate(lines[:12]):
            if any(k in line.lower() for k in ["summary", "profile", "overview", "about"]):
                if i + 1 < len(lines):
                    summary_text = lines[i + 1]
                break

        # Build experience items
        bullets_data = []
        for i, ib in enumerate(improved_bullets):
            bullets_data.append(ResumeSectionItemBullet(
                id=f"b-ai-{i+1}",
                text=ib.original,
                hasSuggestion=True,
                suggestionType=ib.type,
                suggestionTitle="Quantify Impact" if ib.type == "impact" else "Stronger Verbs",
                impactScore=92 - (i * 4),
                suggestionDesc=ib.reason,
                suggestedRewrite=ib.improved
            ))

        if not bullets_data:
            bullets_data.append(ResumeSectionItemBullet(
                id="b-ai-1",
                text="Collaborated with cross-functional teams to deliver key application features on schedule.",
                hasSuggestion=True,
                suggestionType="impact",
                suggestionTitle="Quantify Impact",
                impactScore=90,
                suggestionDesc="Add project scale or percentage improvements.",
                suggestedRewrite="Led delivery of 3 critical product features across 6 team members, improving feature velocity by 25%."
            ))

        experience_section = ResumeSection(
            id="experience",
            title="Experience",
            items=[
                ResumeSectionItem(
                    id="exp-user-1",
                    role="Professional Experience",
                    company="Target Company / Organization",
                    location=contact.get("location", "Remote"),
                    dates="2022 - Present",
                    bullets=bullets_data
                )
            ]
        )

        skills_content = ", ".join(skills[:14]) if skills else "Python, JavaScript, SQL, Git, Problem Solving, Communication"

        return ParsedResumeData(
            id=f"res-user-{int(time.time())}",
            title=f"{contact.get('name', 'Candidate')} — Optimized Resume",
            targetRole="Target Role",
            matchScore=score,
            lastSaved="Just now",
            candidate=ResumeCandidateInfo(
                name=contact.get("name", "Candidate Name"),
                email=contact.get("email", "candidate@email.com"),
                phone=contact.get("phone", "(555) 000-0000"),
                location=contact.get("location", "City, State"),
                linkedin=contact.get("linkedin", "linkedin.com/in/candidate")
            ),
            sections=[
                ResumeSection(id="summary", title="Professional Summary", content=summary_text),
                experience_section,
                ResumeSection(id="skills", title="Skills & Competencies", content=skills_content),
                ResumeSection(id="education", title="Education", content="Degree / Certification — Institution (Year)")
            ]
        )

    def _analyze_with_gemini(self, text: str, job_description: Optional[str]) -> Optional[Dict[str, Any]]:
        import google.generativeai as genai
        genai.configure(api_key=self.gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
You are an expert ATS (Applicant Tracking System) and Executive Resume Coach.
Analyze the following resume against the target job description (if provided).
Return ONLY a valid, parseable JSON object matching this exact schema:
{{
  "resume_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "keyword_alignment": <integer 0-100>,
  "interview_readiness": <integer 0-100>,
  "skills": [<list of strings>],
  "missing_skills": [<list of strings>],
  "matching_keywords": [<list of strings>],
  "missing_keywords": [<list of strings>],
  "strengths": [<list of 2-4 strings>],
  "weaknesses": [<list of 2-4 strings>],
  "ats_issues": [<list of 1-4 strings>],
  "recommendations": [<list of 2-4 actionable strings>],
  "improved_bullet_points": [
    {{
      "original": "<original weak line>",
      "improved": "<high impact quantified rewrite with active verbs>",
      "type": "impact",
      "reason": "<specific rationale>"
    }}
  ]
}}

TARGET JOB DESCRIPTION:
{job_description or "General Software / Product Professional"}

RESUME CONTENT:
{text[:8000]}
"""
        response = model.generate_content(prompt)
        raw_resp = response.text.strip()
        if raw_resp.startswith("```json"):
            raw_resp = raw_resp[7:]
        if raw_resp.endswith("```"):
            raw_resp = raw_resp[:-3]
        return json.loads(raw_resp.strip())

    def _analyze_with_openai(self, text: str, job_description: Optional[str]) -> Optional[Dict[str, Any]]:
        import openai
        client = openai.OpenAI(api_key=self.openai_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are an ATS Resume Analyzer. Return structured JSON."},
                {"role": "user", "content": f"Resume:\n{text[:6000]}\n\nJob Description:\n{job_description or ''}"}
            ]
        )
        return json.loads(response.choices[0].message.content)

    def _build_response_from_llm(
        self,
        llm_data: Dict[str, Any],
        raw_text: str,
        contact: Dict[str, str],
        filename: str,
        job_description: Optional[str],
        start_time: float,
        provider: str
    ) -> ResumeAnalysisResponse:
        # Combine LLM intelligence with structured canvas data
        improved_bullets = []
        for i, ib in enumerate(llm_data.get("improved_bullet_points", [])):
            improved_bullets.append(ImprovedBulletPoint(
                id=f"bullet-llm-{i+1}",
                original=ib.get("original", ""),
                improved=ib.get("improved", ""),
                type=ib.get("type", "impact"),
                reason=ib.get("reason", "Improved impact and action verbs")
            ))

        parsed_canvas = self._build_canvas_resume_data(
            raw_text,
            contact,
            llm_data.get("skills", []),
            improved_bullets,
            llm_data.get("resume_score", 80)
        )

        detected_sections = {
            "contact_information": SectionDetection(name="Contact Information", exists=bool(contact.get("email")), confidence=1.0),
            "professional_summary": SectionDetection(name="Professional Summary", exists="summary" in raw_text.lower(), confidence=0.9),
            "education": SectionDetection(name="Education", exists="education" in raw_text.lower() or "degree" in raw_text.lower(), confidence=0.95),
            "technical_skills": SectionDetection(name="Technical Skills", exists=len(llm_data.get("skills", [])) > 0, confidence=0.95),
            "soft_skills": SectionDetection(name="Soft Skills", exists=True, confidence=0.85),
            "work_experience": SectionDetection(name="Work Experience", exists="experience" in raw_text.lower(), confidence=0.95),
            "projects": SectionDetection(name="Projects", exists="project" in raw_text.lower(), confidence=0.85),
            "certifications": SectionDetection(name="Certifications", exists="certif" in raw_text.lower(), confidence=0.8),
            "achievements": SectionDetection(name="Achievements", exists="award" in raw_text.lower() or "achieve" in raw_text.lower(), confidence=0.8),
            "extracurricular_activities": SectionDetection(name="Extracurricular Activities", exists="volunteer" in raw_text.lower(), confidence=0.8)
        }

        return ResumeAnalysisResponse(
            success=True,
            resume_score=int(llm_data.get("resume_score", 80)),
            ats_score=int(llm_data.get("ats_score", 85)),
            keyword_alignment=int(llm_data.get("keyword_alignment", 75)),
            keyword_score=int(llm_data.get("keyword_alignment", 75)),
            interview_readiness=int(llm_data.get("interview_readiness", 70)),
            interview_readiness_score=int(llm_data.get("interview_readiness", 70)),
            detected_sections=detected_sections,
            skills=llm_data.get("skills", []),
            missing_skills=llm_data.get("missing_skills", []),
            matching_keywords=llm_data.get("matching_keywords", []),
            missing_keywords=llm_data.get("missing_keywords", []),
            match_percentage=int(llm_data.get("keyword_alignment", 75)),
            strengths=llm_data.get("strengths", ["Strong candidate foundation"]),
            weaknesses=llm_data.get("weaknesses", ["Minor bullet point improvements recommended"]),
            ats_issues=llm_data.get("ats_issues", ["Formatting passes automated ATS checks"]),
            recommendations=llm_data.get("recommendations", ["Quantify bullet point metrics"]),
            improved_bullet_points=improved_bullets,
            parsed_resume=parsed_canvas,
            raw_text_length=len(raw_text),
            processing_time_ms=round((time.time() - start_time) * 1000, 2),
            ai_provider_used=provider
        )

analyzer = ResumeAnalyzer()
