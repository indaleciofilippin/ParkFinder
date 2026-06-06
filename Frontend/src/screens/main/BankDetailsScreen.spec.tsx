import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BankDetailsScreen } from './BankDetailsScreen';
import { userApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('../../services/api', () => ({
  userApi: {
    updateProfile: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('BankDetailsScreen - Unit Tests (AAA Pattern)', () => {
  const mockNavigation = { goBack: jest.fn() };
  const mockSetUser = jest.fn();
  const mockUser = {
    id_user_auth: 1,
    profile: {
      cbu_cvu: '',
      bank_alias: '',
      cuit: ''
    }
  };

  const renderScreen = () => {
    return render(<BankDetailsScreen navigation={mockNavigation} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      login: jest.fn(),
      register: jest.fn(),
      socialLogin: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    });
  });

  it('renders correctly and saves bank details', async () => {
    // Arrange
    const { getByText, getByPlaceholderText } = renderScreen();
    const mockUpdateResponse = { ...mockUser, profile: { cbu_cvu: '0000003100000000000000', bank_alias: 'ALIAS.TEST', cuit: '20304050607' } };
    (userApi.updateProfile as jest.Mock).mockResolvedValueOnce(mockUpdateResponse);

    // Act
    const cbuInput = getByPlaceholderText('Ej. 0000003100000000000000');
    fireEvent.changeText(cbuInput, '0000003100000000000000');

    const saveButton = getByText('Guardar Datos');
    fireEvent.press(saveButton);

    // Assert
    await waitFor(() => {
      expect(userApi.updateProfile).toHaveBeenCalledWith(1, expect.objectContaining({
        cbu_cvu: '0000003100000000000000'
      }));
      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Éxito', expect.any(String));
    });
  });
});
