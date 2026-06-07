import unittest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.controllers.parking_controller import create_parking, get_parkings, ParkingCreate
from app.models.parking import Parking

class TestParkingController(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.current_user = {"sub": "test@parkfinder.com", "role": "park", "id_profile": 1}

    @patch("app.controllers.parking_controller.ParkingService.create_parking")
    def test_create_parking(self, mock_create_parking):
        parking_data = ParkingCreate(
            name="Cochera Central",
            base_hourly_rate=150.0,
            address="Av Siempre Viva 123",
            latitude=-34.6,
            longitude=-58.4
        )
        expected_parking = Parking(
            id_parking=1,
            id_profile=1,
            name="Cochera Central",
            base_hourly_rate=150.0,
            address="Av Siempre Viva 123",
            latitude=-34.6,
            longitude=-58.4
        )
        mock_create_parking.return_value = expected_parking

        result = create_parking(parking=parking_data, db=self.db, id_profile=1)
        self.assertEqual(result.name, "Cochera Central")
        self.assertEqual(result.base_hourly_rate, 150.0)
        mock_create_parking.assert_called_once()

    @patch("app.controllers.parking_controller.SpaceCategoryService.get_parking_availability")
    @patch("app.controllers.parking_controller.ParkingService.get_user_parkings")
    def test_get_parkings(self, mock_get_user_parkings, mock_availability):
        expected_parking = Parking(
            id_parking=1,
            id_profile=1,
            name="Cochera Central",
            base_hourly_rate=150.0,
            address="Av Siempre Viva 123",
            latitude=-34.6,
            longitude=-58.4
        )
        mock_get_user_parkings.return_value = [expected_parking]
        mock_availability.return_value = {
            "total_capacity": 50,
            "total_occupied": 10,
            "total_available": 40,
            "categories": []
        }

        response = get_parkings(db=self.db, current_user=self.current_user)
        # response is a JSONResponse
        # However, checking the body structure
        body = __import__("json").loads(response.body.decode())
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["name"], "Cochera Central")
        self.assertEqual(body[0]["total_available"], 40)

if __name__ == "__main__":
    unittest.main()
