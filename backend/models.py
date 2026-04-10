<<<<<<< HEAD
from datetime import datetime, timezone
from functools import partial

_utcnow = partial(datetime.now, timezone.utc)

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

=======
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
>>>>>>> origin/main
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
<<<<<<< HEAD
    creado_en = Column(DateTime, default=_utcnow)
=======
    creado_en = Column(DateTime, default=datetime.utcnow)
>>>>>>> origin/main

    historial = relationship("Historial", back_populates="usuario")


class Historial(Base):
    __tablename__ = "historial"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    proyecto = Column(String, nullable=False)
<<<<<<< HEAD
    bugs = Column(Integer, default=0)
    vulnerabilidades = Column(Integer, default=0)
    code_smells = Column(Integer, default=0)
    ai_recomendaciones = Column(Text, default="")
    sonar_url = Column(String, default="")
    fecha = Column(DateTime, default=_utcnow)

    usuario = relationship("Usuario", back_populates="historial")
=======
    bugs = Column(String, default="0")
    vulnerabilidades = Column(String, default="0")
    code_smells = Column(String, default="0")
    ai_recomendaciones = Column(Text, default="")
    sonar_url = Column(String, default="")
    fecha = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="historial")
>>>>>>> origin/main
