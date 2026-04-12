from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.users import UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)) -> list[UserOut]:
    rows = db.query(User).order_by(User.created_at.asc()).all()
    return [UserOut.model_validate(u) for u in rows]
