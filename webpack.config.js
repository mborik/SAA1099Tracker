/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ForkTsCheckerNotifierPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PackageJsonPlugin = require('pkg.json-webpack-plugin');
const optimizeConstEnum = require('ts-transformer-optimize-const-enum').default;
const WebpackNotifierPlugin = require('webpack-notifier');
const { InjectManifest } = require('workbox-webpack-plugin');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEV_PORT = process.env.PORT || 3000;
const PACKAGE_NAME = 'SAA1099Tracker';

const typescript = {
  configFile: 'tsconfig.json',
  memoryLimit: 4096,
};

const plugins = [
  new ForkTsCheckerWebpackPlugin(
    IS_PRODUCTION
      ? {
        async: false,
        typescript: {
          ...typescript,
          useTypescriptIncrementalApi: true,
        },
      }
      : { typescript }
  ),

  // CSS extraction is only enabled in production (see scssLoaders below).
  new MiniCssExtractPlugin({ filename: '[name].css' }),

  new PackageJsonPlugin({
    key: 'package',
    include: ['version', 'releaseYear'],
  }),

  new CopyWebpackPlugin({
    patterns: [
      { from: 'src/index.html', to: '.' },
      { from: 'public', to: '.' },
    ],
  }),
];

if (IS_PRODUCTION) {
  plugins.push(
    new InjectManifest({
      exclude: [/LICENSE\.txt$/],
      swSrc: path.resolve(__dirname, './src/serviceWorker.ts'),
      swDest: 'sw.js',
    })
  );
}
else {
  plugins.push(
    new ReactRefreshPlugin(),
    new ForkTsCheckerNotifierPlugin({
      title: `${PACKAGE_NAME}: typescript`,
      excludeWarnings: false,
    }),
    new WebpackNotifierPlugin({ title: `${PACKAGE_NAME}: webpack` })
  );
}

// Module loaders for .scss files, used in reverse order:
// compile Sass, apply PostCSS, interpret CSS as modules.
const scssLoaders = [
  // Only extract CSS to separate file in production mode.
  IS_PRODUCTION
    ? { loader: MiniCssExtractPlugin.loader }
    : require.resolve('style-loader'),
  {
    loader: require.resolve('css-loader'),
    options: {
      // necessary to minify @import-ed files using cssnano
      importLoaders: 1,
    },
  },
  {
    loader: require.resolve('postcss-loader'),
    options: {
      postcssOptions: {
        plugins: [
          require('autoprefixer'),
          require('cssnano')({ preset: 'default' }),
        ],
      },
    },
  },
  require.resolve('sass-loader'),
];

module.exports = {
  // to automatically find tsconfig.json
  context: __dirname,

  devtool: IS_PRODUCTION ? false : 'inline-source-map',

  entry: {
    app: [
      // environment polyfills
      'dom4',
      // bundle entry points
      './src/index.tsx',
    ],
  },

  devServer: {
    allowedHosts: 'all',
    client: {
      overlay: {
        warnings: true,
        errors: true,
      },
      progress: true,
    },
    devMiddleware: {
      index: path.resolve(__dirname, 'src/index.html'),
      stats: 'errors-only',
    },
    historyApiFallback: true,
    https: false,
    host: '0.0.0.0',
    hot: true,
    open: false,
    port: DEV_PORT,
    static: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'public'),
    ],
  },

  output: {
    filename: '[name].js',
    publicPath: '',
    path: path.resolve(__dirname, 'dist'),
  },

  mode: IS_PRODUCTION ? 'production' : 'development',

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
      {
        test: /\.scss$/,
        use: scssLoaders,
      },
      {
        test: /\.(eot|ttf|woff|woff2|svg|png|gif|jpe?g)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext][query][hash]',
        },
      },
    ],
  },

  plugins,

  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.scss'],
  },

  target: 'browserslist',
};
