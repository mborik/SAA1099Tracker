/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ForkTsCheckerNotifierPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const optimizeConstEnum = require('ts-transformer-optimize-const-enum').default;
const webpack = require('webpack');
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
  new webpack.ProvidePlugin({
    $: 'jquery',
    jQuery: 'jquery',
  }),

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

  // CSS extraction is only enabled in production
  new MiniCssExtractPlugin({ filename: '[name].css' }),

  new HtmlWebpackPlugin({
    template: 'templates/index.html',
    inject: true,
    hash: true,
    minify: {
      collapseWhitespace: IS_PRODUCTION
    },
  }),
];

if (IS_PRODUCTION) {
  // plugins.push(
  //   new InjectManifest({
  //     exclude: [/LICENSE\.txt$/],
  //     swSrc: path.resolve(__dirname, 'src/serviceWorker.ts'),
  //     swDest: 'sw.js',
  //   })
  // );
}
else {
  plugins.push(
    new ReactRefreshPlugin(),
    new ForkTsCheckerNotifierPlugin({
      title: `${PACKAGE_NAME}: typescript`,
      excludeWarnings: false,
    }),
    new WebpackNotifierPlugin({ title: `${PACKAGE_NAME}: webpack` }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: './assets' },
      ],
    }),
  );
}

// Module loaders for .scss files, used in reverse order:
// compile LESS, apply PostCSS, interpret CSS as modules.
const cssLoaders = [
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
  {
    loader: require.resolve('less-loader'),
    options: {
      lessOptions: {
        paths: [path.resolve(__dirname, 'node_modules/bootstrap/less')],
      },
    },
  }
];

module.exports = {
  // to automatically find tsconfig.json
  context: __dirname,

  devtool: IS_PRODUCTION ? false : 'inline-source-map',

  entry: {
    bootstrap: [
      'jquery',
      'bootstrap',
      'bootstrap-toggle',
      './src/bootstrap.mods/touchspin/bootstrap-touchspin.js',
      './src/bootstrap.mods/confirm/bootstrap-confirm.js'
    ],
    app: [
      /*
      './src/commons/compat.ts',
      './src/commons/timer.ts',
      './src/commons/browser.js',
      './src/commons/dev.js',
      './src/commons/audio.ts',
      './src/commons/number.proto.ts',
      './src/saa/SAASound.ts',
      './src/saa/SAANoise.ts',
      './src/saa/SAAEnv.ts',
      './src/saa/SAAFreq.ts',
      './src/saa/SAAAmp.ts',
      './src/player/globals.ts',
      './src/player/sample.ts',
      './src/player/ornament.ts',
      './src/player/pattern.ts',
      './src/player/position.ts',
      './src/player/runtime.ts',
      './src/player/core.ts',
      './src/tracker/file.ts',
      './src/tracker/file.dialog.ts',
      './src/tracker/file.system.ts',
      './src/tracker/tracklist.ts',
      './src/tracker/smporn.ts',
      './src/tracker/manager.ts',
      './src/tracker/settings.ts',
      './src/tracker/core.js',
      './src/tracker/controls.js',
      './src/tracker/keyboard.js',
      './src/tracker/mouse.ts',
      './src/tracker/paint.ts',
      './src/tracker/doc.js',
      './src/tracker/gui.js'
      */
      './src/index.ts'
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
      index: path.resolve(__dirname, 'templates/index.html'),
      stats: 'errors-only',
    },
    historyApiFallback: true,
    https: false,
    host: '0.0.0.0',
    hot: true,
    open: false,
    port: DEV_PORT,
    static: [
      path.resolve(__dirname, 'assets'),
      path.resolve(__dirname, 'demosongs'),
      path.resolve(__dirname, 'doc'),
    ],
  },

  output: {
    filename: '[name].js',
    publicPath: '',
    path: path.resolve(__dirname, 'build'),
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
        test: /\.less$/,
        use: cssLoaders,
      },
      {
        test: /\.html$/,
        loader: require.resolve('underscore-template-loader'),
        include: path.resolve(__dirname, 'templates'),
      },
      {
        test: /\.(eot|ttf|woff|woff2|ico|svg|png|gif|jpe?g)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[query][hash][ext]',
        },
      },
    ],
  },

  plugins,

  resolve: {
    extensions: ['.js', '.ts', '.less'],
  },

  target: 'browserslist',
};
