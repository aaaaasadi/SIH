import requests
import json
import sys

# Force UTF-8 encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8080"

def run_e2e_tests():
    print("=" * 70)
    print("RUNNING COMPLETE SIH E2E INTERVIEW SCENARIO TESTS")
    print("=" * 70)

    # --------------------------------------------------------------------------
    # Scenario 1: Guest with NO Resume and NO JD (Generic Mode - Zero Prerequisites)
    # --------------------------------------------------------------------------
    print("\n>>> SCENARIO 1: Guest with NO Resume / NO JD (Generic Mode) <<<")
    start_payload_generic = {
        "target_role": "Full Stack Developer",
        "interview_type": "HR / Behavioral",
        "difficulty": "Beginner",
        "num_questions": 5,
        "use_resume": False,
        "use_jd": False,
        "resume_text": None,
        "job_description": None
    }
    r = requests.post(f"{BASE_URL}/api/interview/start", json=start_payload_generic)
    assert r.status_code == 200, f"Failed: {r.text}"
    gen_data = r.json()
    print("✓ Session created successfully:", gen_data["session_id"])
    print("✓ Is Personalized:", gen_data["is_personalized"], "(Expected: False)")
    print("✓ Context Summary:", gen_data["context_summary"])
    print("✓ Question 1:", gen_data["first_question"]["question"])
    assert gen_data["is_personalized"] is False
    assert len(gen_data["all_questions_preview"]) == 5

    # Answer Question 1 via Text in Generic Mode
    eval_payload_gen = {
        "session_id": gen_data["session_id"],
        "question_index": 0,
        "question": gen_data["first_question"]["question"],
        "category": gen_data["first_question"]["category"],
        "answer_text": "In our student portal project (Situation), my teammate and I encountered a technical disagreement on whether to use a monolithic or microservice architecture under tight deadlines (Task). I scheduled a structured trade-off meeting with our lead professor to compare API latency, team velocity, and maintenance overhead (Action). We reached a consensus on a modular architecture, which eliminated deployment friction and launched on schedule with 0 downtime for 500 students (Result).",
        "target_role": "Full Stack Developer",
        "difficulty": "Beginner"
    }
    r_eval = requests.post(f"{BASE_URL}/api/interview/evaluate", json=eval_payload_gen)
    assert r_eval.status_code == 200
    eval_res = r_eval.json()
    print("✓ Generic Answer Evaluated - Overall Score:", eval_res["overall_score"], "/ 100")
    print("✓ 6-Score Breakdown:", eval_res["scores_breakdown"])
    print("✓ AI Recommendation:", eval_res["ai_recommendation"])
    assert eval_res["overall_score"] > 70

    # --------------------------------------------------------------------------
    # Scenario 2: Signed-In User with Full Resume + JD (Personalized Mode)
    # --------------------------------------------------------------------------
    print("\n>>> SCENARIO 2: Signed-In User with Full Resume + Target JD <<<")
    start_payload_pers = {
        "target_role": "Java Developer",
        "interview_type": "Technical",
        "difficulty": "Intermediate",
        "num_questions": 5,
        "use_resume": True,
        "use_jd": True,
        "resume_text": "Candidate: Rahul Kumar | Email: rahul@example.com | Skills: Java, Spring Boot, Hibernate, PostgreSQL, Microservices, Docker, Kafka | Experience: Built high-throughput transaction routing engine handling 25,000 requests/sec with 99.99% availability.",
        "job_description": "Target: Senior Java Engineer at FinTech Corp. Requirements: Java 17, Spring Boot, Kafka streaming, Distributed caching (Redis), Kubernetes microservices."
    }
    r_pers = requests.post(f"{BASE_URL}/api/interview/start", json=start_payload_pers)
    assert r_pers.status_code == 200
    pers_data = r_pers.json()
    print("✓ Session created:", pers_data["session_id"])
    print("✓ Is Personalized:", pers_data["is_personalized"], "(Expected: True)")
    print("✓ Context Summary:", pers_data["context_summary"])
    print("✓ Personalized Question 1:", pers_data["first_question"]["question"])
    print("✓ Context Reason:", pers_data["first_question"]["context_reason"])
    assert pers_data["is_personalized"] is True
    assert "Java" in pers_data["first_question"]["question"] or "Spring" in pers_data["first_question"]["question"] or "Python" in pers_data["first_question"]["question"]

    # Evaluate Technical Answer
    eval_payload_pers = {
        "session_id": pers_data["session_id"],
        "question_index": 0,
        "question": pers_data["first_question"]["question"],
        "category": pers_data["first_question"]["category"],
        "answer_text": "In our transaction routing microservice (Situation), we needed to maintain sub-50ms latency under 20K RPS spikes (Task). I configured Spring Boot connection pooling with HikariCP, decoupled ingestion using Kafka topic partitions, and applied Redis distributed caching (Action). This reduced database read latency by 42% and supported 25,000 transactions/sec during peak traffic (Result).",
        "target_role": "Java Developer",
        "difficulty": "Intermediate"
    }
    r_pers_eval = requests.post(f"{BASE_URL}/api/interview/evaluate", json=eval_payload_pers)
    assert r_pers_eval.status_code == 200
    pers_eval = r_pers_eval.json()
    print("✓ Personalized Technical Answer Score:", pers_eval["overall_score"], "/ 100")
    print("✓ Technical Accuracy Score:", pers_eval["scores_breakdown"]["technical_accuracy"], "/ 10")
    print("✓ Model Coaching Answer (Snippet):", pers_eval["model_answer"][:120] + "...")
    assert pers_eval["scores_breakdown"]["technical_accuracy"] >= 8

    # Next Adaptive Question
    next_payload = {
        "session_id": pers_data["session_id"],
        "current_question_index": 1,
        "total_questions": 5,
        "target_role": "Java Developer",
        "interview_type": "Technical",
        "difficulty": "Intermediate",
        "previous_score": pers_eval["overall_score"],
        "previous_question": pers_data["first_question"]["question"],
        "previous_answer": eval_payload_pers["answer_text"],
        "resume_text": start_payload_pers["resume_text"],
        "job_description": start_payload_pers["job_description"]
    }
    r_next = requests.post(f"{BASE_URL}/api/interview/question", json=next_payload)
    assert r_next.status_code == 200
    next_q = r_next.json()
    print("✓ Adaptive Question 2 Generated:", next_q["question"])
    print("✓ Adaptive Difficulty:", next_q["difficulty"])

    # Finish & Generate Final Performance Dashboard
    finish_payload = {
        "session_id": pers_data["session_id"],
        "target_role": "Java Developer",
        "interview_type": "Technical",
        "difficulty": "Intermediate",
        "answers": [
            {
                "question_index": 0,
                "question": pers_data["first_question"]["question"],
                "category": pers_data["first_question"]["category"],
                "answer_text": eval_payload_pers["answer_text"],
                "overall_score": pers_eval["overall_score"],
                "scores_breakdown": pers_eval["scores_breakdown"],
                "what_you_did_well": pers_eval["what_you_did_well"],
                "what_could_be_improved": pers_eval["what_could_be_improved"],
                "ai_recommendation": pers_eval["ai_recommendation"],
                "model_answer": pers_eval["model_answer"]
            }
        ],
        "is_guest": False
    }
    r_fin = requests.post(f"{BASE_URL}/api/interview/finish", json=finish_payload)
    assert r_fin.status_code == 200
    final_rep = r_fin.json()
    print("✓ Final Overall Score:", final_rep["overall_score"])
    print("✓ Performance Breakdown:", final_rep["performance_breakdown"])
    print("✓ Strengths:", final_rep["strengths"])
    print("✓ Areas to Improve:", final_rep["areas_to_improve"])
    print("✓ Personalized Practice Plan:")
    for item in final_rep["personalized_practice_plan"]:
        print(f"    - Priority {item['priority']}: {item['topic']} ({item['reason']})")

    # --------------------------------------------------------------------------
    # Scenario 3: Verify Persistence & Interview History
    # --------------------------------------------------------------------------
    print("\n>>> SCENARIO 3: Verify Interview History in SQLite Database <<<")
    r_hist = requests.get(f"{BASE_URL}/api/interview/history")
    assert r_hist.status_code == 200
    hist = r_hist.json()
    print(f"✓ Total Saved Sessions: {len(hist)}")
    found_saved = any(h["id"] == pers_data["session_id"] for h in hist)
    print(f"✓ Current Session '{pers_data['session_id']}' exists in history: {found_saved}")
    assert found_saved

    # Fetch detailed report
    r_rep = requests.get(f"{BASE_URL}/api/interview/report/{pers_data['session_id']}")
    assert r_rep.status_code == 200
    rep_obj = r_rep.json()
    print(f"✓ Retrieved Detailed Saved Report for: {rep_obj['target_role']} (Score: {rep_obj['overall_score']})")

    # --------------------------------------------------------------------------
    # Scenario 4: Error Handling & Heuristic Rubric Fallback
    # --------------------------------------------------------------------------
    print("\n>>> SCENARIO 4: Error Handling & Heuristic Rubric Fallback <<<")
    # Test with empty answer
    empty_eval_payload = {
        "session_id": "test-empty",
        "question_index": 0,
        "question": "Explain how you optimize database queries.",
        "category": "Technical",
        "answer_text": "",
        "target_role": "Software Developer",
        "difficulty": "Intermediate"
    }
    r_empty = requests.post(f"{BASE_URL}/api/interview/evaluate", json=empty_eval_payload)
    assert r_empty.status_code == 200
    empty_res = r_empty.json()
    print("✓ Empty Answer Handled Safely - Score:", empty_res["overall_score"], "(Expected low non-crashing score)")
    assert empty_res["overall_score"] < 40

    # Test with very brief/weak answer
    short_eval_payload = {
        "session_id": "test-short",
        "question_index": 0,
        "question": "Explain how you optimize database queries.",
        "category": "Technical",
        "answer_text": "I add indexes.",
        "target_role": "Software Developer",
        "difficulty": "Intermediate"
    }
    r_short = requests.post(f"{BASE_URL}/api/interview/evaluate", json=short_eval_payload)
    assert r_short.status_code == 200
    short_res = r_short.json()
    print("✓ Short Answer Score:", short_res["overall_score"], "/ 100")
    print("✓ Constructive Feedback:", short_res["what_could_be_improved"])
    assert short_res["overall_score"] < 60

    print("\n" + "=" * 70)
    print("🎉 ALL 4 E2E SCENARIOS VERIFIED AND FULLY PASSING!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_tests()
