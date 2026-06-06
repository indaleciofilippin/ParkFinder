import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MyParkingsScreen } from './MyParkingsScreen';
import { parkingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert } from 'react-native';
import { CustomAlert } from '../../utils/CustomAlert';

jest.mock('../../services/api', () => ({
  parkingApi: {
    getParkings: jest.fn().mockResolvedValue([]),
    deleteParking: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn((callback) => callback()),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.spyOn(CustomAlert, 'alert');

describe('MyParkingsScreen - Unit Tests', () => {
  const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to ManageParking when user has CBU', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { profile: { cbu_cvu: '1234567890123456789012' } },
    });

    const { getByText } = render(<MyParkingsScreen navigation={mockNavigation} />);

    await waitFor(() => {
        expect(getByText('No tienes cocheras aún')).toBeTruthy();
    });

    const addBtn = getByText('Registrar Cochera');
    fireEvent.press(addBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ManageParking');
  });

  it('shows Alert and prevents navigation when user has NO CBU', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { profile: { cbu_cvu: '' } }, // No CBU
    });

    const { getByText } = render(<MyParkingsScreen navigation={mockNavigation} />);

    await waitFor(() => {
        expect(getByText('No tienes cocheras aún')).toBeTruthy();
    });

    const addBtn = getByText('Registrar Cochera');
    fireEvent.press(addBtn);

    expect(CustomAlert.alert).toHaveBeenCalledWith(
      'Datos Bancarios Requeridos',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalledWith('ManageParking');
  });
});
