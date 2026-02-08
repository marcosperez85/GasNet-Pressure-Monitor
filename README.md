# GasNet-Pressure-Monitor

Un dashboard web para monitorear y predecir presiones en redes de gas, integrando datos y visualizaciones geoespaciales con capacidades de consulta mediante lenguaje natural a través de un chatbot.

## Descripción

Este proyecto implementa una interfaz de usuario para visualizar datos críticos del sistema de distribución de gas, incluyendo:

- Presiones de entrada upstream y downstream
- Predicciones de presión a 48 horas
- Variaciones de presión
- Comparación con mínimos contractuales
- Tiempo restante hasta alcanzar umbrales críticos
- Consultas en lenguaje natural mediante chatbot integrado

El dashboard está diseñado para ser desplegado como una página web estática en Amazon S3 o cualquier otro servicio de hosting, mientras que el chatbot se conecta a un endpoint de AWS API Gateway que ejecuta un modelo de lenguaje personalizado para consultas sobre datos de presión.

## Estructura del Proyecto

```
GasNet-Pressure-Monitor/
├── index.html          # Interfaz principal del dashboard
├── js/
│   ├── landing.js      # Lógica principal del dashboard
│   └── config.js       # Configuración de API keys (creado por el usuario)
├── chatbot/
│   ├── index.html      # Interfaz del chatbot
│   ├── chatbot.js      # Lógica del chatbot
│   └── style_chatbot.css # Estilos del chatbot
├── style_landing.css   # Estilos de la interfaz principal
├── config.template.js  # Plantilla para configuración de API keys
├── src/                # Scripts de procesamiento de datos
│   └── 01_procesar_dataset.py  # Script para procesar y unificar datos
├── data/               # Directorio para datasets
│   ├── resultados_predicciones.csv  # Datos de predicciones
│   └── dataset_2022-2025.json       # Datos procesados para la aplicación
└── requirements.txt    # Dependencias de Python
```

## Funcionalidades Principales

- **Visualización Geoespacial**: Mapa interactivo con ubicaciones de puntos críticos de la red de gas
- **Monitoreo de Presiones**: Visualización de datos de presión upstream y downstream
- **Predicciones**: Proyección de presiones futuras con un horizonte de 48 horas
- **Chatbot Inteligente**: Interfaz de consultas en lenguaje natural para interactuar con los datos

## Requisitos

### Para el desarrollo
- Python 3.8+
- pandas
- Navegador web moderno (Chrome, Firefox, Safari, Edge)

### Para el despliegue
- Servicio de hosting de sitios estáticos (Amazon S3, GitHub Pages, Netlify, etc.)
- API Key de Google Maps válida
- Conexión al endpoint de API Gateway para el chatbot (ya configurada en el código)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/[usuario]/GasNet-Pressure-Monitor.git
cd GasNet-Pressure-Monitor
```

### 2. Configurar el entorno virtual de Python (para procesamiento de datos)

#### En Windows
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### En macOS/Linux
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuración de la API Key de Google Maps y URL del API Gateway

Por razones de seguridad, las claves de API no se incluyen en el control de versiones.

1. Crea un archivo llamado `./config.js` con el siguiente contenido:
   ```javascript
   const CONFIG = {
     GOOGLE_MAPS_API_KEY: 'TU_CLAVE_API_GOOGLE_MAPS_AQUÍ',
     API_GATEWAY_URL: 'URL DEL API GATEWAY'
   };
   ```

2. Reemplaza 'TU_CLAVE_API_GOOGLE_MAPS_AQUÍ' con tu clave de API de Google Maps.
   - Puedes obtener una clave API desde la [Consola de Google Cloud](https://console.cloud.google.com/)
   - Asegúrate de que la clave tenga acceso a la API de JavaScript de Maps
   - Se recomienda restringir la clave por referencia HTTP para mayor seguridad

3. El archivo `config.js` está excluido del control de versiones en `.gitignore` para evitar exponer tu clave API.

### 4. Procesar los datasets (opcional)

Si necesitas actualizar los datos procesados:

```bash
cd src
python 01_procesar_dataset.py
```

Esto convertirá los datos del CSV a un formato JSON optimizado para su uso en el dashboard.

### 5. Ejecución local

Para pruebas locales, puedes utilizar un servidor web ligero:

#### Python
```bash
# En Python 3
python -m http.server

# En Python 2
python -m SimpleHTTPServer
```

Luego navega a `http://localhost:8000` en tu navegador.

#### Node.js (alternativa)
```bash
# Instalar http-server si no lo tienes
npm install -g http-server

# Ejecutar el servidor
http-server
```

### 6. Desplegar en AWS S3 u otro servicio de hosting

#### Para Amazon S3:
1. Crea un bucket en S3 configurado para alojamiento de sitios web estáticos
2. Sube todos los archivos y directorios del proyecto (HTML, JS, CSS y el archivo `config.js`)
3. Configura los permisos de acceso público según sea necesario
4. Accede al dashboard a través de la URL del punto de enlace de sitio web de S3

## Uso del Dashboard

1. Abre la URL donde está alojado el dashboard en tu navegador
2. El mapa mostrará automáticamente los puntos críticos de la red de gas
3. Selecciona una fecha y hora específica utilizando el selector para consultar datos históricos o futuros
4. El dashboard mostrará:
   - Presión de entrada upstream y downstream
   - Predicción de presión a 48 horas
   - Variación esperada
   - Comparación con mínimo contractual
   - Tiempo restante hasta llegar al umbral
5. Haz clic en los marcadores del mapa para obtener información detallada de cada ubicación

## Uso del Chatbot

El chatbot integrado permite realizar consultas en lenguaje natural sobre los datos de presión y predicciones.

### Acceso al Chatbot:

1. Desde el dashboard principal, haz clic en el botón "Consultar chatbot"
2. Se abrirá una nueva interfaz con el chatbot
3. Escribe tu consulta en lenguaje natural y presiona Enter o haz clic en "Enviar"

### Ejemplos de consultas:

- "¿Cuál es la presión actual en El Chourron?"
- "¿Cuánto tiempo falta para llegar al mínimo contractual?"
- "¿Cuál es la predicción de presión para mañana?"
- "Muéstrame la variación de presión en las últimas 24 horas"

El chatbot se conecta a un endpoint de AWS API Gateway que procesa las consultas y devuelve respuestas basadas en la fecha indicada.

## Mantenimiento

- Actualiza los datasets según sea necesario utilizando los scripts en la carpeta `src`
- Para realizar actualizaciones en el dashboard o chatbot, modifica los archivos correspondientes y vuelve a subirlos al servicio de hosting
- El endpoint del chatbot está administrado separadamente y no requiere mantenimiento por parte del usuario

## Desarrollador

Marcos Perez

## Versión

1.0.0 (Actualizado: 08/02/2026)