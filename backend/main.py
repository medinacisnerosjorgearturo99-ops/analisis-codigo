import json
import os
import shutil
import zipfile

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import auth
import historial as historial_db
import streaming
from config import ALLOWED_ORIGINS
from database import engine, get_db
from models import Base, Usuario
from schemas import (
    AnalyzeRepoPayload,
    AnalyzeTextPayload,
    AuthPayload,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="API de Análisis de Código")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"mensaje": "API funcionando"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/registro")
def registro(payload: AuthPayload, db: Session = Depends(get_db)):
    email = payload.email
    if auth.get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Este email ya está registrado.")

    usuario = Usuario(
        email=email,
        password_hash=auth.hash_password(payload.password),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return {"token": auth.create_token(usuario.id, usuario.email), "email": usuario.email}


@app.post("/auth/login")
def login(payload: AuthPayload, db: Session = Depends(get_db)):
    usuario = auth.get_user_by_email(db, payload.email)
    if not usuario or not auth.verify_password(payload.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")
    return {"token": auth.create_token(usuario.id, usuario.email), "email": usuario.email}


# ─── Historial ────────────────────────────────────────────────────────────────

@app.get("/historial")
def obtener_historial(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    payload = auth.require_token(authorization)
    entries = historial_db.list_for_user(db, payload["sub"])
    return [
        {
            "id": e.id,
            "proyecto": e.proyecto,
            "bugs": e.bugs,
            "vulnerabilidades": e.vulnerabilidades,
            "code_smells": e.code_smells,
            "sonar_url": e.sonar_url,
            "fecha": e.fecha.strftime("%d/%m/%Y %H:%M"),
        }
        for e in entries
    ]


# ─── Análisis ─────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_code(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    usuario_payload = auth.decode_token(authorization)

    raw_name = os.path.splitext(os.path.basename(file.filename or "proyecto"))[0]
    project_key = streaming._safe_project_key(raw_name)

    os.makedirs("temp_uploads", exist_ok=True)
    os.makedirs("temp_unzipped", exist_ok=True)

    file_location = f"temp_uploads/{project_key}.zip"
    extract_path = f"temp_unzipped/{project_key}"

    try:
        with open(file_location, "wb+") as f:
            shutil.copyfileobj(file.file, f)
        with zipfile.ZipFile(file_location, "r") as zip_ref:
            zip_ref.extractall(extract_path)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="El archivo no es un ZIP válido.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)

    def stream():
        ok_event = json.dumps({"paso": 1, "mensaje": "✅ Archivo descomprimido", "completado": True})
        yield f"data: {ok_event}\n\n"
        yield from streaming.analyze_stream(extract_path, project_key, usuario_payload, db)
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/analyze-repo")
async def analyze_repo(
    payload: AnalyzeRepoPayload,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    usuario_payload = auth.decode_token(authorization)

    def stream():
        yield from streaming.clone_and_analyze(payload.url, usuario_payload, db)

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/analyze-text")
async def analyze_text(
    payload: AnalyzeTextPayload,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    usuario_payload = auth.decode_token(authorization)
    project_key = "inline_code"
    temp_dir = f"temp_unzipped/{project_key}"
    os.makedirs(temp_dir, exist_ok=True)

    def stream():
        try:
            with open(os.path.join(temp_dir, f"code.{payload.language}"), "w", encoding="utf-8") as f:
                f.write(payload.code)
            ok_event = json.dumps({"paso": 1, "mensaje": "✅ Código recibido", "completado": True})
            yield f"data: {ok_event}\n\n"
            yield from streaming.analyze_stream(temp_dir, project_key, usuario_payload, db)
        except Exception as exc:
            err_event = json.dumps({"finalizado": True, "status": "error", "mensaje": str(exc)})
            yield f"data: {err_event}\n\n"
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")
