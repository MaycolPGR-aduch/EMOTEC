module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin debe ir SIEMPRE el ultimo. reanimated 4 lo
    // necesita (worklets se separo de reanimated en v4). Sin esto, las
    // animaciones fallan en runtime. Tras crearlo, arrancar con: expo start -c
    plugins: ['react-native-worklets/plugin'],
  };
};
