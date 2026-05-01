from sqlalchemy.orm import Session
from app.models.parking import Parking

class ParkingService:
    @staticmethod
    def create_parking(db: Session, id_profile: int, name: str, base_hourly_rate: float):
        db_parking = Parking(
            id_profile=id_profile,
            name=name,
            base_hourly_rate=base_hourly_rate,
            is_active=True
        )
        db.add(db_parking)
        db.commit()
        db.refresh(db_parking)
        return db_parking

    @staticmethod
    def get_user_parkings(db: Session, id_profile: int):
        return db.query(Parking).filter(Parking.id_profile == id_profile, Parking.is_active == True).all()

    @staticmethod
    def get_parking_by_id(db: Session, id_parking: int):
        return db.query(Parking).filter(Parking.id_parking == id_parking, Parking.is_active == True).first()

    @staticmethod
    def update_parking(db: Session, id_parking: int, id_profile: int, name: str = None, base_hourly_rate: float = None, is_active: bool = None):
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking, Parking.id_profile == id_profile).first()
        if not db_parking:
            return None
        
        if name:
            db_parking.name = name
        if base_hourly_rate is not None:
            db_parking.base_hourly_rate = base_hourly_rate
        if is_active is not None:
            db_parking.is_active = is_active
            
        db.commit()
        db.refresh(db_parking)
        return db_parking

    @staticmethod
    def delete_parking(db: Session, id_parking: int, id_profile: int):
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking, Parking.id_profile == id_profile).first()
        if not db_parking:
            return None
        
        db_parking.is_active = False
        db.commit()
        return db_parking
