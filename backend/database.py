import sqlite3
import json
import os
import time
from typing import Optional, Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), "careerai.db")

class AnalysisDatabase:
    """
    Lightweight SQLite storage service for persisting resume analyses and interview sessions.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 1. Resume Analyses Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS resume_analyses (
                    id TEXT PRIMARY KEY,
                    filename TEXT,
                    candidate_name TEXT,
                    resume_score INTEGER,
                    ats_score INTEGER,
                    keyword_alignment INTEGER,
                    interview_readiness INTEGER,
                    analysis_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 2. Interview Sessions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS interview_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    role TEXT,
                    interview_type TEXT,
                    difficulty TEXT,
                    overall_score INTEGER,
                    technical_score INTEGER,
                    communication_score INTEGER,
                    relevance_score INTEGER,
                    problem_solving_score INTEGER,
                    confidence_score INTEGER,
                    report_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Pre-seed sample historical sessions if table is newly created
            cursor.execute("SELECT COUNT(*) FROM interview_sessions")
            if cursor.fetchone()[0] == 0:
                self._seed_default_interview_history(cursor)

            conn.commit()

    def _seed_default_interview_history(self, cursor):
        seed_data = [
            ("sess-sih-01", "auth-user", "Software Developer", "Mixed", "Intermediate", 78, 82, 76, 84, 71, 74, "2026-08-27 10:30:00"),
            ("sess-sih-02", "auth-user", "Java Developer", "Technical", "Intermediate", 72, 75, 70, 74, 68, 72, "2026-08-24 14:15:00"),
            ("sess-sih-03", "auth-user", "Senior Product Manager", "HR / Behavioral", "Advanced", 85, 88, 86, 90, 80, 82, "2026-08-18 16:45:00")
        ]
        for s_id, u_id, role, itype, diff, ov, tech, comm, rel, prob, conf, dt in seed_data:
            report = {
                "session_id": s_id,
                "target_role": role,
                "interview_type": itype,
                "difficulty": diff,
                "overall_score": ov,
                "performance_breakdown": {
                    "technical_knowledge": tech,
                    "communication": comm,
                    "relevance": rel,
                    "problem_solving": prob,
                    "confidence": conf
                },
                "strengths": ["Clear technical explanations", "Good STAR structure formulation"],
                "areas_to_improve": ["Quantify impact in project conclusions", "Deepen system scalability details"],
                "personalized_practice_plan": [
                    {"priority": 1, "topic": f"{role} Architecture", "reason": "Target role core requirement"},
                    {"priority": 2, "topic": "STAR Method", "reason": "Enhance conclusion metrics"}
                ],
                "date": dt[:10],
                "total_questions_answered": 5
            }
            cursor.execute("""
                INSERT INTO interview_sessions 
                (id, user_id, role, interview_type, difficulty, overall_score, technical_score, communication_score, relevance_score, problem_solving_score, confidence_score, report_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (s_id, u_id, role, itype, diff, ov, tech, comm, rel, prob, conf, json.dumps(report), dt))

    # --- Resume Analysis Database Methods ---
    def save_analysis(self, analysis_id: str, filename: str, candidate_name: str, result: Dict[str, Any]):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO resume_analyses 
                    (id, filename, candidate_name, resume_score, ats_score, keyword_alignment, interview_readiness, analysis_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    analysis_id,
                    filename,
                    candidate_name,
                    result.get("resume_score", 0),
                    result.get("ats_score", 0),
                    result.get("keyword_alignment", 0),
                    result.get("interview_readiness", 0),
                    json.dumps(result)
                ))
                conn.commit()
        except Exception as e:
            print(f"[DB ERROR] Could not save analysis: {e}")

    def get_recent_analyses(self, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, filename, candidate_name, resume_score, ats_score, keyword_alignment, interview_readiness, created_at 
                    FROM resume_analyses 
                    ORDER BY created_at DESC LIMIT ?
                """, (limit,))
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            print(f"[DB ERROR] Could not fetch analyses: {e}")
            return []

    # --- Interview Sessions Database Methods ---
    def save_interview_session(self, session_id: str, role: str, interview_type: str, difficulty: str, overall_score: int, report_dict: Dict[str, Any], user_id: str = "auth-user"):
        try:
            perf = report_dict.get("performance_breakdown", {})
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO interview_sessions
                    (id, user_id, role, interview_type, difficulty, overall_score, technical_score, communication_score, relevance_score, problem_solving_score, confidence_score, report_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_id,
                    user_id,
                    role,
                    interview_type,
                    difficulty,
                    overall_score,
                    perf.get("technical_knowledge", overall_score),
                    perf.get("communication", overall_score),
                    perf.get("relevance", overall_score),
                    perf.get("problem_solving", overall_score),
                    perf.get("confidence", overall_score),
                    json.dumps(report_dict)
                ))
                conn.commit()
        except Exception as e:
            print(f"[DB ERROR] Could not save interview session: {e}")

    def get_interview_history(self, user_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, created_at as date, role, interview_type, difficulty, overall_score, technical_score, communication_score, relevance_score, problem_solving_score, confidence_score, report_json
                    FROM interview_sessions
                    ORDER BY created_at DESC LIMIT ?
                """, (limit,))
                results = []
                for row in cursor.fetchall():
                    item = dict(row)
                    # Format human date
                    try:
                        raw_date = item.get("date", "")
                        if "T" in raw_date or "-" in raw_date:
                            parts = raw_date.split()[0].split("-")
                            if len(parts) == 3:
                                months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                m_idx = int(parts[1])
                                item["formatted_date"] = f"{months[m_idx]} {parts[2]}"
                            else:
                                item["formatted_date"] = raw_date[:10]
                        else:
                            item["formatted_date"] = raw_date
                    except Exception:
                        item["formatted_date"] = "Recent"
                    results.append(item)
                return results
        except Exception as e:
            print(f"[DB ERROR] Could not fetch interview history: {e}")
            return []

    def get_interview_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT report_json FROM interview_sessions WHERE id = ?", (session_id,))
                row = cursor.fetchone()
                if row and row["report_json"]:
                    return json.loads(row["report_json"])
                return None
        except Exception as e:
            print(f"[DB ERROR] Could not fetch interview report: {e}")
            return None

db = AnalysisDatabase()
