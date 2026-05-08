from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.space_category import SpaceCategory
from app.models.booking import Booking
from datetime import datetime, timezone, timedelta
from typing import List, Optional

# Definir Timezone de Buenos Aires (GMT-3) - Consistente con BookingService
BA_TZ = timezone(timedelta(hours=-3))

class SpaceCategoryService:
    @staticmethod
    def create_category(db: Session, id_parking: int, name: str, max_capacity: int, price_multiplier: float):
        db_category = SpaceCategory(
            id_parking=id_parking,
            name=name,
            max_capacity=max_capacity,
            price_multiplier=price_multiplier,
            is_active=True
        )
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        return db_category

    @staticmethod
    def get_categories_by_parking(db: Session, id_parking: int):
        return db.query(SpaceCategory).filter(
            SpaceCategory.id_parking == id_parking, 
            SpaceCategory.is_active == True
        ).all()

    @staticmethod
    def update_category(db: Session, id_category: int, name: str = None, max_capacity: int = None, price_multiplier: float = None, is_active: bool = None):
        db_category = db.query(SpaceCategory).filter(SpaceCategory.id_category == id_category).first()
        if not db_category:
            return None
        
        if name:
            db_category.name = name
        if max_capacity is not None:
            db_category.max_capacity = max_capacity
        if price_multiplier is not None:
            db_category.price_multiplier = price_multiplier
        if is_active is not None:
            db_category.is_active = is_active
            
        db.commit()
        db.refresh(db_category)
        return db_category

    @staticmethod
    def delete_category(db: Session, id_category: int):
        db_category = db.query(SpaceCategory).filter(SpaceCategory.id_category == id_category).first()
        if not db_category:
            return None
        
        db_category.is_active = False
        db.commit()
        return db_category

    @staticmethod
    def get_parking_availability(db: Session, id_parking: int):
        now = datetime.now(BA_TZ)
        categories = db.query(SpaceCategory).filter(
            SpaceCategory.id_parking == id_parking,
            SpaceCategory.is_active == True
        ).all()
        
        results = []
        total_capacity = 0
        total_occupied = 0
        
        for cat in categories:
            # Contar reservas activas o pendientes que se solapan con 'ahora'
            occupied_count = db.query(Booking).filter(
                Booking.id_category == cat.id_category,
                Booking.current_status.in_(["pending", "active"]),
                and_(
                    Booking.expected_start_time <= now,
                    Booking.expected_end_time >= now
                )
            ).count()
            
            available = max(0, cat.max_capacity - occupied_count)
            
            results.append({
                "id_category": cat.id_category,
                "name": cat.name,
                "max_capacity": cat.max_capacity,
                "occupied": occupied_count,
                "available": available,
                "price_multiplier": float(cat.price_multiplier)
            })
            
            total_capacity += cat.max_capacity
            total_occupied += occupied_count
            
        return {
            "id_parking": id_parking,
            "total_capacity": total_capacity,
            "total_occupied": total_occupied,
            "total_available": max(0, total_capacity - total_occupied),
            "categories": results
        }
    @staticmethod
    def get_monitoring_data(db: Session, id_parking: int):
        now = datetime.now(BA_TZ)
        categories = db.query(SpaceCategory).filter(
            SpaceCategory.id_parking == id_parking,
            SpaceCategory.is_active == True
        ).all()
        
        results = []
        total_capacity = 0
        total_active = 0
        total_pending = 0
        
        for cat in categories:
            # Active bookings: vehicles currently in the parking lot
            active_count = db.query(Booking).filter(
                Booking.id_category == cat.id_category,
                Booking.current_status == "active"
            ).count()

            # Pending bookings: reservations that should be active now but haven't checked in yet
            pending_count = db.query(Booking).filter(
                Booking.id_category == cat.id_category,
                Booking.current_status == "pending",
                and_(
                    Booking.expected_start_time <= now,
                    Booking.expected_end_time >= now
                )
            ).count()
            
            total_capacity += cat.max_capacity
            total_active += active_count
            total_pending += pending_count
            
            results.append({
                "id_category": cat.id_category,
                "name": cat.name,
                "max_capacity": cat.max_capacity,
                "active_occupancy": active_count,
                "pending_reservations": pending_count,
                "available_spaces": max(0, cat.max_capacity - active_count - pending_count)
            })
            
        return {
            "id_parking": id_parking,
            "timestamp": now.isoformat(),
            "total_capacity": total_capacity,
            "total_active": total_active,
            "total_pending": total_pending,
            "total_available": max(0, total_capacity - total_active - total_pending),
            "categories": results
        }
