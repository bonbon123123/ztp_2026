from fastapi import FastAPI
from app.REST.web.routes import router as student_router

student_docs_app = FastAPI(
    title="Student API",
    docs_url="/",
    redoc_url=None,
    openapi_url="/openapi.json"
)

student_docs_app.include_router(student_router)