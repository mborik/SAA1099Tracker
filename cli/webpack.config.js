/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const optimizeConstEnum = require('ts-transformer-optimize-const-enum').default;

const typescript = {
  useTypescriptIncrementalApi: false,
  configFile: 'tsconfig.json',
  memoryLimit: 4096,
};

const plugins = [
  new ForkTsCheckerWebpackPlugin({
    async: false,
    typescript,
  }),
];

module.exports = {
  // to automatically find tsconfig.json
  context: __dirname,
  devtool: false,
  entry: {
    cli: [
      './index.ts'
    ],
  },

  devServer: false,
  output: {
    filename: 'cli.js',
    publicPath: '/',
    path: path.resolve(__dirname),
  },

  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: require.resolve('source-map-loader'),
      },
      {
        test: /\.tsx?$/,
        loader: require.resolve('ts-loader'),
        options: {
          configFile: 'tsconfig.json',
          transpileOnly: true,
          getCustomTransformers: (program) => ({
            before: [optimizeConstEnum(program)],
            afterDeclarations: [optimizeConstEnum(program)],
          }),
        },
      },
    ],
  },

  plugins,
  resolve: {
    extensions: ['.ts', '.js'],
  },
  stats: {
    errorDetails: true,
  },
  target: 'node',
};
