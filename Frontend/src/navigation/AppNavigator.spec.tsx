import React from 'react';
import { render } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';

// Mock all screens to keep the test environment minimal and focused on routing registration
jest.mock('../screens/main/HomeScreen', () => ({ HomeScreen: () => null }));
jest.mock('../screens/main/ProfileScreen', () => ({ ProfileScreen: () => null }));
jest.mock('../screens/main/AdminDashboardScreen', () => ({ AdminDashboardScreen: () => null }));
jest.mock('../screens/main/MapSearchScreen', () => ({ MapSearchScreen: () => null }));
jest.mock('../screens/main/OwnerParkingMapScreen', () => ({ OwnerParkingMapScreen: () => null }));
jest.mock('../screens/main/FindParkingScreen', () => ({ FindParkingScreen: () => null }));
jest.mock('../screens/main/CreateBookingScreen', () => ({ CreateBookingScreen: () => null }));
jest.mock('../screens/main/MyBookingsScreen', () => ({ MyBookingsScreen: () => null }));
jest.mock('../screens/main/OwnerBookingsScreen', () => ({ OwnerBookingsScreen: () => null }));
jest.mock('../screens/main/OwnerEarningsScreen', () => ({ OwnerEarningsScreen: () => null }));
jest.mock('../screens/main/ManageParkingScreen', () => ({ ManageParkingScreen: () => null }));
jest.mock('../screens/main/MyParkingsScreen', () => ({ MyParkingsScreen: () => null }));
jest.mock('../screens/main/BarrierSimulatorScreen', () => ({ BarrierSimulatorScreen: () => null }));
jest.mock('../screens/main/RealtimeOccupancyScreen', () => ({ RealtimeOccupancyScreen: () => null }));

// Mock createNativeStackNavigator to spy on registered routes
jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  const mockNavigator = jest.fn(({ children }: any) => React.createElement(React.Fragment, null, children));
  const mockScreen = jest.fn(() => null);
  
  return {
    createNativeStackNavigator: jest.fn(() => ({
      Navigator: mockNavigator,
      Screen: mockScreen,
    })),
  };
});

import { createNativeStackNavigator } from '@react-navigation/native-stack';

describe('AppNavigator - Unit Tests (AAA Pattern)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should register all main application routes inside the stack navigator', () => {
    // 1. Arrange & Act
    render(<AppNavigator />);
    
    // Extract mock components from the mocked navigator instance
    const Stack = createNativeStackNavigator();

    // 2. Assert
    expect(Stack.Navigator).toHaveBeenCalledTimes(1);
    
    // Check that we registered key routes
    const registeredScreenNames = (Stack.Screen as jest.Mock).mock.calls.map((call: any) => call[0].name);
    
    expect(registeredScreenNames).toContain('Home');
    expect(registeredScreenNames).toContain('Profile');
    expect(registeredScreenNames).toContain('MyBookings');
    expect(registeredScreenNames).toContain('OwnerBookings');
    expect(registeredScreenNames).toContain('OwnerEarnings');
    expect(registeredScreenNames).toContain('BarrierSimulator');
    expect(registeredScreenNames).toContain('RealtimeOccupancy');
    expect(Stack.Screen).toHaveBeenCalledTimes(14); // Verified count matches stack screens
  });

});
