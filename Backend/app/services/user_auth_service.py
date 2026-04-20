from app.models.role import Role
from app.models.user_role import UserRole
from app.models.user_profile import UserProfile
from sqlalchemy.orm import Session
from app.models.user_auth import UserAuth
from typing import Optional


class UserAuthService:
    @staticmethod
    def get_all(db: Session):
        return db.query(UserAuth).all()

    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[UserAuth]:
        return db.query(UserAuth).filter(UserAuth.id_user_auth == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[UserAuth]:
        return db.query(UserAuth).filter(UserAuth.email == email).first()

    @staticmethod
    def register_user(db: Session, data):
        from app.controllers.auth_controller import get_password_hash
        try:
            hashed_password = get_password_hash(data.password) if data.password else None
            user = UserAuth(
                email=data.email,
                password=hashed_password,
                is_active=True,
                auth_provider=data.auth_provider,
                provider_id=data.provider_id
            )
            db.add(user)
            db.flush()

            role = db.query(Role).filter_by(name="driver").first()
            if not role:
                role = Role(name="driver")
                db.add(role)
                db.flush()

            user_role = UserRole(id_auth=user.id_user_auth, id_role=role.id_role)
            db.add(user_role)

            user_profile = UserProfile(
                id_auth=user.id_user_auth, 
                first_name=data.first_name, 
                last_name=data.last_name, 
                phone=None
            )
            db.add(user_profile)

            db.commit()
            db.refresh(user)
            return user
        except Exception as e:
            db.rollback()
            raise ValueError(f"Transaction failed: {str(e)}")
