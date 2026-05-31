import { bookingApi, parkingApi } from './api';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(() => Promise.resolve('mock-access-token')),
  deleteItemAsync: jest.fn(),
}));

// Mock dynamic Expo Constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: '192.168.1.100:8081',
  },
}), { virtual: true });

describe('API Services - Unit Tests (AAA Pattern)', () => {
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on global fetch
    globalFetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    globalFetchSpy.mockRestore();
  });

  describe('bookingApi', () => {

    test('should fetch and return user bookings successfully', async () => {
      // 1. Arrange
      const mockBookings = [
        { id_booking: 1, id_parking: 10, current_status: 'pending', license_plate: 'AA111AA' },
        { id_booking: 2, id_parking: 12, current_status: 'active', license_plate: 'BB222BB' }
      ];

      globalFetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBookings),
      } as any);

      // 2. Act
      const result = await bookingApi.getMyBookings();

      // 3. Assert
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      expect(globalFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/bookings/me'),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
      expect(result).toEqual(mockBookings);
    });

    test('should throw error when fetching bookings fails', async () => {
      // 1. Arrange
      const mockErrorResponse = { detail: 'Unauthorized access token' };
      globalFetchSpy.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockErrorResponse),
      } as any);

      // 2. Act & Assert
      await expect(bookingApi.getMyBookings()).rejects.toThrow('No se pudieron obtener las reservas');
    });

  });

  describe('parkingApi', () => {

    test('should fetch and return all owner parkings successfully', async () => {
      // 1. Arrange
      const mockParkings = [
        { id_parking: 101, name: 'Cochera Centro', base_hourly_rate: 1500 },
        { id_parking: 102, name: 'Cochera Norte', base_hourly_rate: 1800 }
      ];

      globalFetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockParkings),
      } as any);

      // 2. Act
      const result = await parkingApi.getParkings();

      // 3. Assert
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      expect(globalFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/parkings/'),
        expect.any(Object)
      );
      expect(result).toEqual(mockParkings);
    });

    test('should register a new parking successfully', async () => {
      // 1. Arrange
      const newParkingPayload = { name: 'Cochera Oeste', base_hourly_rate: 1200 };
      const mockCreatedParking = { id_parking: 103, ...newParkingPayload };

      globalFetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreatedParking),
      } as any);

      // 2. Act
      const result = await parkingApi.createParking(newParkingPayload);

      // 3. Assert
      expect(globalFetchSpy).toHaveBeenCalledTimes(1);
      expect(globalFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/parkings/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newParkingPayload),
        })
      );
      expect(result).toEqual(mockCreatedParking);
    });

  });

});
