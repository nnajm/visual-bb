// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

var path = require('path');
var PROD = process.env.npm_lifecycle_event === 'build-p';

// plugins
var TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
var { CleanWebpackPlugin } = require('clean-webpack-plugin');
var ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

var outDir = rootPath('public/js/');

// join and return absolute path
function rootPath( /*path parts*/) {
  return path.join.apply(
    null,
    [__dirname].concat(Array.prototype.slice.call(arguments, 0))
  ).replace(/\\/g, '/');
}

module.exports = {
  context: rootPath('src'),
  mode: PROD ? 'production' : 'development',
  devtool: 'source-map',
  entry: './main.ts', // main app
  output: {
    path: outDir,
    filename: '[name].js',
    publicPath: PROD ? '/' : 'http://localhost:8080/',
  },
  resolve: {
    // only discover files that have those extensions
    extensions: ['.ts', '.js'],
    plugins: [new TsconfigPathsPlugin({
      configFile: rootPath('./src/tsconfig.json')
    })]
  },
  module: {
    rules: [
      // support for .ts files.
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          // disable type checker - we will use it in fork plugin
          transpileOnly: true
        },
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin({
      verbose: false
    }),
    new ForkTsCheckerWebpackPlugin()
  ],
  stats: {
    colors: true,
    modules: false
  },
  // dev server configuration
  devServer: {
    contentBase: './public',
    historyApiFallback: true,
    quiet: false,
    stats: 'minimal',
    host: '127.0.0.1',
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
}