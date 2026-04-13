import json
import os
import shutil
import subprocess

from sqlalchemy.orm import Session

import ai
import historial as historial_db
import sonar


def _event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _safe_project_key(raw: str) -> str:
    """Sanitiza la clave del proyecto eliminando caracteres peligrosos."""
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")
    return "".join(c for c in raw if c in allowed)[:100] or "proyecto"


def analyze_stream(
    source_path: str,
    project_key: str,
    usuario_payload: dict | None = None,
    db: Session | None = None,
):
    """Generador SSE que ejecuta el pipeline completo de análisis."""
    yield _event({"paso": 1, "mensaje": "🔍 Iniciando análisis...", "completado": False})

    yield _event({"paso": 2, "mensaje": "⚙️ Ejecutando SonarQube Scanner...", "completado": False})
    scanner_ok = sonar.run_scanner(source_path, project_key)

    if not scanner_ok:
        yield _event({"paso": 2, "mensaje": "❌ Error en SonarQube Scanner", "completado": True, "error": True})
        yield _event({"finalizado": True, "status": "error", "mensaje": "Falló el análisis de SonarQube."})
        return

    yield _event({"paso": 2, "mensaje": "✅ Scanner completado", "completado": True})
    yield _event({"paso": 3, "mensaje": "⏳ Procesando resultados en SonarQube...", "completado": False})
    sonar.wait_for_task(project_key)
    yield _event({"paso": 3, "mensaje": "✅ Resultados procesados", "completado": True})

    yield _event({"paso": 4, "mensaje": "📊 Obteniendo métricas...", "completado": False})
    stats = sonar.get_metrics(project_key)
    issues = sonar.get_issues(project_key)
    yield _event({"paso": 4, "mensaje": "✅ Métricas obtenidas", "completado": True})

    yield _event({"paso": 5, "mensaje": "🤖 Generando recomendaciones con IA...", "completado": False})
    ai_recomendaciones = ai.get_recommendations(stats, issues, project_key)
    yield _event({"paso": 5, "mensaje": "✅ Recomendaciones generadas", "completado": True})

    # ✅ FIX: usa la URL pública del servidor, no localhost
    sonar_url = sonar.dashboard_url(project_key)

    if usuario_payload and db:
        try:
            historial_db.save(
                db,
                usuario_payload["sub"],
                project_key,
                stats,
                ai_recomendaciones,
                sonar_url,
            )
        except Exception as exc:
            print(f"⚠️ Error guardando historial: {exc}")

    yield _event({
        "finalizado": True,
        "status": "success",
        "mensaje": f"Análisis de '{project_key}' completado.",
        "stats": stats,
        "ai_recomendaciones": ai_recomendaciones,
        "sonar_url": sonar_url,
    })


def clone_and_analyze(
    repo_url: str,
    usuario_payload: dict | None,
    db: Session | None,
):
    """Generador SSE para análisis de repositorios remotos."""
    repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
    project_key = _safe_project_key(repo_name)
    clone_path = f"temp_unzipped/{project_key}"

    yield _event({"paso": 1, "mensaje": "🔗 Clonando repositorio...", "completado": False})
    try:
        result = subprocess.run(
            ["git", "clone", "--depth=1", repo_url, clone_path],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            yield _event({"finalizado": True, "status": "error", "mensaje": f"No se pudo clonar: {result.stderr}"})
            return

        yield _event({"paso": 1, "mensaje": "✅ Repositorio clonado", "completado": True})
        yield from analyze_stream(clone_path, project_key, usuario_payload, db)

    except subprocess.TimeoutExpired:
        yield _event({"finalizado": True, "status": "error", "mensaje": "El repositorio tardó demasiado en clonarse."})
    except Exception as exc:
        yield _event({"finalizado": True, "status": "error", "mensaje": str(exc)})
    finally:
        if os.path.exists(clone_path):
            shutil.rmtree(clone_path, ignore_errors=True)