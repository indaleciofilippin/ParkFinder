from app.core.config import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("SELECT setval('parkfinder.role_id_role_seq', (SELECT MAX(id_role) FROM parkfinder.role));"))
    db.commit()
    print("Sequence fixed!")
except Exception as e:
    print("Error:", e)
finally:
    db.close()
