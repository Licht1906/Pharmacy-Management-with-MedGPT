from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


def create_app():
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Hệ thống quản lý chuỗi nhà thuốc tích hợp MedGPT"
    )
    
    # Cho phép Frontend gọi API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Đăng ký routes
    from app.routes import orders, drugs, disposal, medgpt
    app.include_router(orders.router, prefix="/api/orders", tags=["Đơn hàng"])
    app.include_router(drugs.router, prefix="/api/drugs", tags=["Tra cứu thuốc"])
    app.include_router(disposal.router, prefix="/api/disposal", tags=["Thanh lý"])
    app.include_router(medgpt.router, prefix="/api/medgpt", tags=["MedGPT"])
    
    @app.get("/")
    def root():
        return {
            "message": "Pharmacy Chain Management API",
            "docs": "Truy cập /docs để xem API"
        }
    
    return app