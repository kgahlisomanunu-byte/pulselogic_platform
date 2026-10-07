module.exports = function override(config) {
  config.ignoreWarnings = [
    {
      module: /node_modules\/face-api\.js/,
    },
  ];
  return config;
};