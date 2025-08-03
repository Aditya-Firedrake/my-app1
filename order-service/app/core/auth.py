from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status, Header
import httpx
from app.core.config import settings


async def get_current_user_id(
    authorization: str = Header(...)
) -> Optional[UUID]:
    """Get current user ID from JWT token"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            return None
        
        token = authorization.replace("Bearer ", "")
        
        # Validate token with User Service
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.USER_SERVICE_URL}/api/users/validate",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("valid") and data.get("userId"):
                    return UUID(data["userId"])
        
        return None
    except Exception:
        return None


async def require_auth(
    user_id: Optional[UUID] = Depends(get_current_user_id)
) -> UUID:
    """Require authentication - raises 401 if not authenticated"""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user_id 