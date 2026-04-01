import os
from dotenv import load_dotenv

# Đọc file .env
load_dotenv()


class Settings:
    """Cấu hình hệ thống"""
    
    PROJECT_NAME = "Pharmacy Chain Management"
    VERSION = "1.0.0"
    
    # Kết nối Database
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5432/pharmacy_db"
    )
    
    # Google Gemini API
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Secret key cho JWT
    SECRET_KEY = os.getenv("SECRET_KEY", "pharmacy-secret-key")


# Tạo 1 instance dùng chung
settings = Settings()