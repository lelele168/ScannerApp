const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    resolver: {
        nodeModulesPaths: ['node_modules'],
    },
    transformer: {
        getTransformOptions: async () => ({
            transform: {
                inlineRequires: true,
            },
        }),
    },
    watchFolders: ['src'],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
