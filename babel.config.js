module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // 릴리스 빌드에서 console 호출을 제거한다 (명세 5.5 — 로그 금지).
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
