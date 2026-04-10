from pydantic import BaseModel, EmailStr, field_validator


class AuthPayload(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres.")
        return v


class RegisterPayload(AuthPayload):
    pass


class AnalyzeRepoPayload(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def url_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No se recibió URL.")
        if not (v.startswith("http") or v.startswith("git@")):
            raise ValueError("URL de repositorio no válida.")
        return v


class AnalyzeTextPayload(BaseModel):
    code: str
    language: str = "js"

    @field_validator("code")
    @classmethod
    def code_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("No se recibió código.")
        return v
