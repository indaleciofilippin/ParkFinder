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
    
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_transaction';")
    cols = cur.fetchall()
    print("--- COLUMNS OF payment_transaction ---")
    for col in cols:
        print(f"Name: {col[0]} | Type: {col[1]}")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
