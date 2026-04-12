"""Seed default RBAC users for local/demo environments."""

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User

# (email, full_name, plain_password, role) — always reconciled on startup so demo login works
# even if the database already contained other users from an earlier schema.
_DEMO_USERS: tuple[tuple[str, str, str, str], ...] = (
    ("admin@example.com", "Admin User", "Admin123!", "admin"),
    ("sales@example.com", "Sales User", "Sales123!", "sales"),
)


def ensure_seed_users() -> None:
    db: Session = SessionLocal()
    try:
        for email, full_name, plain, role in _DEMO_USERS:
            user = db.query(User).filter(User.email == email).one_or_none()
            if user is None:
                db.add(
                    User(
                        email=email,
                        full_name=full_name,
                        hashed_password=hash_password(plain),
                        role=role,
                    )
                )
            else:
                user.full_name = full_name
                user.role = role
                user.hashed_password = hash_password(plain)
        db.commit()
    finally:
        db.close()
