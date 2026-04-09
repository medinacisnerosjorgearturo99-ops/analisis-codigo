from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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

# --- CONFIGURACIÓN ---
SONAR_TOKEN = os.environ.get("SONAR_TOKEN", "")
SONAR_HOST_URL = os.environ.get("SONAR_HOST_URL", "http://sonarqube:9000")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

SONAR_EXCLUSIONS = ",".join([
    "**/node_modules/**", "**/.venv/**", "**/venv/**",
    "**/dist/**", "**/build/**", "**/.next/**",
    "**/.git/**", "**/coverage/**", "**/__pycache__/**",
    "**/*.min.js", "**/*.min.css",
])

SONAR_TEST_EXCLUSIONS = ",".join([
    "**/tests/**", "**/test/**", "**/*.test.*",
    "**/*.spec.*", "**/__tests__/**",
])


# ─────────────────────────────────────────────
# UTILIDADES SONARQUBE
# ─────────────────────────────────────────────

def wait_for_sonar_task(project_key: str, max_wait: int = 60) -> bool:
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


def get_sonar_issues(project_key: str) -> list:
    try:
        auth = base64.b64encode(f"{SONAR_TOKEN}:".encode()).decode()
        url = (
            f"{SONAR_HOST_URL}/api/issues/search"
            f"?componentKeys={project_key}&ps=10&statuses=OPEN"
        )
        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Basic {auth}")
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            issues = data.get("issues", [])
            return [
                {
                    "tipo": i.get("type", ""),
                    "severidad": i.get("severity", ""),
                    "mensaje": i.get("message", ""),
                    "archivo": i.get("component", "").split(":")[-1],
                    "linea": i.get("line", "?"),
                }
                for i in issues
            ]
    except Exception as e:
        print(f"⚠️ Error obteniendo issues: {e}")
        return []


# ─────────────────────────────────────────────
# INTEGRACIÓN CON CLAUDE
# ─────────────────────────────────────────────

