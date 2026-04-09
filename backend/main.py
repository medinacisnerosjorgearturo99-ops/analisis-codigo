from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import zipfile
import subprocess
import time
import urllib.request
import json
import base64

app = FastAPI(title="API de Análisis de Código")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN — se lee del archivo .env ---
SONAR_TOKEN = os.environ.get("SONAR_TOKEN", "")
SONAR_HOST_URL = os.environ.get("SONAR_HOST_URL", "http://sonarqube:9000")

# Carpetas y archivos que SonarQube no necesita analizar
SONAR_EXCLUSIONS = ",".join([
    "**/node_modules/**",
    "**/.venv/**",
    "**/venv/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.git/**",
    "**/coverage/**",
    "**/__pycache__/**",
    "**/*.min.js",
    "**/*.min.css",
])

# Archivos de test — se analizan pero no cuentan como código principal
SONAR_TEST_EXCLUSIONS = ",".join([
    "**/tests/**",
    "**/test/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
])


# ─────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────

def wait_for_sonar_task(project_key: str, max_wait: int = 60) -> bool:
    """Polling hasta que SonarQube confirme que terminó de procesar."""
    auth = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()

    for _ in range(max_wait // 2):
        time.sleep(2)
        url = f"{SONAR_HOST_URL}/api/ce/activity?component={project_key}&ps=1"
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth}")
        try:
            with urllib.request.urlopen(req) as r:
                data = json.loads(r.read())
                tasks = data.get("tasks", [])
                if tasks and tasks[0].get("status") == "SUCCESS":
                    return True
                if tasks and tasks[0].get("status") in ("FAILED", "CANCELLED"):
                    return False
        except Exception as e:
            print(f"⚠️ Error consultando tarea: {e}")

    return False


def get_sonar_metrics(project_key: str) -> dict:
    """Obtiene bugs, vulnerabilidades y code smells de SonarQube."""
    try:
        auth = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
        url = (
            f"{SONAR_HOST_URL}/api/measures/component"
            f"?component={project_key}"
            f"&metricKeys=bugs,vulnerabilities,code_smells"
        )
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth}")
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            measures = data.get("component", {}).get("measures", [])
            return {m["metric"]: m["value"] for m in measures}
    except Exception as e:
        print(f"⚠️ Error obteniendo métricas: {e}")
        return {}


def run_sonar_scan(source_path: str, project_key: str) -> dict:
    """Lanza sonar-scanner con todas las optimizaciones de velocidad."""
    print(f"\n🚀 Iniciando escaneo de: {project_key}")

    cmd = [
        "sonar-scanner",
        f"-Dsonar.projectKey={project_key}",
        f"-Dsonar.sources={source_path}",
        f"-Dsonar.host.url={SONAR_HOST_URL}",
        f"-Dsonar.login={SONAR_TOKEN}",

        # ── Exclusiones: no escanear archivos innecesarios ──
        f"-Dsonar.exclusions={SONAR_EXCLUSIONS}",
        f"-Dsonar.test.exclusions={SONAR_TEST_EXCLUSIONS}",

        # ── Velocidad: desactivar análisis que no necesitamos ──
        "-Dsonar.scm.disabled=true",          # no analiza historial de git
        "-Dsonar.coverage.exclusions=**/*",   # omite análisis de cobertura de tests
        "-Dsonar.sourceEncoding=UTF-8",

        # ── Velocidad: limitar RAM del analizador de JavaScript ──
        # (sin esto puede pedir hasta 2GB para proyectos JS grandes)
        "-Dsonar.javascript.node.maxspace=256",
    ]

    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    for line in process.stdout:
        print(line, end="")
    process.wait()

    if process.returncode != 0:
        return {"status": "error", "mensaje": "Fallo en el análisis de SonarQube."}

    print("⏳ Esperando confirmación de SonarQube...")
    wait_for_sonar_task(project_key)

    stats = get_sonar_metrics(project_key)

    return {
        "status": "success",
        "mensaje": f"Análisis de '{project_key}' completado.",
        "stats": stats,
        "sonar_url": f"http://localhost:9000/dashboard?id={project_key}",
    }


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"mensaje": "API funcionando"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/upload")
async def upload_code(file: UploadFile = File(...)):
    """Recibe un .zip, lo descomprime y lo analiza."""
    os.makedirs("temp_uploads", exist_ok=True)
    os.makedirs("temp_unzipped", exist_ok=True)

    project_key = os.path.splitext(file.filename)[0]
    file_location = f"temp_uploads/{file.filename}"
    extract_path = f"temp_unzipped/{project_key}"

    try:
        with open(file_location, "wb+") as f:
            shutil.copyfileobj(file.file, f)

        with zipfile.ZipFile(file_location, "r") as zip_ref:
            zip_ref.extractall(extract_path)

        return run_sonar_scan(extract_path, project_key)

    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="El archivo no es un ZIP válido.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path, ignore_errors=True)


@app.post("/analyze-repo")
async def analyze_repo(payload: dict):
    """Clona un repositorio público y lo analiza."""
    repo_url = payload.get("url", "").strip()

    if not repo_url:
        raise HTTPException(status_code=400, detail="No se recibió URL.")
    if not (repo_url.startswith("http") or repo_url.startswith("git@")):
        raise HTTPException(status_code=400, detail="URL de repositorio no válida.")

    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    project_key = repo_name
    clone_path = f"temp_unzipped/{project_key}"

    try:
        result = subprocess.run(
            ["git", "clone", "--depth=1", repo_url, clone_path],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail=f"No se pudo clonar el repositorio: {result.stderr}",
            )

        return run_sonar_scan(clone_path, project_key)

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="El repositorio tardó demasiado en clonarse.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(clone_path):
            shutil.rmtree(clone_path, ignore_errors=True)


@app.post("/analyze-text")
async def analyze_text(payload: dict):
    """Analiza código pegado como texto plano."""
    code = payload.get("code", "").strip()
    language = payload.get("language", "js")

    if not code:
        raise HTTPException(status_code=400, detail="No se recibió código.")

    project_key = "inline_code"
    temp_dir = f"temp_unzipped/{project_key}"
    os.makedirs(temp_dir, exist_ok=True)

    try:
        with open(os.path.join(temp_dir, f"code.{language}"), "w", encoding="utf-8") as f:
            f.write(code)

        return run_sonar_scan(temp_dir, project_key)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)