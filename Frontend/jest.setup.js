const path = require('path');
const mockComponentModule = jest.requireActual('react-native/jest/mockComponent');
const originalMockComponent = mockComponentModule.default;
const mockComponentDir = path.dirname(require.resolve('react-native/jest/mockComponent'));

const resolveModuleFromMockComponent = moduleName =>
  moduleName.startsWith('.')
    ? path.join(mockComponentDir, moduleName)
    : moduleName;

mockComponentModule.default = (moduleName, instanceMethods, isESModule) => {
  const realModule = jest.requireActual(resolveModuleFromMockComponent(moduleName));
  const RealComponent = isESModule ? realModule.default : realModule;

  if (RealComponent && RealComponent.prototype == null) {
    Object.defineProperty(RealComponent, 'prototype', {
      value: { constructor: RealComponent },
      writable: true,
      configurable: true,
    });
  } else if (RealComponent?.prototype && RealComponent.prototype.constructor == null) {
    RealComponent.prototype.constructor = RealComponent;
  }

  return originalMockComponent(moduleName, instanceMethods, isESModule);
};

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ user: { id: 'test-id', email: 'test@example.com' } })),
    signOut: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(() => Promise.resolve({ idToken: 'mock-id-token', accessToken: 'mock-access-token' })),
    revokeAccess: jest.fn(() => Promise.resolve()),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isErrorWithCode: jest.fn(() => false),
}));
