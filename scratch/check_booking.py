import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").split("?")[0] + "?sslmode=require"

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SET search_path TO parkfinder;")

print("BOOKING 1:")
cur.execute("SELECT id_booking, current_status FROM booking WHERE id_booking = 1;")
print(cur.fetchall())
