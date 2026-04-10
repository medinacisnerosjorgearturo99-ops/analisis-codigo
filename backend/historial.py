from sqlalchemy.orm import Session

from models import Historial


def save(
    db: Session,
    usuario_id: int,
    proyecto: str,
    stats: dict,
    ai_recomendaciones: str,
    sonar_url: str,
) -> None:
    entry = Historial(
        usuario_id=usuario_id,
        proyecto=proyecto,
        bugs=int(stats.get("bugs", 0) or 0),
        vulnerabilidades=int(stats.get("vulnerabilities", 0) or 0),
        code_smells=int(stats.get("code_smells", 0) or 0),
        ai_recomendaciones=ai_recomendaciones,
        sonar_url=sonar_url,
    )
    db.add(entry)
    db.commit()


def list_for_user(db: Session, usuario_id: int, limit: int = 10) -> list[Historial]:
    return (
        db.query(Historial)
        .filter(Historial.usuario_id == usuario_id)
        .order_by(Historial.fecha.desc())
        .limit(limit)
        .all()
    )
