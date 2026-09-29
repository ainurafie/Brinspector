// Used only by Jest (babel-jest) so tests can import the ES modules in src/lib.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
