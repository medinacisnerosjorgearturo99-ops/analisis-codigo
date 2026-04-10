import httpx

from config import ANTHROPIC_API_KEY

_API_URL = "https://api.anthropic.com/v1/messages"
_MODEL = "claude-haiku-4-5"
_HEADERS = {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
}

_PROMPT_TEMPLATE = """\
Eres un ingeniero senior de software con experiencia en DevOps, calidad de código y buenas prácticas. \
Analiza los resultados de SonarQube para el proyecto '{project_key}'.

MÉTRICAS:
- Bugs: {bugs}
- Vulnerabilidades: {vulns}
- Code Smells: {smells}

ISSUES ENCONTRADOS:
{issues_text}

Responde con esta estructura exacta:

1. RESUMEN GENERAL (1-2 oraciones sobre el estado del proyecto desde perspectiva DevOps y calidad de código)

2. EVALUACIÓN (justifica brevemente cada puntuación):
   - Seguridad: X/10
   - Mantenibilidad: X/10
   - Escalabilidad: X/10
   - Limpieza del código: X/10

3. TOP 3 PROBLEMAS Y MEJORAS (incluye perspectiva de buenas prácticas, no solo DevOps):
   a) ...
   b) ...
   c) ...

4. PRIORIDAD DE ACCIÓN (qué resolver primero y por qué)

REGLAS: Sin fragmentos de código. Lenguaje claro y directo. Máximo 400 palabras.\
"""


def get_recommendations(stats: dict, issues: list[dict], project_key: str) -> str:
    if not ANTHROPIC_API_KEY:
        return ""

    issues_text = (
        "\n".join(
            f"- [{i['severidad']}] {i['tipo']} en {i['archivo']} "
            f"línea {i['linea']}: {i['mensaje']}"
            for i in issues
        )
        if issues
        else "No se encontraron issues detallados."
    )

    prompt = _PROMPT_TEMPLATE.format(
        project_key=project_key,
        bugs=stats.get("bugs", "0"),
        vulns=stats.get("vulnerabilities", "0"),
        smells=stats.get("code_smells", "0"),
        issues_text=issues_text,
    )

    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                _API_URL,
                headers=_HEADERS,
                json={
                    "model": _MODEL,
                    "max_tokens": 700,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            r.raise_for_status()
            return r.json()["content"][0]["text"]
    except httpx.HTTPStatusError as exc:
        print(f"⚠️ Error Claude API ({exc.response.status_code}): {exc.response.text}")
        return ""
    except Exception as exc:
        print(f"⚠️ Error general Claude: {exc}")
        return ""
