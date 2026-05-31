import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MyBookingsScreen } from './MyBookingsScreen';
import { bookingApi } from '../../services/api';
import { Alert } from 'react-native';

// Mock booking API
jest.mock('../../services/api', () => ({
  bookingApi: {
    getMyBookings: jest.fn(),
    updateBookingStatus: jest.fn(),
  },
}));

// Mock Ionicons to avoid rendering issues
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement('View', { style }, children),
    SafeAreaProvider: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

describe('MyBookingsScreen - Unit Tests (AAA Pattern)', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  const sampleBookings = [
    {
      id_booking: 101,
      id_parking: 10,
      current_status: 'pending',
      expected_start_time: '2026-06-01T10:00:00Z',
      expected_end_time: '2026-06-01T12:00:00Z',
      applied_rate: 1500,
    },
    {
      id_booking: 102,
      id_parking: 12,
      current_status: 'completed',
      expected_start_time: '2026-05-25T14:00:00Z',
      expected_end_time: '2026-05-25T16:00:00Z',
      applied_rate: 1200,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should show ActivityIndicator while loading data', async () => {
    // 1. Arrange
    (bookingApi.getMyBookings as jest.Mock).mockReturnValue(new Promise(() => {}));

    // 2. Act
    const { UNSAFE_getByType } = render(<MyBookingsScreen navigation={mockNavigation} />);

    // 3. Assert
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  test('should render active bookings successfully after loading', async () => {
    // 1. Arrange
    (bookingApi.getMyBookings as jest.Mock).mockResolvedValue(sampleBookings);

    // 2. Act
    const { getByText, queryByText } = render(<MyBookingsScreen navigation={mockNavigation} />);

    // 3. Assert
    await waitFor(() => {
      expect(getByText('Reserva #101')).toBeTruthy();
      // Completed booking (history) shouldn't show under "Actuales" tab by default
      expect(queryByText('Reserva #102')).toBeNull();
    });
  });

  test('should toggle tabs and display past history bookings correctly', async () => {
    // 1. Arrange
    (bookingApi.getMyBookings as jest.Mock).mockResolvedValue(sampleBookings);
    const { getByText, queryByText } = render(<MyBookingsScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Reserva #101')).toBeTruthy();
    });

    const historyTab = getByText(/Historial/);

    // 2. Act
    fireEvent.press(historyTab);

    // 3. Assert
    await waitFor(() => {
      expect(queryByText('Reserva #101')).toBeNull();
      expect(getByText('Reserva #102')).toBeTruthy();
    });
  });

  test('should prompt Alert dialog when tapping cancel booking', async () => {
    // 1. Arrange
    (bookingApi.getMyBookings as jest.Mock).mockResolvedValue(sampleBookings);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<MyBookingsScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Cancelar Reserva')).toBeTruthy();
    });

    // 2. Act
    fireEvent.press(getByText('Cancelar Reserva'));

    // 3. Assert
    expect(alertSpy).toHaveBeenCalledWith(
      '¿Cancelar reserva?',
      expect.any(String),
      expect.any(Array)
    );
  });
});
