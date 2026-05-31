from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
sys.path.append('/Users/indalecio/adm_proyetos/ParkFinder/Backend')
from app.database import SQLALCHEMY_DATABASE_URL
from app.models.payment_transaction import PaymentTransaction
from app.models.booking import Booking
from app.models.invoice import Invoice

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

txs = db.query(PaymentTransaction, Invoice, Booking).join(Invoice, PaymentTransaction.id_invoice == Invoice.id_invoice).join(Booking, Invoice.id_booking == Booking.id_booking).all()
for tx, inv, bk in txs:
    print(f"Profile: {bk.id_profile}, Booking: {bk.id_booking}, TX: {tx.id_transaction}, Ref: {tx.gateway_reference}")
