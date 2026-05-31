import unittest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.controllers.vehicle_controller import (
    create_vehicle,
    get_vehicles,
    get_vehicles_by_user,
    update_vehicle,
    delete_vehicle,
    VehicleCreate,
    VehicleUpdate
)

class TestVehicleController(unittest.TestCase):
    """
    Unit tests for VehicleController endpoints following the AAA pattern.
    """

    def setUp(self):
        # Arrange (Common Setup)
        self.db = MagicMock(spec=Session)
        self.id_profile = 1

    @patch("app.controllers.vehicle_controller.VehicleService.create_vehicle")
    def test_create_vehicle_endpoint_success(self, mock_create):
        # Arrange
        vehicle_in = VehicleCreate(license_plate="ABC-123", model="Toyota Corolla")
        expected_vehicle = Vehicle(id_vehicle=1, id_profile=self.id_profile, license_plate="ABC-123", model="Toyota Corolla", is_active=True)
        mock_create.return_value = expected_vehicle

        # Act
        result = create_vehicle(vehicle=vehicle_in, db=self.db, id_profile=self.id_profile)

        # Assert
        self.assertEqual(result, expected_vehicle)
        mock_create.assert_called_once_with(
            self.db,
            id_profile=self.id_profile,
            license_plate="ABC-123",
            model="Toyota Corolla"
        )

    @patch("app.controllers.vehicle_controller.VehicleService.create_vehicle")
    def test_create_vehicle_endpoint_value_error(self, mock_create):
        # Arrange
        vehicle_in = VehicleCreate(license_plate="ABC-123", model="Toyota Corolla")
        mock_create.side_effect = ValueError("License plate already registered")

        # Act & Assert
        with self.assertRaises(HTTPException) as context:
            create_vehicle(vehicle=vehicle_in, db=self.db, id_profile=self.id_profile)

        self.assertEqual(context.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(context.exception.detail, "License plate already registered")

    @patch("app.controllers.vehicle_controller.VehicleService.get_user_vehicles")
    def test_get_vehicles_endpoint_success(self, mock_get_user_vehicles):
        # Arrange
        expected_vehicles = [
            Vehicle(id_vehicle=1, id_profile=self.id_profile, license_plate="ABC-123", model="Toyota Corolla", is_active=True)
        ]
        mock_get_user_vehicles.return_value = expected_vehicles

        # Act
        result = get_vehicles(db=self.db, id_profile=self.id_profile)

        # Assert
        self.assertEqual(result, expected_vehicles)
        mock_get_user_vehicles.assert_called_once_with(self.db, id_profile=self.id_profile)

    @patch("app.controllers.vehicle_controller.VehicleService.update_vehicle")
    def test_update_vehicle_endpoint_success(self, mock_update):
        # Arrange
        id_vehicle = 5
        vehicle_in = VehicleUpdate(license_plate="DEF-456", model="Chevrolet Cruze", is_active=True)
        expected_vehicle = Vehicle(id_vehicle=id_vehicle, id_profile=self.id_profile, license_plate="DEF-456", model="Chevrolet Cruze", is_active=True)
        mock_update.return_value = expected_vehicle

        # Act
        result = update_vehicle(
            id_vehicle=id_vehicle,
            vehicle=vehicle_in,
            db=self.db,
            id_profile=self.id_profile
        )

        # Assert
        self.assertEqual(result, expected_vehicle)
        mock_update.assert_called_once_with(
            self.db,
            id_vehicle=id_vehicle,
            id_profile=self.id_profile,
            license_plate="DEF-456",
            model="Chevrolet Cruze",
            is_active=True
        )

    @patch("app.controllers.vehicle_controller.VehicleService.update_vehicle")
    def test_update_vehicle_endpoint_not_found(self, mock_update):
        # Arrange
        id_vehicle = 5
        vehicle_in = VehicleUpdate(license_plate="DEF-456", model="Chevrolet Cruze", is_active=True)
        mock_update.return_value = None

        # Act & Assert
        with self.assertRaises(HTTPException) as context:
            update_vehicle(
                id_vehicle=id_vehicle,
                vehicle=vehicle_in,
                db=self.db,
                id_profile=self.id_profile
            )

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(context.exception.detail, "Vehicle not found or not owned by user")

    @patch("app.controllers.vehicle_controller.VehicleService.delete_vehicle")
    def test_delete_vehicle_endpoint_success(self, mock_delete):
        # Arrange
        id_vehicle = 5
        expected_vehicle = Vehicle(id_vehicle=id_vehicle, id_profile=self.id_profile, license_plate="ABC-123", model="Toyota Corolla", is_active=False)
        mock_delete.return_value = expected_vehicle

        # Act
        result = delete_vehicle(id_vehicle=id_vehicle, db=self.db, id_profile=self.id_profile)

        # Assert
        self.assertEqual(result, {"msg": "Vehicle deleted successfully"})
        mock_delete.assert_called_once_with(self.db, id_vehicle=id_vehicle, id_profile=self.id_profile)

if __name__ == "__main__":
    unittest.main()
