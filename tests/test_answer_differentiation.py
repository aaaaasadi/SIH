import requests
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8080"

question = "You have experience with Java. Can you explain how you applied Java in a real project, and what specific architectural decisions or trade-offs you made?"
category = "Technical (Java)"

test_answers = [
    ("1. Strong STAR with metrics", "In our payment service project (Situation), I was responsible for designing the Java REST API endpoints to handle high-throughput transactions (Task). I implemented async worker queues, connection pooling with HikariCP, and automated integration tests with JUnit (Action). Because we prioritized sub-50us latency over in-memory caching complexity, we chose Redis distributed cache (Trade-off). As a result, we reduced API response latency by 28% and handled over 15,000 daily requests with zero downtime (Result)."),
    ("2. Solid technical without metrics", "I used Java and Spring Boot to develop REST microservices for our user management system. I implemented the authentication filter, database repositories using Hibernate and PostgreSQL, and wrote JUnit tests. We faced a challenge with database connection limits so I added connection pooling."),
    ("3. Short basic answer", "I used Java and Spring to build backend REST APIs in my previous job."),
    ("4. Irrelevant answer", "I really love eating pepperoni pizza and going hiking in the mountains every Sunday with my golden retriever."),
    ("5. Single word answer", "Yes."),
    ("6. Empty answer", "")
]

results = []
for title, ans in test_answers:
    payload = {
        "session_id": "test-diff-sess",
        "question_index": 0,
        "question": question,
        "category": category,
        "answer_text": ans,
        "target_role": "Software Developer",
        "difficulty": "Intermediate"
    }
    r = requests.post(f"{BASE_URL}/api/interview/evaluate", json=payload)
    assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
    data = r.json()
    results.append((title, data["overall_score"], data["scores_breakdown"], data["what_you_did_well"], data["what_could_be_improved"], data["evaluation_mode"]))
    print(f"{title}")
    print(f"  Score: {data['overall_score']}/100")
    print(f"  What went well: {data['what_you_did_well']}")
    print(f"  What to improve: {data['what_could_be_improved']}")
    print(f"  Engine Mode: {data['evaluation_mode']}\n")

scores = [r[1] for r in results]
print('All scores:', scores)

assert len(set(scores)) >= 5, f"Scores must be varied: {scores}"
assert scores[0] >= 85, f"Strong score must be >=85: {scores[0]}"
assert scores[1] > scores[2], f"Solid ({scores[1]}) > Short ({scores[2]})"
assert scores[2] > scores[3], f"Short ({scores[2]}) > Irrelevant ({scores[3]})"
assert scores[3] <= 25, f"Irrelevant must be <=25: {scores[3]}"

feedbacks = [r[3] + " " + r[4] for r in results]
assert len(set(feedbacks)) == len(feedbacks), "All feedbacks must be distinct"
print("[SUCCESS] ENDPOINT PRODUCES HIGHLY DYNAMIC SCORES AND DISTINCT FEEDBACK TEXTS!")
