import os
import sys


def _require(name: str) -> str:
    """Lee una variable de entorno. Aborta el proceso si no está definida."""
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"[FATAL] Variable de entorno requerida no definida: {name}", file=sys.stderr)
        sys.exit(1)
    return value


def _optional(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


# --- Secretos críticos: el servidor no arranca sin ellos ---
JWT_SECRET: str = _require("JWT_SECRET")
DATABASE_URL: str = _require("DATABASE_URL")

# --- Integraciones opcionales ---
SONAR_TOKEN: str = _optional("SONAR_TOKEN")
SONAR_HOST_URL: str = _optional("SONAR_HOST_URL", "http://sonarqube:9000")
ANTHROPIC_API_KEY: str = _optional("ANTHROPIC_API_KEY")

# --- CORS: lista de orígenes permitidos (separados por coma) ---
_raw_origins = _optional("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS: list[str] = (
    ["*"] if _raw_origins == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

# --- Exclusiones de SonarQube ---
SONAR_EXCLUSIONS: str = ",".join([
    "**/node_modules/**", "**/.venv/**", "**/venv/**",
    "**/dist/**", "**/build/**", "**/.next/**",
    "**/.git/**", "**/coverage/**", "**/__pycache__/**",
    "**/*.min.js", "**/*.min.css",
])

SONAR_TEST_EXCLUSIONS: str = ",".join([
    "**/tests/**", "**/test/**", "**/*.test.*",
    "**/*.spec.*", "**/__tests__/**",
])
