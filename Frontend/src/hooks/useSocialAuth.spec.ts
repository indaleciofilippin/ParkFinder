import { renderHook, act } from '@testing-library/react-native';
import { useSocialAuth } from './useSocialAuth';
import { Alert } from 'react-native';

// Mock useAuth context
const mockSocialLogin = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    socialLogin: mockSocialLogin,
  }),
}));

// Mock expo-auth-session/providers/google
const mockPromptAsync = jest.fn();
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [
    {}, // request object
    null, // response object
    mockPromptAsync, // promptAsync function
  ],
}));

// Mock expo-apple-authentication
const mockAppleSignInAsync = jest.fn();
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: {
    FULL_NAME: 'FULL_NAME',
    EMAIL: 'EMAIL',
  },
  signInAsync: (...args: any[]) => mockAppleSignInAsync(...args),
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// Spy on Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useSocialAuth Hook - Unit Tests (AAA Pattern)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should trigger Google auth session flow when using expo login (non-native)', async () => {
    // 1. Arrange
    const { result } = renderHook(() => useSocialAuth());

    // 2. Act
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    // 3. Assert
    expect(mockPromptAsync).toHaveBeenCalledTimes(1);
  });

  test('should perform Apple Login successfully and call socialLogin', async () => {
    // 1. Arrange
    const mockAppleCredential = {
      fullName: { givenName: 'John', familyName: 'Doe' },
      email: 'john.doe@example.com',
      user: 'apple-user-12345',
    };
    mockAppleSignInAsync.mockResolvedValueOnce(mockAppleCredential);
    const { result } = renderHook(() => useSocialAuth());

    // 2. Act
    await act(async () => {
      await result.current.signInWithApple();
    });

    // 3. Assert
    expect(mockAppleSignInAsync).toHaveBeenCalledTimes(1);
    expect(mockSocialLogin).toHaveBeenCalledWith({
      email: 'john.doe@example.com',
      auth_provider: 'apple',
      role: 'pending',
      provider_id: 'apple-user-12345',
      first_name: 'John',
      last_name: 'Doe',
    });
  });

  test('should handle Apple Login cancellation gracefully without alerting error', async () => {
    // 1. Arrange
    const errorMock = { code: 'ERR_CANCELED' };
    mockAppleSignInAsync.mockRejectedValueOnce(errorMock);
    const { result } = renderHook(() => useSocialAuth());

    // 2. Act
    await act(async () => {
      await result.current.signInWithApple();
    });

    // 3. Assert
    expect(mockAppleSignInAsync).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockSocialLogin).not.toHaveBeenCalled();
  });

  test('should show Alert error when Apple Login fails with non-cancellation error', async () => {
    // 1. Arrange
    const errorMock = { code: 'SOME_GENERIC_ERROR' };
    mockAppleSignInAsync.mockRejectedValueOnce(errorMock);
    const { result } = renderHook(() => useSocialAuth());

    // 2. Act
    await act(async () => {
      await result.current.signInWithApple();
    });

    // 3. Assert
    expect(mockAppleSignInAsync).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Fallo al iniciar sesión con Apple');
    expect(mockSocialLogin).not.toHaveBeenCalled();
  });

});
