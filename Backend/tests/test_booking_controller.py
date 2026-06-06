import unittest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.controllers.booking_controller import (
    create_booking,
    update_status,
    BookingCreate
)
from datetime import datetime

class TestBookingController(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.current_user = {"sub": "test@parkfinder.com", "role": "user", "id_profile": 1}

    @patch("app.controllers.booking_controller.BookingService.create_booking")
    def test_create_booking(self, mock_create):
        booking_data = BookingCreate(
            id_parking=1,
            id_vehicle=1,
            id_category=1,
            expected_start_time=datetime.now(),
            expected_end_time=datetime.now(),
            card_token="tok_123",
            payment_method_id="visa"
        )
        mock_booking = MagicMock()
        mock_booking.id_booking = 100
        mock_create.return_value = mock_booking

        result = create_booking(booking=booking_data, db=self.db, current_user=self.current_user)
        self.assertEqual(result.id_booking, 100)
        mock_create.assert_called_once()

    @patch("app.controllers.booking_controller.BookingService.update_booking_status")
    def test_cancel_booking(self, mock_update):
        mock_update.return_value = {"booking": MagicMock(id_booking=100, current_status="cancelled"), "message": "Reserva cancelada"}

        result = update_status(id_booking=100, new_status="cancelled", db=self.db, current_user=self.current_user)
        # Assuming the result is a dict because BookingService.update_booking_status returns {"booking": ..., "message": ...}
        self.assertEqual(result["booking"].current_status, "cancelled")
        mock_update.assert_called_once()

    @patch("app.controllers.booking_controller.BookingService.update_booking_status")
    def test_checkout_booking(self, mock_update):
        mock_update.return_value = {"booking": MagicMock(id_booking=100, current_status="completed"), "message": "Reserva completada"}

        result = update_status(id_booking=100, new_status="completed", db=self.db, current_user=self.current_user)
        self.assertEqual(result["booking"].current_status, "completed")
        mock_update.assert_called_once()

if __name__ == "__main__":
    unittest.main()
