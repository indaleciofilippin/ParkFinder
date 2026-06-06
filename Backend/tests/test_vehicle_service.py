import unittest
from unittest.mock import MagicMock
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.services.vehicle_service import VehicleService

class TestVehicleService(unittest.TestCase):
    """
    Unit tests for VehicleService following the AAA (Arrange, Act, Assert) pattern.
    """

    def setUp(self):
        # Arrange (Common setup)
        self.db = MagicMock(spec=Session)

    def test_create_vehicle_success(self):
        # Arrange
        id_profile = 1
        license_plate = "ABC-123"
        model = "Toyota Corolla"

        # Mock the query to return None (no existing active vehicle with this license plate)
        mock_query = self.db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.first.return_value = None

        # Act
        result = VehicleService.create_vehicle(
            db=self.db,
            id_profile=id_profile,
            license_plate=license_plate,
            model=model
        )

        # Assert
        self.assertIsNotNone(result)
        self.assertEqual(result.id_profile, id_profile)
        self.assertEqual(result.license_plate, license_plate)
        self.assertEqual(result.model, model)
        self.assertTrue(result.is_active)
        
        self.db.add.assert_called_once()
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(result)

    def test_create_vehicle_duplicate_license_plate(self):
        # Arrange
        id_profile = 1
        license_plate = "ABC-123"
        model = "Toyota Corolla"
        existing_vehicle = Vehicle(id_vehicle=10, id_profile=2, license_plate=license_plate, model="Honda Civic", is_active=True)

        # Mock the query to return an existing active vehicle
        mock_query = self.db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.first.return_value = existing_vehicle

        # Act & Assert
        with self.assertRaises(ValueError) as context:
            VehicleService.create_vehicle(
                db=self.db,
                id_profile=id_profile,
                license_plate=license_plate,
                model=model
            )

        self.assertIn("Ya tienes la patente ABC-123 registrada en tu cuenta", str(context.exception))
        self.db.add.assert_not_called()
        self.db.commit.assert_not_called()

    def test_get_user_vehicles(self):
        # Arrange
        id_profile = 1
        expected_vehicles = [
            Vehicle(id_vehicle=1, id_profile=id_profile, license_plate="ABC-123", model="Toyota", is_active=True),
            Vehicle(id_vehicle=2, id_profile=id_profile, license_plate="XYZ-789", model="Ford", is_active=True)
        ]

        # Mock query sequence
        mock_query = self.db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.all.return_value = expected_vehicles

        # Act
        result = VehicleService.get_user_vehicles(db=self.db, id_profile=id_profile)

        # Assert
        self.assertEqual(result, expected_vehicles)
        self.db.query.assert_called_once_with(Vehicle)

    def test_update_vehicle_success(self):
        # Arrange
        id_vehicle = 5
        id_profile = 1
        new_license_plate = "DEF-456"
        new_model = "Chevrolet Cruze"
        existing_vehicle = Vehicle(id_vehicle=id_vehicle, id_profile=id_profile, license_plate="ABC-123", model="Toyota", is_active=True)

        # Mock query for finding the vehicle
        mock_query = self.db.query.return_value
        mock_filter = mock_query.filter.return_value
        
        # We need two queries: one to find the vehicle, and one to verify no duplicates.
        # Let's set up a side effect or return values for first() calls
        mock_filter.first.side_effect = [existing_vehicle, None]

        # Act
        result = VehicleService.update_vehicle(
            db=self.db,
            id_vehicle=id_vehicle,
            id_profile=id_profile,
            license_plate=new_license_plate,
            model=new_model
        )

        # Assert
        self.assertIsNotNone(result)
        self.assertEqual(result.license_plate, new_license_plate)
        self.assertEqual(result.model, new_model)
        self.db.commit.assert_called_once()
        self.db.refresh.assert_called_once_with(existing_vehicle)

    def test_delete_vehicle_success(self):
        # Arrange
        id_vehicle = 5
        id_profile = 1
        existing_vehicle = Vehicle(id_vehicle=id_vehicle, id_profile=id_profile, license_plate="ABC-123", model="Toyota", is_active=True)

        # Mock query to find vehicle
        mock_query = self.db.query.return_value
        mock_filter = mock_query.filter.return_value
        mock_filter.first.return_value = existing_vehicle

        # Act
        result = VehicleService.delete_vehicle(db=self.db, id_vehicle=id_vehicle, id_profile=id_profile)

        # Assert
        self.assertIsNotNone(result)
        self.assertFalse(result.is_active)
        self.db.commit.assert_called_once()

if __name__ == "__main__":
    unittest.main()
