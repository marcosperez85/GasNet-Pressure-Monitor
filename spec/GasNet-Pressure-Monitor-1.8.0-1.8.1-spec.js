// 🔧 Lista centralizada de inputs requeridos
var REQUIRED_DATA_SOURCES = [
  "inputPEntradaUpHist",
  "inputPEntradaDownHist",
  "inputCaudalHist"
];

// 🔧 Función para normalizar dataSources en cualquier sección
function ensureDataSources(section) {
  if (!section) return;

  if (!section.dataSource) {
    section.dataSource = {};
  }

  for (var i = 0; i < REQUIRED_DATA_SOURCES.length; i++) {
    var key = REQUIRED_DATA_SOURCES[i];

    if (!(key in section.dataSource)) {
      section.dataSource[key] = null;
    }
  }
}

// 🔧 Función principal de transformación
function transform(pluginInstance) {

  // Normalizar distintas posibles estructuras internas
  ensureDataSources(pluginInstance);
  ensureDataSources(pluginInstance.data);
  ensureDataSources(pluginInstance.configuration);

  return pluginInstance;
}

// 🔁 Compatibilidad con distintas versiones de OpHub
// module.exports = {
//   transform: transform,
//   pluginTransform: transform
// };