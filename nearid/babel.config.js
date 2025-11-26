module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'module:@react-native/babel-preset',  // ✔ correct for RN 0.82
    ],
    plugins: [
      'react-native-worklets/plugin',       // ✔ correct for Reanimated 4 + Worklets
    ],
  };
};