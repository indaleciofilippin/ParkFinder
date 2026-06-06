from pydantic_settings import BaseSettings
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

class Settings(BaseSettings):
    app_name: str = "ParkFinder"
    environment: str = "development"
    class Config:
        env_file = ".env"

settings = Settings()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    testing_val = os.getenv("TESTING", "")
    if testing_val and testing_val.lower() not in ("0", "false", "no", "off"):
        DATABASE_URL = "sqlite:///:memory:"
    else:
        raise ValueError("DATABASE_URL environment variable not set")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Asegurar que el esquema parkfinder exista e inicializar si no es testing
if not os.getenv("TESTING"):
    if engine.dialect.name == 'postgresql':
        with engine.begin() as connection:
            connection.execute(text("CREATE SCHEMA IF NOT EXISTS parkfinder"))
            connection.execute(text("SET search_path TO parkfinder"))

    with engine.connect() as connection:
        # Migración manual para parking (ubicación)
        try:
            connection.execute(text("ALTER TABLE parking ADD COLUMN IF NOT EXISTS address VARCHAR(200)"))
        except Exception:
            pass
        try:
            connection.execute(text("ALTER TABLE parking ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8)"))
        except Exception:
            pass
        try:
            connection.execute(text("ALTER TABLE parking ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8)"))
        except Exception:
            pass

        # Migración manual para space_category
        try:
            connection.execute(text("ALTER TABLE space_category ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 0"))
        except Exception:
            pass
        try:
            connection.execute(text("ALTER TABLE space_category ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
        except Exception:
            pass
        
        # Migración para permitir patentes duplicadas si están inactivas
        try:
            connection.execute(text("ALTER TABLE vehicle DROP CONSTRAINT IF EXISTS vehicle_license_plate_key"))
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS vehicle_active_license_plate_idx ON vehicle (license_plate) WHERE (is_active = True)"))
        except Exception:
            pass
            
        connection.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

