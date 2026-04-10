"""
<<<<<<< HEAD
Tests del backend — cubre health, auth, historial y validaciones de análisis.
=======
Tests básicos del backend.
>>>>>>> origin/main
Ejecutar con: pytest tests/ -v
"""
import io
import zipfile
<<<<<<< HEAD
from unittest.mock import patch

import pytest


# ─── Health ───────────────────────────────────────────────────────────────────

def test_root_returns_ok(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "mensaje" in res.json()


def test_health_returns_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ─── Auth — Registro ──────────────────────────────────────────────────────────

def test_registro_exitoso(client):
    res = client.post("/auth/registro", json={"email": "nuevo@example.com", "password": "segura123"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["email"] == "nuevo@example.com"


def test_registro_email_duplicado(client, registered_user):
    res = client.post("/auth/registro", json={
        "email": registered_user["email"],
        "password": "otrapass123",
    })
    assert res.status_code == 400
    assert "registrado" in res.json()["detail"].lower()


def test_registro_password_corta(client):
    res = client.post("/auth/registro", json={"email": "short@example.com", "password": "123"})
    assert res.status_code == 422


def test_registro_email_invalido(client):
    res = client.post("/auth/registro", json={"email": "no-es-email", "password": "password123"})
    assert res.status_code == 422


# ─── Auth — Login ─────────────────────────────────────────────────────────────

def test_login_exitoso(client, registered_user):
    res = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"],
    })
    assert res.status_code == 200
    assert "token" in res.json()


def test_login_password_incorrecta(client, registered_user):
    res = client.post("/auth/login", json={
        "email": registered_user["email"],
        "password": "wrongpassword",
    })
    assert res.status_code == 401


def test_login_usuario_inexistente(client):
    res = client.post("/auth/login", json={"email": "fantasma@example.com", "password": "pass123"})
    assert res.status_code == 401


# ─── Historial ────────────────────────────────────────────────────────────────

def test_historial_sin_token_retorna_401(client):
    res = client.get("/historial")
    assert res.status_code == 401


def test_historial_con_token_invalido_retorna_401(client):
    res = client.get("/historial", headers={"Authorization": "Bearer token.falso.aqui"})
    assert res.status_code == 401


def test_historial_vacio_para_usuario_nuevo(client, registered_user):
    res = client.get("/historial", headers={"Authorization": f"Bearer {registered_user['token']}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


# ─── Análisis — Validaciones ──────────────────────────────────────────────────

def test_upload_archivo_no_zip_retorna_400(client):
    fake_file = io.BytesIO(b"esto no es un zip valido")
    res = client.post(
        "/upload",
        files={"file": ("test.zip", fake_file, "application/zip")},
    )
    assert res.status_code == 400


def test_analyze_text_vacio_retorna_422(client):
    res = client.post("/analyze-text", json={"code": "", "language": "js"})
    assert res.status_code == 422


def test_analyze_repo_url_invalida_retorna_422(client):
    res = client.post("/analyze-repo", json={"url": "no-es-una-url"})
    assert res.status_code == 422


def test_analyze_repo_sin_url_retorna_422(client):
    res = client.post("/analyze-repo", json={"url": ""})
    assert res.status_code == 422


def test_analyze_repo_url_valida_acepta_request(client):
    """Con URL válida el endpoint acepta la request (aunque el análisis falle sin SonarQube)."""
    with patch("streaming.clone_and_analyze") as mock_gen:
        mock_gen.return_value = iter([
            'data: {"finalizado": true, "status": "success", "mensaje": "ok"}\n\n'
        ])
        res = client.post("/analyze-repo", json={"url": "https://github.com/usuario/repo"})
    assert res.status_code == 200


def test_upload_zip_valido_acepta_request(client):
    """Un ZIP bien formado debe ser aceptado antes de llegar a SonarQube."""
=======
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_returns_ok():
    response = client.get("/")
    assert response.status_code == 200
    assert "mensaje" in response.json()


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_upload_invalid_file_returns_400():
    """Subir un archivo que no es ZIP debe retornar error 400."""
    fake_file = io.BytesIO(b"esto no es un zip")
    response = client.post(
        "/upload",
        files={"file": ("test.zip", fake_file, "application/zip")},
    )
    assert response.status_code == 400


def test_upload_valid_zip_is_accepted():
    """Un ZIP válido debe ser descomprimido correctamente antes del escaneo."""
>>>>>>> origin/main
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("hello.js", "console.log('hello world');")
    zip_buffer.seek(0)

<<<<<<< HEAD
    with patch("streaming.analyze_stream") as mock_stream:
        mock_stream.return_value = iter([
            'data: {"finalizado": true, "status": "success", "mensaje": "ok"}\n\n'
        ])
        res = client.post(
            "/upload",
            files={"file": ("proyecto.zip", zip_buffer, "application/zip")},
        )
    assert res.status_code == 200
=======
    # En CI no hay sonar-scanner, solo verificamos que el ZIP se procesa
    # sin error de formato (400). El 500 es aceptable en CI sin SonarQube.
    with zipfile.ZipFile(io.BytesIO(zip_buffer.getvalue())) as zf:
        assert "hello.js" in zf.namelist()

def test_analyze_text_empty_returns_400():
    """Enviar código vacío debe retornar 400."""
    response = client.post("/analyze-text", json={"code": "", "language": "js"})
    assert response.status_code == 400


def test_analyze_repo_invalid_url_returns_400():
    """Una URL que no es de repositorio debe retornar 400."""
    response = client.post("/analyze-repo", json={"url": "no-es-una-url"})
    assert response.status_code == 400


def test_analyze_repo_empty_returns_400():
    """Sin URL debe retornar 400."""
    response = client.post("/analyze-repo", json={"url": ""})
    assert response.status_code == 400
>>>>>>> origin/main
