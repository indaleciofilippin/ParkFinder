import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Clean URL parameters that crash psycopg2 raw parsing
cleaned_url = DATABASE_URL.split("?")[0] + "?sslmode=require"

try:
    conn = psycopg2.connect(cleaned_url)
    cur = conn.cursor()
    
    # Set search path manually
    cur.execute("SET search_path TO parkfinder;")
    
    cur.execute("SELECT id_parking, name, base_hourly_rate FROM parking;")
    rows = cur.fetchall()
    print("--- PARKING TABLE CONTENT ---")
    for row in rows:
        print(f"ID: {row[0]} | Name: '{row[1]}' | Rate: {row[2]}")
        
    cur.execute("SELECT id_vehicle, license_plate, model, is_active FROM vehicle;")
    v_rows = cur.fetchall()
    print("\n--- VEHICLE TABLE CONTENT ---")
    for r in v_rows:
        print(f"ID: {r[0]} | Plate: '{r[1]}' | Model: '{r[2]}' | Active: {r[3]}")
        
    cur.execute("SELECT id_booking, id_parking, id_vehicle, current_status, expected_start_time FROM booking;")
    b_rows = cur.fetchall()
    print("\n--- BOOKINGS CONTENT ---")
    for b in b_rows:
        print(f"ID: {b[0]} | Parking: {b[1]} | Vehicle ID: {b[2]} | Status: '{b[3]}' | Start: {b[4]}")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
