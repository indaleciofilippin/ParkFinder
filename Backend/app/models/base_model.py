from pydantic import BaseModel
from typing import Optional

# Base Model representing a generic entity
# You can replace this with SQLAlchemy models later if a DB is introduced
class BaseEntity(BaseModel):
    id: Optional[int] = None
    created_at: str
    updated_at: str
