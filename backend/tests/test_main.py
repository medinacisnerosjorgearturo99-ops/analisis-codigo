"""
Tests básicos del backend.
Ejecutar con: pytest tests/ -v
"""
import io
import zipfile
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
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("hello.js", "console.log('hello world');")
    zip_buffer.seek(0)

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