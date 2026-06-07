from sqlalchemy.orm import Session
from app.models.parking import Parking

import math

class ParkingService:
    @staticmethod
    def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371e3 # metres
        phi1 = lat1 * math.pi/180
        phi2 = lat2 * math.pi/180
        delta_phi = (lat2-lat1) * math.pi/180
        delta_lambda = (lon2-lon1) * math.pi/180

        a = math.sin(delta_phi/2) * math.sin(delta_phi/2) + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda/2) * math.sin(delta_lambda/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        return R * c

    @staticmethod
    def create_parking(db: Session, id_profile: int, name: str, base_hourly_rate: float, address: str = None, latitude: float = None, longitude: float = None):
        if latitude is not None and longitude is not None:
            existing_parkings = db.query(Parking).filter(Parking.is_active == True).all()
            for p in existing_parkings:
                if p.latitude is not None and p.longitude is not None:
                    dist = ParkingService.calculate_distance(latitude, longitude, float(p.latitude), float(p.longitude))
                    if dist <= 30:
                        raise ValueError(f"Ya existe una cochera ('{p.name}') en esta misma ubicación (radio de 30m).")
        
        db_parking = Parking(
            id_profile=id_profile,
            name=name,
            base_hourly_rate=base_hourly_rate,
            address=address,
            latitude=latitude,
            longitude=longitude,
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
    def update_parking(db: Session, id_parking: int, id_profile: int, name: str = None, base_hourly_rate: float = None, is_active: bool = None, address: str = None, latitude: float = None, longitude: float = None):
        db_parking = db.query(Parking).filter(Parking.id_parking == id_parking, Parking.id_profile == id_profile).first()
        if not db_parking:
            return None
        
        if name is not None:
            db_parking.name = name
        if base_hourly_rate is not None:
            db_parking.base_hourly_rate = base_hourly_rate
        if is_active is not None:
            db_parking.is_active = is_active
        if address is not None:
            db_parking.address = address
        if latitude is not None:
            db_parking.latitude = latitude
        if longitude is not None:
            db_parking.longitude = longitude
            
        db.commit()
        db.refresh(db_parking)
        return db_parking

    @staticmethod
    def delete_parking(db: Session, id_parking: int, id_profile: int, role: str = None):
        if role == "dev":
            db_parking = db.query(Parking).filter(Parking.id_parking == id_parking).first()
        else:
            db_parking = db.query(Parking).filter(Parking.id_parking == id_parking, Parking.id_profile == id_profile).first()
            
        if not db_parking:
            return None
        
        db_parking.is_active = False
        db.commit()
        return db_parking
