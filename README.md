# GasNet-Pressure-Monitor

Un dashboard web para monitorear y predecir presiones en redes de gas, integrando datos y visualizaciones geoespaciales con capacidades de consulta mediante lenguaje natural a través de un chatbot.

## Descripción

Este proyecto implementa una interfaz de usuario para visualizar datos críticos del sistema de distribución de gas, incluyendo:

- Presiones de entrada upstream y downstream
- Predicciones de presión mediante el cálculo de linepack
- Variaciones de presión
- Comparación con mínimos contractuales
- Tiempo restante hasta alcanzar umbrales críticos
- Consultas en lenguaje natural mediante chatbot integrado

El dashboard está diseñado para ser desplegado como una página web estática en Operations Hub, mientras que el chatbot se conecta a un endpoint de AWS API Gateway que ejecuta un modelo de Amazon Bedrock para realizar consultas en lenguaje natural sobre datos de presión y tramos críticos.

Los archivos para el despliegue del chatbot se encuentran en un repositorio distinto para separar responsabilidades.

## Estructura del Proyecto

```
GasNet-Pressure-Monitor/
├── .git/                          # Repositorio git
├── .gitignore                     # Archivo de exclusiones git
├── .venv/                         # Entorno virtual (Python)
├── config.js                      # Configuración principal
├── config_template.js             # Plantilla de configuración
├── package.json                   # Dependencias del proyecto
├── webpack.config.js              # Configuración de Webpack
├── README.md                       # Este archivo
├── src/                           # Código fuente
│   ├── index.html                 # Página principal
│   ├── main.js                    # Punto de entrada
│   ├── style.css                  # Estilos
│   ├── manifest.json              # Manifest del plugin
│   ├── customIcon.png             # Icono personalizado
│   └── preview.png                # Vista previa
├── scripts/                       # Scripts funcionales
│   ├── calcularLinepack.js        # Cálculo de linepack
│   ├── chart.js                   # Generación de gráficos
│   ├── crearStringURL.js          # Creación de URLs dinámicas
│   ├── data.js                    # Gestión de datos
│   ├── dom.js                     # Manipulación del DOM
│   ├── librerias/                 # Librerías externas
│   ├── limpiarURLs.js             # Limpieza de URLs
│   ├── map.js                     # Mapa interactivo
│   ├── navigation.js              # Navegación
│   ├── processCurrentValues.js    # Procesamiento de valores actuales
│   ├── sidebar.js                 # Panel lateral
│   └── state.js                   # Gestión de estado
└── spec/                          # Especificaciones y tests
    └── GasNet-Pressure-Monitor-3.1.0-3.2.0-spec.js
```

## Funcionalidades Principales

- **Visualización Geoespacial**: Mapa interactivo con ubicaciones de puntos críticos de la red de gas
- **Monitoreo de Presiones**: Visualización de datos de presión upstream y downstream
- **Predicciones**: Proyección de presiones futuras mediante el concepto de Linepack
- **Chatbot Inteligente**: Interfaz de consultas en lenguaje natural para interactuar con los datos

## Requisitos

### Para el desarrollo
- Operations Hub 2025 (Classic Designer)
- Node.js y npm
- Git Bash (para desarrollo en Windows)

## Configuración en Proficy Operations Hub

### 1. Queries Requeridos

Crear los siguientes queries en Operations Hub:

#### 1.1 P-Entrada-Up-Hist
Presión de entrada histórica del punto upstream

**Configuración:**
- Auto update: 2 min
- Auto submit on input change: ✓
- Row limit: 1000
- Tag (string): `P-Entrada-Up-Global` (variable GLOBAL)
- Sampling Mode: Interpolated
- Start Time: `StartTime` (variable GLOBAL)
- End Time: `endTime` (variable GLOBAL)

#### 1.2 P-Entrada-Down-Hist
Presión de entrada histórica del punto downstream

**Configuración:**
- Auto update: 2 min
- Auto submit on input change: ✓
- Row limit: 1000
- Tag (string): `P-Entrada-Down-Global` (variable GLOBAL)
- Sampling Mode: Interpolated
- Start Time: `StartTime` (variable GLOBAL)
- End Time: `endTime` (variable GLOBAL)

#### 1.3 Caudal-Hist
Caudal instantáneo histórico (punto upstream)

**Configuración:**
- Auto update: 2 min
- Auto submit on input change: ✓
- Row limit: 1000
- Tag (string): `Caudal-Global` (variable GLOBAL)
- Sampling Mode: Interpolated
- Start Time: `StartTime` (variable GLOBAL)
- End Time: `endTime` (variable GLOBAL)

