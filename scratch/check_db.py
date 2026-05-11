import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT id_parking, name, base_hourly_rate FROM parkfinder.parking;")
    rows = cur.fetchall()
    print("--- PARKING TABLE CONTENT ---")
    for row in rows:
        print(f"ID: {row[0]} | Name: '{row[1]}' | Rate: {row[2]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
