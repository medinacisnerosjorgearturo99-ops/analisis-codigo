from sqlalchemy import create_engine
<<<<<<< HEAD
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

from config import DATABASE_URL
=======
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Usa la misma BD de PostgreSQL que ya tiene el proyecto
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://admin:adminpassword@postgres_db:5432/sonar"
)
>>>>>>> origin/main

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
<<<<<<< HEAD
        db.close()
=======
        db.close()
>>>>>>> origin/main
