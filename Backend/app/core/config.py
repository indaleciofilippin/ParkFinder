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
    raise ValueError("DATABASE_URL environment variable not set")

engine = create_engine(DATABASE_URL)

# Asegurar que el esquema parkfinder exista
with engine.connect() as connection:
    connection.execute(text("CREATE SCHEMA IF NOT EXISTS parkfinder"))
    connection.commit()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
