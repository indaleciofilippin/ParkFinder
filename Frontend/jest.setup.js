jest.mock('react-native/jest/mockComponent', () => {
  return {
    __esModule: true,
    default: (moduleName, instanceMethods, isESModule) => {
      const React = require('react');
      const RealComponent = isESModule
        ? jest.requireActual(moduleName).default
        : jest.requireActual(moduleName);

      const SuperClass =
        typeof RealComponent === 'function' &&
        RealComponent.prototype &&
        RealComponent.prototype.constructor instanceof React.Component
          ? RealComponent
          : React.Component;

      const name =
        RealComponent.displayName ??
        RealComponent.name ??
        (RealComponent.render == null
          ? 'Unknown'
          : RealComponent.render.displayName ?? RealComponent.render.name);

      const nameWithoutPrefix = name.replace(/^(RCT|RK)/, '');

      const Component = class extends SuperClass {
        static displayName = 'Component';
        render() {
          const props = { ...RealComponent.defaultProps };
          if (this.props) {
            Object.keys(this.props).forEach(prop => {
              if (this.props[prop] !== undefined) {
                props[prop] = this.props[prop];
              }
            });
          }
          return React.createElement(nameWithoutPrefix, props, this.props.children);
        }
      };

      Object.defineProperty(Component, 'name', {
        value: name,
        writable: false,
        enumerable: false,
        configurable: true,
      });

      Component.displayName = nameWithoutPrefix;

      Object.keys(RealComponent).forEach(classStatic => {
        Component[classStatic] = RealComponent[classStatic];
      });

      if (instanceMethods != null) {
        Object.assign(Component.prototype, instanceMethods);
      }

      return Component;
    },
  };
});

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


