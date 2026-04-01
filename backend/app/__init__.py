from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


def create_app():
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Hệ thống quản lý chuỗi nhà thuốc tích hợp MedGPT"
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    from app.routes import orders, drugs, disposal, medgpt
    from app.routes import manage, medical_supplies
    
    app.include_router(orders.router, prefix="/api/orders", tags=["Đơn hàng"])
    app.include_router(drugs.router, prefix="/api/drugs", tags=["Tra cứu thuốc"])
    app.include_router(disposal.router, prefix="/api/disposal", tags=["Thanh lý"])
    app.include_router(medgpt.router, prefix="/api/medgpt", tags=["MedGPT Chat"])
    app.include_router(manage.router, prefix="/api/manage", tags=["Quản lý"])
    app.include_router(medical_supplies.router, prefix="/api/medical-supplies", tags=["Vật dụng y tế"])
    
    @app.get("/")
    def root():
        return {"message": "Pharmacy Chain Management API", "docs": "/docs"}
    
    return app