#### 1.4 Current-Value-Dataset
Valor actual de TODOS los puntos a medir

**Configuración:**
- Auto submit (as soon as data is available): ✓
- Auto update: 2 min
- Auto submit on input change: ✓
- Row limit: 50
- Tag (string): `StringURLs-Global` (variable GLOBAL)
- Sampling Mode: Current Value
- Start Time: `StartTime` (variable GLOBAL)
- End Time: `endTime` (variable GLOBAL)

**Nota:** Cuando el Sampling Mode es "Current Value", el Start Time es irrelevante; solo importa que el End Time sea el actual.

### 2. Variables Globales

Crear las siguientes variables globales (todas del tipo `string`):

| Variable | Valor Inicial | Descripción |
|----------|--------------|-------------|
| `P-Entrada-Up-Global` | `webhmi-model://PM 203 - El Chourron/P-Entrada` | URL del Asset Model para presión upstream |
| `P-Entrada-Down-Global` | `webhmi-model://Invernada L1/P-Entrada` | URL del Asset Model para presión downstream |
| `Caudal-Global` | `webhmi-model://PM 203 - El Chourron/Q-Inst` | URL del Asset Model para caudal instantáneo |
| `StartTime` | `2026-04-03T12:00:00` | Fecha/hora inicio (formato ISO 8601) |
| `EndTime` | `2026-04-03T13:00:00` | Fecha/hora fin (formato ISO 8601) |
| `StringURLs-Global` | `webhmi-model://PM 203 - El Chourron/P-Entrada` | Concatenación de URLs separadas por comas para todos los puntos |
| `DatosProcesados` | (vacío) | JSON con resultados de cálculos (scope: APP) |

**Importante:** Aunque el script genera dinámicamente estas variables, es necesario proporcionar valores iniciales válidos para evitar que aparezca un banner de error al abrir la página por primera vez. Los valores iniciales provisionales aseguran que los queries ejecuten correctamente.

### 3. Configuración del Plugin

Mapear los siguientes campos del plugin Dashboard:

| Campo del Plugin | Tipo | Referencia |
|-----------------|------|-----------|
| Presion de Entrada Upstream Historica | Query | `P-Entrada-Up-Hist` (All fields) |
| Presion de Entrada Downstream Historica | Query | `P-Entrada-Down-Hist` (All fields) |
| Caudal Historico | Query | `Caudal-Hist` (All fields) |
| Valor actual de variables | Query | `Current-Value-Dataset` (All fields) |
| Google Maps API KEY | Manual | Ingresar API KEY de Google Cloud |
| URL del archivo GeoJSON | Manual | Ingresar URL del archivo GeoJSON |
| Global de P-Entrada Upstream | Global | `P-Entrada-Up-Global` |
| Global de P-Entrada Downstream | Global | `P-Entrada-Down-Global` |
| Global de Caudal | Global | `Caudal-Global` |
| Global de string de URLs | Global | `StringURLs-Global` |
| Fecha de inicio | Global | `StartTime` |
| Fecha de fin | Global | `EndTime` |
| Array Global de datos procesados | Global | `DatosProcesados` |

## Instalación y Despliegue

### Pasos de Despliegue

1. **Inicializar el proyecto:**
   ```bash
   npm init -y
   ```

2. **Instalar dependencias:**
   ```bash
   npm install webpack webpack-cli
   ```

3. **Crear webpack.config.js** (ya incluido en el proyecto)

4. **Ubicar código fuente:**
   - HTML, CSS, JavaScript en `/src`
   - Scripts adicionales en `/src/scripts`
   - Manifest SOLO con `main.js` + librerías

5. **Compilar el proyecto:**
   ```bash
   npm run build
   ```
   *Ejecutar desde PowerShell abierto como Administrator*

6. **Desplegar en Operations Hub:**
   - Copiar archivos compilados a la ubicación de despliegue
   - Configurar las variables globales y queries según la sección anterior
   - Vincular el plugin Dashboard con la página

## Variables de Entorno

Crear un archivo `config.js` basado en `config_template.js` con:

- Credenciales de API
- URLs de endpoints
- Configuración de conexión a Operations Hub

## Notas Importantes

- El script del plugin genera dinámicamente `StartTime`, `EndTime`, `StringURLs-Global` y demás variables
- Los valores iniciales provistos previenen errores al cargar la página por primera vez
- La variable `DatosProcesados` con scope APP permite compartir datos entre múltiples páginas de la aplicación
- Se puede utilizar esta variable para: dashboards de resumen de puntos críticos o para automatizar el prompt del chatbot