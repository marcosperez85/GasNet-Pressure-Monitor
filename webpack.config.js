const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

// 🔧 CONFIGURACIÓN
const pluginName = "GasNet-Pressure-Monitor";

// 👉 OPCIONAL: ruta directa a Operations Hub
const endAppPath = "C:/Program Files/Proficy/Operations Hub/iqp-endapp";

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(
      __dirname,
      endAppPath + "/public/custom/default/" + pluginName
    ),
  },
  plugins: [
    new CleanWebpackPlugin(),

    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/index.html', to: '.' },
        { from: 'src/style.css', to: '.' },
        { from: 'src/manifest.json', to: '.' },
        { from: 'src/preview.png', to: '.' },
        { from: 'src/customIcon.png', to: '.' },

        {
          from: './scripts/**/*',
          to: './'
        }
      ]
    }),

    new ZipPlugin({
      path: '../zip',
      pathPrefix: pluginName,
      filename: pluginName + '.zip'
    })
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },

  externals: {
    jquery: 'jQuery',
    echarts: 'echarts'
  }
};