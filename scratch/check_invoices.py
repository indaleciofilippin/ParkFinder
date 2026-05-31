import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").split("?")[0] + "?sslmode=require"

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SET search_path TO parkfinder;")

print("INVOICES FOR BOOKING 1:")
cur.execute("SELECT id_invoice, payment_status, total_amount FROM invoice WHERE id_booking = 1;")
print(cur.fetchall())

print("\nPAYMENT TRANSACTIONS:")
cur.execute("""
SELECT t.id_transaction, t.id_invoice, t.status, t.gateway_reference 
FROM payment_transaction t 
JOIN invoice i ON t.id_invoice = i.id_invoice 
WHERE i.id_booking = 1;
""")
print(cur.fetchall())
