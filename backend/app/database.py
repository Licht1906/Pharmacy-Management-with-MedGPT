from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Tạo kết nối đến PostgreSQL
engine = create_engine(settings.DATABASE_URL, echo=False)

# Session: mỗi lần thao tác DB tạo 1 session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class cho tất cả Models
Base = declarative_base()


def get_db():
    """
    Mỗi API request sẽ gọi hàm này để lấy 1 session DB.
    Khi request xong → tự động đóng session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()