def get_ai_recommendations(stats: dict, issues: list, project_key: str) -> str:
    if not ANTHROPIC_API_KEY:
        return ""

    bugs = stats.get("bugs", "0")
    vulns = stats.get("vulnerabilities", "0")
    smells = stats.get("code_smells", "0")

    issues_text = "\n".join([
        f"- [{i['severidad']}] {i['tipo']} en {i['archivo']} línea {i['linea']}: {i['mensaje']}"
        for i in issues
    ]) if issues else "No se encontraron issues detallados."

    prompt = f"""Eres un experto en calidad de software y DevOps. Analiza los siguientes resultados de SonarQube para el proyecto '{project_key}' y proporciona recomendaciones claras y prácticas en español.

MÉTRICAS:
- Bugs: {bugs}
- Vulnerabilidades: {vulns}
- Code Smells: {smells}

ISSUES ENCONTRADOS:
{issues_text}

Por favor responde con:
1. Un resumen breve del estado general del código (1-2 oraciones)
2. Los 3 problemas más importantes a resolver y cómo solucionarlos
3. Una recomendación final de prioridad (qué arreglar primero)

Sé conciso, práctico y usa lenguaje claro. Máximo 250 palabras."""

    try:
        payload = json.dumps({
            "model": "claude-haiku-4-5",
            "max_tokens": 500,
            "messages": [{"role": "user", "content": prompt}]
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            method="POST"
        )

        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            return data["content"][0]["text"]

    except urllib.error.HTTPError as e:
        print(f"⚠️ Error Claude: {e.code} - {e.read().decode()}")
        return ""
    except Exception as e:
        print(f"⚠️ Error general Claude: {e}")
        return ""


# ─────────────────────────────────────────────
# SSE — GENERADOR DE PROGRESO EN TIEMPO REAL
# ─────────────────────────────────────────────

def sse_event(data: dict) -> str:
    """Formatea un evento SSE."""
    return f"data: {json.dumps(data)}\n\n"


def run_sonar_scan_stream(source_path: str, project_key: str):
    """Generador que hace el análisis y va enviando el progreso por SSE."""

    # Paso 1
    yield sse_event({"paso": 1, "mensaje": "🔍 Iniciando análisis...", "completado": False})

    cmd = [
        "sonar-scanner",
        f"-Dsonar.projectKey={project_key}",
        f"-Dsonar.sources={source_path}",
        f"-Dsonar.host.url={SONAR_HOST_URL}",
        f"-Dsonar.login={SONAR_TOKEN}",
        f"-Dsonar.exclusions={SONAR_EXCLUSIONS}",
        f"-Dsonar.test.exclusions={SONAR_TEST_EXCLUSIONS}",
        "-Dsonar.scm.disabled=true",
        "-Dsonar.coverage.exclusions=**/*",
        "-Dsonar.sourceEncoding=UTF-8",
        "-Dsonar.javascript.node.maxspace=256",
    ]

    # Paso 2
    yield sse_event({"paso": 2, "mensaje": "⚙️ Ejecutando SonarQube Scanner...", "completado": False})

    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    for line in process.stdout:
        print(line, end="")
    process.wait()

    if process.returncode != 0:
        yield sse_event({"paso": 2, "mensaje": "❌ Error en SonarQube Scanner", "completado": True, "error": True})
        yield sse_event({"finalizado": True, "status": "error", "mensaje": "Fallo en el análisis de SonarQube."})
        return

    yield sse_event({"paso": 2, "mensaje": "✅ Scanner completado", "completado": True})

    # Paso 3
    yield sse_event({"paso": 3, "mensaje": "⏳ Procesando resultados en SonarQube...", "completado": False})
    wait_for_sonar_task(project_key)
    yield sse_event({"paso": 3, "mensaje": "✅ Resultados procesados", "completado": True})

    # Paso 4
    yield sse_event({"paso": 4, "mensaje": "📊 Obteniendo métricas...", "completado": False})
    stats = get_sonar_metrics(project_key)
    issues = get_sonar_issues(project_key)
    yield sse_event({"paso": 4, "mensaje": "✅ Métricas obtenidas", "completado": True})

    # Paso 5
    yield sse_event({"paso": 5, "mensaje": "🤖 Generando recomendaciones con IA...", "completado": False})
    ai_recomendaciones = get_ai_recommendations(stats, issues, project_key)
    yield sse_event({"paso": 5, "mensaje": "✅ Recomendaciones generadas", "completado": True})

    # Resultado final
    yield sse_event({
        "finalizado": True,
        "status": "success",
        "mensaje": f"Análisis de '{project_key}' completado.",
        "stats": stats,
        "ai_recomendaciones": ai_recomendaciones,
        "sonar_url": f"http://localhost:9000/dashboard?id={project_key}",
    })


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
    os.makedirs("temp_uploads", exist_ok=True)
    os.makedirs("temp_unzipped", exist_ok=True)

    project_key = os.path.splitext(file.filename)[0]
    file_location = f"temp_uploads/{file.filename}"
    extract_path = f"temp_unzipped/{project_key}"

    try:
        # Paso 1: guardar y descomprimir ANTES de hacer streaming
        with open(file_location, "wb+") as f:
            shutil.copyfileobj(file.file, f)
        with zipfile.ZipFile(file_location, "r") as zip_ref:
            zip_ref.extractall(extract_path)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="El archivo no es un ZIP válido.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)

    def stream():
        yield sse_event({"paso": 1, "mensaje": "✅ Archivo descomprimido", "completado": True})
        yield from run_sonar_scan_stream(extract_path, project_key)
        if os.path.exists(extract_path):
            shutil.rmtree(extract_path, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/analyze-repo")
async def analyze_repo(payload: dict):
    repo_url = payload.get("url", "").strip()
    if not repo_url:
        raise HTTPException(status_code=400, detail="No se recibió URL.")
    if not (repo_url.startswith("http") or repo_url.startswith("git@")):
        raise HTTPException(status_code=400, detail="URL de repositorio no válida.")

    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    project_key = repo_name
    clone_path = f"temp_unzipped/{project_key}"

    def stream():
        yield sse_event({"paso": 1, "mensaje": "🔗 Clonando repositorio...", "completado": False})
        try:
            result = subprocess.run(
                ["git", "clone", "--depth=1", repo_url, clone_path],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode != 0:
                yield sse_event({"finalizado": True, "status": "error", "mensaje": f"No se pudo clonar: {result.stderr}"})
                return

            yield sse_event({"paso": 1, "mensaje": "✅ Repositorio clonado", "completado": True})
            yield from run_sonar_scan_stream(clone_path, project_key)

        except subprocess.TimeoutExpired:
            yield sse_event({"finalizado": True, "status": "error", "mensaje": "El repositorio tardó demasiado."})
        except Exception as e:
            yield sse_event({"finalizado": True, "status": "error", "mensaje": str(e)})
        finally:
            if os.path.exists(clone_path):
                shutil.rmtree(clone_path, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.post("/analyze-text")
async def analyze_text(payload: dict):
    code = payload.get("code", "").strip()
    language = payload.get("language", "js")
    if not code:
        raise HTTPException(status_code=400, detail="No se recibió código.")

    project_key = "inline_code"
    temp_dir = f"temp_unzipped/{project_key}"
    os.makedirs(temp_dir, exist_ok=True)

    def stream():
        try:
            with open(os.path.join(temp_dir, f"code.{language}"), "w", encoding="utf-8") as f:
                f.write(code)
            yield sse_event({"paso": 1, "mensaje": "✅ Código recibido", "completado": True})
            yield from run_sonar_scan_stream(temp_dir, project_key)
        except Exception as e:
            yield sse_event({"finalizado": True, "status": "error", "mensaje": str(e)})
        finally:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    return StreamingResponse(stream(), media_type="text/event-stream")