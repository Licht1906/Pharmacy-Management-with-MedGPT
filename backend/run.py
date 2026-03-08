import uvicorn
from app import create_app

app = create_app()

if __name__ == "__main__":
    print("=== Pharmacy Chain Management System ===")
    print("API Docs: http://localhost:8000/docs")
    print("=========================================")
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)