"""Manual dead lead detector command.

Run:
    python -m app.commands.detect_dead_leads
"""

from app.core.database import SessionLocal
from app.services.dead_leads import detect_dead_leads


def main() -> None:
    db = SessionLocal()
    try:
        marked = detect_dead_leads(db)
        print(f"Dead lead detector completed. Newly archived leads: {marked}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
