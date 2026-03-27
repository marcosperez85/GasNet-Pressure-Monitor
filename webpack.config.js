const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

// 🔧 CONFIGURACIÓN
const pluginName = "GasNet-Pressure-Monitor";

// 👉 OPCIONAL: ruta directa a Operations Hub
const endAppPath = "C:/Program Files/Proficy/Operations Hub/iqp-endapp";

// Ruta de salida para el build
const outputPath = path.resolve(
  __dirname,
  endAppPath + "/public/custom/default/" + pluginName
);

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: outputPath,
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
        { from: 'scripts/**/*', to: './' },
        { from: 'spec/*spec.js', to: './' }
      ]
    }),

    // ZIP del plugin
    new ZipPlugin({
      path: '../zip',
      pathPrefix: pluginName,
      filename: pluginName + '.zip'
    }),

    // ZIP del spec
    new ZipPlugin({
      filename: 'spec.zip',
      path: outputPath,
      include: [/.*spec\.js$/],
      pathMapper: function (assetPath) {
        // Elimina cualquier ruta de directorio para que los archivos queden en la raíz del ZIP
        return assetPath.split('/').pop();
      }
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