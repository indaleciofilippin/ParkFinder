import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").split("?")[0] + "?sslmode=require"

conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SET search_path TO parkfinder;")

# Insert invoice for booking 1
cur.execute("""
    INSERT INTO invoice (subtotal_parking, service_fee, total_amount, platform_revenue, payment_status, issued_at, id_booking)
    VALUES (0.00, 0.00, 0.00, 0.00, 'pending', NOW(), 1)
    RETURNING id_invoice;
""")
invoice_id = cur.fetchone()[0]

# Insert payment transaction
gateway_ref = "3427495879-BIr7U4ztrtCtY1|1779818979233|visa"
cur.execute("""
    INSERT INTO payment_transaction (id_invoice, gateway_reference, payment_method, amount_attempted, status, attempted_at)
    VALUES (%s, %s, 'visa', 0.00, 'pending', NOW());
""", (invoice_id, gateway_ref))

conn.commit()
print("✅ Fixed DB for Booking 1")
cur.close()
conn.close()
