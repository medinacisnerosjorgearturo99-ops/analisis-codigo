import subprocess
import time

import httpx

from config import SONAR_HOST_URL, SONAR_TOKEN, SONAR_EXCLUSIONS, SONAR_TEST_EXCLUSIONS

_AUTH = (SONAR_TOKEN, "")


def _client() -> httpx.Client:
    return httpx.Client(auth=_AUTH, timeout=30)


def run_scanner(source_path: str, project_key: str) -> bool:
    """Ejecuta sonar-scanner. Retorna True si tuvo éxito."""
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
    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    for line in process.stdout:
        print(line, end="")
    process.wait()
    return process.returncode == 0


def wait_for_task(project_key: str, max_wait: int = 60) -> bool:
    """Espera a que SonarQube procese el análisis. Retorna True si SUCCESS."""
    url = f"{SONAR_HOST_URL}/api/ce/activity"
    with _client() as client:
        for _ in range(max_wait // 2):
            time.sleep(2)
            try:
                r = client.get(url, params={"component": project_key, "ps": 1})
                r.raise_for_status()
                tasks = r.json().get("tasks", [])
                if not tasks:
                    continue
                status = tasks[0].get("status")
                if status == "SUCCESS":
                    return True
                if status in ("FAILED", "CANCELLED"):
                    return False
            except Exception as exc:
                print(f"⚠️ Error consultando tarea Sonar: {exc}")
    return False


def get_metrics(project_key: str) -> dict:
    url = f"{SONAR_HOST_URL}/api/measures/component"
    params = {
        "component": project_key,
        "metricKeys": "bugs,vulnerabilities,code_smells",
    }
    try:
        with _client() as client:
            r = client.get(url, params=params)
            r.raise_for_status()
            measures = r.json().get("component", {}).get("measures", [])
            return {m["metric"]: m["value"] for m in measures}
    except Exception as exc:
        print(f"⚠️ Error obteniendo métricas Sonar: {exc}")
        return {}


def get_issues(project_key: str) -> list[dict]:
    url = f"{SONAR_HOST_URL}/api/issues/search"
    params = {"componentKeys": project_key, "ps": 10, "statuses": "OPEN"}
    try:
        with _client() as client:
            r = client.get(url, params=params)
            r.raise_for_status()
            return [
                {
                    "tipo": i.get("type", ""),
                    "severidad": i.get("severity", ""),
                    "mensaje": i.get("message", ""),
                    "archivo": i.get("component", "").split(":")[-1],
                    "linea": i.get("line", "?"),
                }
                for i in r.json().get("issues", [])
            ]
    except Exception as exc:
        print(f"⚠️ Error obteniendo issues Sonar: {exc}")
        return []
