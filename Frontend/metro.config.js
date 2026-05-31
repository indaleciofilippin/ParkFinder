const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const { resolver } = config;

config.resolver = {
  ...resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'web' && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
      return {
        type: 'sourceFile',
        filePath: require.resolve('./src/mocks/react-native-maps.web.tsx'),
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
