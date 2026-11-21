from fastapi import FastAPI

from app.REST.web.routes import router as students_router
from app.notifications.web.routes import router as notifications_router
from app.identity.web.routes import router as identity_router

from app.REST.docs_app import student_docs_app
from app.notifications.docs_app import notifications_docs_app
from app.identity.docs_app import identity_docs_app

from threading import Thread
from contextlib import asynccontextmanager

from app.notifications.service.notification_worker import run_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = Thread(target=run_worker, daemon=True)
    thread.start()
    yield


app = FastAPI(
    title="Laboratorium 7 - Identity",
    lifespan=lifespan,
)

app.include_router(students_router)
app.include_router(notifications_router)
app.include_router(identity_router)

app.mount("/student-docs", student_docs_app)
app.mount("/notifications-docs", notifications_docs_app)
app.mount("/identity-docs", identity_docs_app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)