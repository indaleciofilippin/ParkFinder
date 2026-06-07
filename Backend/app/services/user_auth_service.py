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

            role = db.query(Role).filter_by(name=data.role).first()
            if not role:
                role = Role(name=data.role)
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

    @staticmethod
    def update_user(db: Session, user_id: int, data):
        from app.controllers.auth_controller import get_password_hash
        user = db.query(UserAuth).filter(UserAuth.id_user_auth == user_id).first()
        if not user:
            return None
        
        try:
            if hasattr(data, 'email') and data.email:
                user.email = data.email
            if hasattr(data, 'is_active') and data.is_active is not None:
                user.is_active = data.is_active
            if hasattr(data, 'password') and data.password:
                user.password = get_password_hash(data.password)
            
            # Actualizar Perfil
            profile = db.query(UserProfile).filter_by(id_auth=user_id).first()
            if profile:
                # Extraer datos de la raíz o del objeto 'profile' si existe
                f_name = data.first_name
                l_name = data.last_name
                phone = data.phone
                cbu = data.cbu_cvu
                alias = data.bank_alias
                cuit_val = data.cuit
                
                if data.profile:
                    if data.profile.first_name: f_name = data.profile.first_name
                    if data.profile.last_name: l_name = data.profile.last_name
                    if data.profile.phone: phone = data.profile.phone
                    if hasattr(data.profile, 'cbu_cvu') and data.profile.cbu_cvu: cbu = data.profile.cbu_cvu
                    if hasattr(data.profile, 'bank_alias') and data.profile.bank_alias: alias = data.profile.bank_alias
                    if hasattr(data.profile, 'cuit') and data.profile.cuit: cuit_val = data.profile.cuit

                if f_name is not None: profile.first_name = f_name
                if l_name is not None: profile.last_name = l_name
                if phone is not None: profile.phone = phone
                if cbu is not None: profile.cbu_cvu = cbu
                if alias is not None: profile.bank_alias = alias
                if cuit_val is not None: profile.cuit = cuit_val
            
            # Actualizar Rol si es necesario
            if hasattr(data, 'role') and data.role:
                role = db.query(Role).filter_by(name=data.role).first()
                if not role:
                    role = Role(name=data.role)
                    db.add(role)
                    db.flush()
                
                user_role = db.query(UserRole).filter_by(id_auth=user_id).first()
                if user_role:
                    user_role.id_role = role.id_role
                else:
                    db.add(UserRole(id_auth=user_id, id_role=role.id_role))

            db.commit()
            db.refresh(user)
            return user
        except Exception as e:
            db.rollback()
            raise ValueError(f"Update failed: {str(e)}")

    @staticmethod
    def delete_user(db: Session, user_id: int):
        user = db.query(UserAuth).filter(UserAuth.id_user_auth == user_id).first()
        if not user:
            return None
        
        user.is_active = False
        db.commit()
        return user
