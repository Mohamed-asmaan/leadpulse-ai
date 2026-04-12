from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.schemas.verify import DocumentVerifyIn, DocumentVerifyOut
from app.services.verification import verify_signed_metadata

router = APIRouter(prefix="/verify", tags=["Verification"])


@router.post(
    "/document",
    response_model=DocumentVerifyOut,
    dependencies=[Depends(require_admin)],
)
def verify_document(payload: DocumentVerifyIn) -> DocumentVerifyOut:
    result = verify_signed_metadata(payload.metadata, payload.signature_hex)
    return DocumentVerifyOut(
        authentic=bool(result["authentic"]),
        analysis_notes=str(result["analysis_notes"]),
        expected_signature=str(result["expected_signature"]),
    )
