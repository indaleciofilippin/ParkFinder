from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle

class VehicleService:
    @staticmethod
    def create_vehicle(db: Session, id_profile: int, license_plate: str, model: str):
        # Verificar si la patente ya existe (en vehículos activos)
        existing = db.query(Vehicle).filter(Vehicle.license_plate == license_plate, Vehicle.is_active == True).first()
        if existing:
            raise ValueError(f"License plate {license_plate} is already registered")
            
        db_vehicle = Vehicle(
            id_profile=id_profile,
            license_plate=license_plate,
            model=model,
            is_active=True
        )
        db.add(db_vehicle)
        db.commit()
        db.refresh(db_vehicle)
        return db_vehicle

    @staticmethod
    def get_user_vehicles(db: Session, id_profile: int):
        return db.query(Vehicle).filter(Vehicle.id_profile == id_profile, Vehicle.is_active == True).all()

    @staticmethod
    def get_vehicle_by_id(db: Session, id_vehicle: int):
        return db.query(Vehicle).filter(Vehicle.id_vehicle == id_vehicle, Vehicle.is_active == True).first()

    @staticmethod
    def update_vehicle(db: Session, id_vehicle: int, id_profile: int, license_plate: str = None, model: str = None, is_active: bool = None):
        db_vehicle = db.query(Vehicle).filter(Vehicle.id_vehicle == id_vehicle, Vehicle.id_profile == id_profile).first()
        if not db_vehicle:
            return None
        
        if license_plate:
            # Verificar si la nueva patente ya existe en otro vehículo activo
            existing = db.query(Vehicle).filter(
                Vehicle.license_plate == license_plate, 
                Vehicle.is_active == True,
                Vehicle.id_vehicle != id_vehicle
            ).first()
            if existing:
                raise ValueError(f"License plate {license_plate} is already registered by another vehicle")
            db_vehicle.license_plate = license_plate
        if model:
            db_vehicle.model = model
        if is_active is not None:
            db_vehicle.is_active = is_active
            
        db.commit()
        db.refresh(db_vehicle)
        return db_vehicle

    @staticmethod
    def delete_vehicle(db: Session, id_vehicle: int, id_profile: int):
        db_vehicle = db.query(Vehicle).filter(Vehicle.id_vehicle == id_vehicle, Vehicle.id_profile == id_profile).first()
        if not db_vehicle:
            return None
        
        db_vehicle.is_active = False
        db.commit()
        return db_vehicle
