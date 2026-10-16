module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Resolves the "@/*" alias declared in tsconfig.json for Metro/Babel.
      // Expo Router support is provided by babel-preset-expo, so the legacy
      // "expo-router/babel" plugin is intentionally not listed here.
      [
        'module-resolver',
        {
          alias: {
            '@': './src'
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
        }
      ]
    ]
  };
};
