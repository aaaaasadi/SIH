import os
import sys
import uvicorn

# Ensure UTF-8 stdout encoding on Windows console
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

PORT = 8080

if __name__ == "__main__":
    print("================================================================")
    print("🚀 CareerAI — FastAPI AI Resume & Interview Coach Server (PS-9)")
    print("================================================================")
    print(f"Local Server running at: http://localhost:{PORT}")
    print(f"API Endpoint: http://localhost:{PORT}/api/resume/analyze")
    print(f"Interactive API Docs: http://localhost:{PORT}/docs")
    print("================================================================")

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=PORT,
        log_level="info"
    )
