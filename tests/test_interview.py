import requests
import json
import sys

# Force UTF-8 encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8080"

def test_interview_endpoints():
    print("--- 1. Testing POST /api/interview/start (Personalized Mode) ---")
    start_payload = {
        "target_role": "Software Developer",
        "interview_type": "Mixed",
        "difficulty": "Intermediate",
        "num_questions": 5,
        "use_resume": True,
        "use_jd": True,
        "resume_text": "Priya Sharma | Python, Java, AWS, Django, Spring Boot, Redis, Docker, Kubernetes. 5 years backend development, built high-throughput REST APIs supporting 50,000 DAU with 35% latency reduction.",
        "job_description": "Looking for Software Developer with Java, Spring Boot, REST APIs, Microservices, and Docker."
    }
    r = requests.post(f"{BASE_URL}/api/interview/start", json=start_payload)
    print("Start Response Status:", r.status_code)
    assert r.status_code == 200
    start_data = r.json()
    session_id = start_data["session_id"]
    first_q = start_data["first_question"]
    print("Session ID:", session_id)
    print("Total Questions:", start_data["total_questions"])
    print("Context Summary:", start_data["context_summary"])
    print("First Question:", first_q["question"])
    print("Context Reason:", first_q["context_reason"])
    assert len(start_data["all_questions_preview"]) == 5

    print("\n--- 2. Testing POST /api/interview/evaluate (Voice/Text Answer) ---")
    eval_payload = {
        "session_id": session_id,
        "question_index": 0,
        "question": first_q["question"],
        "category": first_q["category"],
        "answer_text": "In our payment service project (Situation), I was responsible for designing the Java REST API endpoints to handle high-throughput transactions (Task). I implemented async worker queues, connection pooling, and automated integration tests with JUnit (Action). As a result, we reduced API response latency by 28% and handled over 15,000 daily requests with zero downtime (Result).",
        "target_role": "Software Developer",
        "difficulty": "Intermediate"
    }
    r = requests.post(f"{BASE_URL}/api/interview/evaluate", json=eval_payload)
    print("Evaluate Response Status:", r.status_code)
    assert r.status_code == 200
    eval_data = r.json()
    print("Overall Score:", eval_data["overall_score"], "/ 100")
    print("Breakdown:", eval_data["scores_breakdown"])
    print("What you did well:", eval_data["what_you_did_well"])
    print("What could be improved:", eval_data["what_could_be_improved"])
    print("AI Recommendation:", eval_data["ai_recommendation"])
    print("Model Answer (Sample):", eval_data["model_answer"][:100] + "...")
    assert eval_data["overall_score"] > 60

    print("\n--- 3. Testing POST /api/interview/question (Adaptive Next Question) ---")
    next_payload = {
        "session_id": session_id,
        "current_question_index": 1,
        "total_questions": 5,
        "target_role": "Software Developer",
        "interview_type": "Mixed",
        "difficulty": "Intermediate",
        "previous_score": eval_data["overall_score"],
        "previous_question": first_q["question"],
        "previous_answer": eval_payload["answer_text"],
        "resume_text": start_payload["resume_text"]
    }
    r = requests.post(f"{BASE_URL}/api/interview/question", json=next_payload)
    print("Next Question Status:", r.status_code)
    assert r.status_code == 200
    next_q = r.json()
    print("Adaptive Question 2:", next_q["question"])
    print("Difficulty:", next_q["difficulty"])

    print("\n--- 4. Testing POST /api/interview/finish (Final Report & Practice Plan) ---")
    finish_payload = {
        "session_id": session_id,
        "target_role": "Software Developer",
        "interview_type": "Mixed",
        "difficulty": "Intermediate",
        "answers": [
            {
                "question_index": 0,
                "question": first_q["question"],
                "category": first_q["category"],
                "answer_text": eval_payload["answer_text"],
                "overall_score": eval_data["overall_score"],
                "scores_breakdown": eval_data["scores_breakdown"],
                "what_you_did_well": eval_data["what_you_did_well"],
                "what_could_be_improved": eval_data["what_could_be_improved"],
                "ai_recommendation": eval_data["ai_recommendation"],
                "model_answer": eval_data["model_answer"]
            }
        ],
        "is_guest": False
    }
    r = requests.post(f"{BASE_URL}/api/interview/finish", json=finish_payload)
    print("Finish Response Status:", r.status_code)
    assert r.status_code == 200
    report = r.json()
    print("Final Overall Score:", report["overall_score"], "/ 100")
    print("Performance Breakdown:", report["performance_breakdown"])
    print("Strengths:", report["strengths"])
    print("Areas to Improve:", report["areas_to_improve"])
    print("Practice Plan:")
    for plan in report["personalized_practice_plan"]:
        print(f"  • Priority {plan['priority']}: {plan['topic']} -> {plan['reason']}")

    print("\n--- 5. Testing GET /api/interview/history ---")
    r = requests.get(f"{BASE_URL}/api/interview/history")
    print("History Status:", r.status_code)
    assert r.status_code == 200
    history = r.json()
    print("History Records Count:", len(history))
    for h in history[:3]:
        print(f"  [{h.get('formatted_date', h['date'])}] {h['role']} ({h['interview_type']}) - Score: {h['overall_score']}")

    print("\n[SUCCESS] ALL INTERVIEW BACKEND TESTS PASSED!")

if __name__ == "__main__":
    test_interview_endpoints()
