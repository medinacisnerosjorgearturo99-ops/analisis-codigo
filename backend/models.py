from datetime import datetime, timezone
from functools import partial

_utcnow = partial(datetime.now, timezone.utc)

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    creado_en = Column(DateTime, default=_utcnow)

    historial = relationship("Historial", back_populates="usuario")


class Historial(Base):
    __tablename__ = "historial"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    proyecto = Column(String, nullable=False)
    bugs = Column(Integer, default=0)
    vulnerabilidades = Column(Integer, default=0)
    code_smells = Column(Integer, default=0)
    ai_recomendaciones = Column(Text, default="")
    sonar_url = Column(String, default="")
    fecha = Column(DateTime, default=_utcnow)

    usuario = relationship("Usuario", back_populates="historial")