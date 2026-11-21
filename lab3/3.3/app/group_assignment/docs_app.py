from fastapi import FastAPI
from app.group_assignment.web.routes import router as group_assignment_router

group_assignment_docs_app = FastAPI(
    title="Group Assignment API",
    docs_url="/",
    redoc_url=None,
    openapi_url="/openapi.json",
)

group_assignment_docs_app.include_router(group_assignment_router)