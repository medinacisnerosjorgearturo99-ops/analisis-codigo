from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from config import JWT_SECRET
from models import Usuario

_ALGORITHM = "HS256"
_TOKEN_DAYS = 7


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(usuario_id: int, email: str) -> str:
    payload = {
        "sub": usuario_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=_TOKEN_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=_ALGORITHM)


def decode_token(authorization: str = Header(None)) -> dict | None:
    """
    Decodifica el JWT del header Authorization.
    Retorna None si no hay token (acceso anónimo permitido).
    Lanza 401 si el token existe pero es inválido o expirado.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")


def require_token(authorization: str = Header(None)) -> dict:
    """Como decode_token pero lanza 401 si no hay token (endpoints protegidos)."""
    payload = decode_token(authorization)
    if payload is None:
        raise HTTPException(status_code=401, detail="Debes iniciar sesión.")
    return payload


def get_user_by_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()
