# GasNet-Pressure-Monitor

Dashboard web para visualizar presiones simuladas en redes de gas, con tramos
geográficos en Google Maps, curvas en ECharts y consultas mediante Tecbot,
un chatbot flotante conectado a Amazon Bedrock.

## Descripción

Este proyecto implementa una interfaz de usuario para visualizar datos críticos del sistema de distribución de gas, incluyendo:

- Presiones de entrada upstream y downstream
- Variaciones de presión
- Comparación con mínimos contractuales
- Consultas en lenguaje natural mediante chatbot integrado

El frontend puede desplegarse como sitio estático. El chatbot envía la consulta
y las mediciones en memoria a AWS API Gateway; una función Lambda valida el
contexto e invoca Amazon Bedrock para generar la respuesta.

Las presiones se generan con `Math.random()` en JavaScript. Actualmente no se
procesan datasets de presión CSV/JSON ni se generan pronósticos. El archivo
GeoJSON de `data/` sí se utiliza para dibujar los tramos del mapa.

## Estructura del Proyecto

```text
GasNet-Pressure-Monitor/
├── .gitignore            # Exclusiones de Git para configuración y archivos locales
├── README.md             # Documentación del proyecto
├── index.html            # Interfaz principal del dashboard
├── style_landing.css     # Estilos del dashboard
├── config.js             # Configuración para desarrollo local (no se publica con Terraform)
├── config.template.js    # Plantilla de configuración
├── requirements.txt      # Listado heredado del procesamiento de datasets; sin uso actual
├── js/
│   ├── state.js          # Estado compartido y series simuladas por punto
│   ├── dom.js            # Referencias a elementos de la interfaz
│   ├── data.js           # Unidades de negocio y configuración de puntos de medición
│   ├── config-check.js   # Comprobación de la configuración de Google Maps
│   ├── main.js           # Inicialización del dashboard
│   ├── map.js            # Carga del GeoJSON y selección de tramos en Google Maps
│   ├── sidebar.js        # Tarjetas, métricas y selección de puntos de medición
│   ├── chart.js          # Series simuladas y gráficos ECharts con DataZoom
│   └── navigation.js     # Apertura del chatbot flotante
├── data/
│   └── Gasoductos_y_ramales_CGP_05per.json  # Tramos en GeoJSON, convertido desde KMZ
├── chatbot/
│   ├── index.html        # Redirección de enlaces anteriores al dashboard
│   ├── chatbot.js        # Ventana flotante, contexto en memoria y conexión con la API
│   └── widget.css        # Estilos de la ventana flotante
├── lambda/
│   └── chatbot/
│       └── lambda_function.py  # Backend del chatbot en AWS Lambda
├── tests/
│   └── test_chat_context.py # Validación del contexto y envío a Bedrock simulado
└── terraform/
    ├── main.tf           # Archivo principal de Terraform (actualmente vacío)
    ├── provider.tf       # Proveedores, región y perfil de AWS
    ├── frontend.tf       # Bucket privado, CloudFront, proxy /chat y archivos estáticos
    ├── terraform.tfvars.example # Plantilla de la clave de Google Maps
    ├── variables.tf      # Variables de infraestructura
    ├── outputs.tf        # Salidas del despliegue
    ├── api_gateway.tf    # API REST para acceder al chatbot
    ├── lambda.tf         # Empaquetado y despliegue de la función Lambda
    ├── bedrock.tf        # Archivo reservado para Bedrock (actualmente vacío)
    ├── security.tf       # Clave de API, plan de uso, permisos IAM y backend de estado
    ├── .terraform.lock.hcl  # Versiones fijadas de los proveedores
    ├── lambda.zip        # Archivo ZIP presente en el repositorio
    └── tests/
        └── frontend.tftest.hcl # Pruebas con proveedores simulados (sin AWS)
```

Se omiten del árbol los artefactos locales de Terraform, como `.terraform/`,
`.terraform-poc/`, los archivos de estado y planes de Terraform,
y el paquete generado `POC-chatbot-lambda.zip`.

## Funcionalidades Principales

- **Mapa de gasoductos**: Tramos del GeoJSON y selección sincronizada con Puntos de Medición.
- **Presiones simuladas**: Cada punto conserva sus propias curvas upstream y downstream durante la sesión. Pressure muestra el último valor upstream con dos decimales.
- **Tendencias**: Historial simulado de 72 horas, vista inicial de las últimas 24 horas y DataZoom para ampliar o desplazar el intervalo.
- **Chatbot flotante**: Consultas sobre los mismos datos del gráfico, sin abandonar ni reemplazar el mapa.

## Requisitos

### Para el desarrollo

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor HTTP para servir el frontend; por ejemplo, Python 3 con `http.server`.
- Python 3 para ejecutar las pruebas del backend, que usan la biblioteca estándar y simulan las llamadas a AWS.

No es necesario instalar las dependencias del `requirements.txt` heredado para
ejecutar el dashboard, el servidor HTTP o las pruebas actuales.

### Para el despliegue

- Cuenta AWS y perfil local `trabajo`, con permisos para S3, CloudFront y los recursos del backend.
- Clave de Maps JavaScript API restringida por sitio web en Google Cloud.
- Terraform y acceso al backend remoto de estado ya configurado. Las pruebas con proveedores simulados requieren Terraform 1.7 o posterior.

## Instalación

### Despliegue independiente de la POC

La configuración de Terraform crea `POC-chatbot-api`, una Lambda `POC-chatbot` con el
código de `lambda/chatbot`, y un rol IAM, API key y plan de uso propios.
Conserva la región `us-east-1` y el perfil AWS `trabajo`.
También administra el bucket privado `tecnet-dashboard`, la distribución de
CloudFront y los objetos estáticos del dashboard. El nombre del bucket debe estar
disponible globalmente; si ya existe en tu cuenta, debe importarse al state antes
de administrarlo con esta configuración. No se intenta adoptar ni vaciar un bucket existente.

El backend usa el bucket existente `terraform-state-mdp`, pero guarda el state
en `POC-chatbot/terraform.tfstate`. El state original
`bedrock-app/terraform.tfstate` no se debe copiar, migrar ni importar en la POC.
La tabla de locks existente `terraform-lock` se comparte; no se recrea.

Primero copia `terraform/terraform.tfvars.example` a `terraform/terraform.tfvars`
y reemplaza el valor de `google_maps_api_key` por tu clave de Google Maps. El archivo
`terraform.tfvars` está excluido de Git. También puedes proporcionar la variable
de entorno `TF_VAR_google_maps_api_key` en lugar de crear ese archivo.

Desde PowerShell, en la raíz del repositorio:

```powershell
$env:AWS_PROFILE = 'trabajo'
$env:TF_DATA_DIR = Join-Path (Get-Location) 'terraform/.terraform-poc'
$env:TF_WORKSPACE = 'default'
terraform -chdir=terraform init -reconfigure
terraform -chdir=terraform validate
terraform -chdir=terraform plan "-out=poc.tfplan"
```

`TF_DATA_DIR` separa también la configuración local del backend. Usar estas
variables en cada terminal de la POC; no usar `init -migrate-state` ni reutilizar
un plan del despliegue original. Antes del primer despliegue, comprobar que el
plan solo crea recursos de la POC, sin modificaciones ni eliminaciones de
recursos existentes. En despliegues posteriores, revisar que las actualizaciones
correspondan únicamente a esa POC. No continuar si aparecen cambios sobre `ophub-chatbot`
o `lambda-bedrock-role`.

Después de revisar el plan, desplegar explícitamente:

```powershell
terraform -chdir=terraform apply poc.tfplan
terraform -chdir=terraform output -raw frontend_url
```

`terraform plan` muestra lo que se creará o actualizará; **no despliega el sitio**.
`terraform apply poc.tfplan` publica los cambios del plan revisado. CloudFront
puede tardar varios minutos en distribuir su configuración.

Usa el output `frontend_url` para abrir el sitio por HTTPS. En Google Cloud,
autoriza `https://<dominio-del-output-frontend_url>/*` como referencia HTTP de la
clave y limita su uso a Maps JavaScript API. Por ejemplo:
`https://d123example.cloudfront.net/*`. Agrega `http://localhost:8000/*` solo a la
clave que utilices para desarrollo local. Hasta aplicar las restricciones
correctas, Google Maps puede rechazar la carga desde el dominio nuevo.

Los outputs `api_url` y `api_key` siguen disponibles para desarrollo local.
No copies la clave de API Gateway al `config.js` publicado. El state y los planes
contienen valores sensibles: `sensitive = true` oculta la salida habitual de
Terraform, pero no elimina esos valores del state ni de los planes guardados.
Conserva el acceso restringido al bucket de estado y no publiques planes o tfvars.

El logging de API Gateway utiliza la configuración regional de CloudWatch ya
existente en la cuenta. Esta POC no administra ni reemplaza esa configuración
compartida.

### 1. Clonar el repositorio

```bash
git clone https://github.com/[usuario]/GasNet-Pressure-Monitor.git
cd GasNet-Pressure-Monitor
```

### 2. Configuración para desarrollo local

Por razones de seguridad, las claves de API no se incluyen en el control de versiones.

1. Crea un archivo llamado `./config.js` con el siguiente contenido:
   ```javascript
   const CONFIG = {
      GOOGLE_MAPS_API_KEY: 'API KEY DE GOOGLE MAPS',
      API_GATEWAY_URL: 'URL DEL API GATEWAY',
      API_GATEWAY_KEY: 'API KEY DEL NUEVO API GATEWAY'
   };
   ```

2. Completa los tres valores de la plantilla: la clave de Google Maps y la URL y clave de API Gateway.
   - Puedes obtener una clave API desde la [Consola de Google Cloud](https://console.cloud.google.com/)
   - Asegúrate de que la clave tenga acceso a la API de JavaScript de Maps
   - Se recomienda restringir la clave por referencia HTTP para mayor seguridad

3. El archivo `config.js` está excluido del control de versiones en `.gitignore` para evitar exponer tu clave API.

### 3. Ejecución local

Para pruebas locales, puedes utilizar un servidor web ligero:

#### Python 3

```bash
python -m http.server
```

Ejecuta el comando desde la raíz del proyecto y abre `http://localhost:8000`.
No abras `index.html` mediante `file://`: la carga del GeoJSON requiere servir
el sitio por HTTP o HTTPS.


### 4. Publicación del frontend con Terraform

El procedimiento de plan/apply indicado arriba publica una lista explícita de
archivos definida en `local.frontend_files` de `terraform/frontend.tf`: HTML,
estilos, scripts y el GeoJSON. Si agregas un nuevo recurso estático, inclúyelo
en esa lista. Los cambios de contenido se detectan mediante hashes.

El bucket `tecnet-dashboard` tiene el acceso público bloqueado. CloudFront lee
los objetos mediante Origin Access Control (OAC), con una política limitada a
esa distribución. No se habilita S3 Website Hosting: la entrada pública es
CloudFront, con certificado HTTPS predeterminado y `index.html` como documento raíz.

Los archivos del frontend se sirven con revalidación de caché y `config.js` con
`no-store`; no hace falta ejecutar invalidaciones para cada cambio normal.
El contenido de `/chat` no se almacena en caché. El despliegue de API Gateway
se renueva cuando cambia su configuración, no por la fecha de cada plan.

### Configuración pública y credenciales

Terraform **no sube el `config.js` local**. Genera este formato en S3:

```javascript
const CONFIG = {
  GOOGLE_MAPS_API_KEY: 'CLAVE_RESTRINGIDA_DE_MAPS',
  API_GATEWAY_URL: '/chat'
};
```

- **Google Maps:** la clave debe estar disponible en el navegador. Su protección
  consiste en restringir dominios y APIs en Google Cloud, no en ocultarla en JavaScript.
  [Guía de Google](https://developers.google.com/maps/api-security-best-practices).
- **URL de API Gateway:** no es un secreto. El navegador usa `/chat` en el mismo
  dominio; CloudFront lo reenvía a la etapa `/dev/chat` de la API administrada aquí.
- **Clave de API Gateway:** queda configurada como cabecera de origen `x-api-key`
  en CloudFront. Se agrega al reenviar la solicitud, sin enviarla al navegador.
  Se conserva en Terraform/state y es visible para administradores con permisos
  sobre CloudFront. [Cabeceras de origen de CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html).
- **Credenciales AWS:** se obtienen del perfil `trabajo`; nunca forman parte del frontend.

El sitio y `/chat` siguen siendo públicos: ocultar la clave de origen no autentica
usuarios. Las API keys de API Gateway controlan uso, no sustituyen autorización.
Si el chatbot debe ser privado, hace falta añadir autenticación/autorización
(por ejemplo, Cognito y un authorizer). [Guía de API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html).

Validación local de la infraestructura, sin desplegar recursos en AWS, después de
inicializar los proveedores y definir `TF_DATA_DIR` como se indicó arriba:

```powershell
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform test
```

Las pruebas usan proveedores simulados y un estado de prueba separado; su
`command = apply` no aplica cambios sobre tu cuenta de AWS.

## Uso del Dashboard

1. Abre la URL del dashboard. El mapa carga los tramos del GeoJSON.
2. Selecciona una unidad de negocio en la barra izquierda para mostrar sus puntos; se selecciona inicialmente el primero.
3. Selecciona un punto en la barra derecha para mostrar sus curvas y engrosar el tramo asociado. Pressure indica su último valor upstream.
4. También puedes seleccionar un tramo configurado desde el mapa: se abre su unidad y se resalta su tarjeta. Los tramos sin asociación en `js/data.js` muestran su código en el mapa.
5. Usa la barra DataZoom, el arrastre o la rueda del mouse sobre el gráfico para explorar el historial. La grilla es discontinua y cada curva tiene su leyenda.
6. Abre Tecbot desde el botón superior o el botón flotante inferior para consultar los datos de la sesión.

La asociación geográfica busca el código del punto en `properties.name`,
`properties.id` o el `id` de la geometría. En el GeoJSON actual, los códigos de
gasoducto se encuentran en `properties.name`.

## Uso del Chatbot

El chatbot se muestra como una ventana en la esquina inferior derecha del dashboard.
El mapa permanece visible e interactivo; abrir o cerrar el chat no navega a otro
documento ni reinicia la selección, las curvas o la conversación.

### Acceso al Chatbot:

1. Desde el dashboard principal, haz clic en "Tecbot" o en el botón flotante inferior.
2. Selecciona un punto en el mapa o la barra lateral, o indica su nombre en la consulta.
3. Escribe tu consulta en lenguaje natural y presiona Enter o haz clic en "Enviar"
4. Cierra la ventana con la cruz o Escape mientras el foco esté dentro del chat.

### Contexto en memoria

`buildMeasurementContext()` en `chatbot/chatbot.js` construye la variable
`AppState.measurementContext` al enviar cada consulta. Reutiliza las mismas series
de `AppState.pointChartData` que muestran Pressure y ECharts. Si un punto aún no
tiene serie, la genera una vez mediante `getMeasurementData()`.

El contexto incluye todos los puntos, sus unidades, IDs y nombres de sensores cuando están definidos,
presiones upstream/downstream, mínimos contractuales y fechas; identifica también
el punto seleccionado. Las fechas se envían una sola vez en `timestamps`, y cada
valor de las series corresponde a la misma posición de ese array.

No se crean archivos de mediciones ni se usa localStorage o sessionStorage.
El objeto se serializa como JSON solamente para enviar la solicitud HTTP:
`{ query, measurementContext }`. Los datos y la conversación se pierden al recargar
o cerrar la página. Abrir la antigua URL `chatbot/index.html` redirige al dashboard;
el acceso habitual desde Tecbot permanece en la página actual.

Lambda valida el contexto y lo incorpora al mensaje de Bedrock. Las instrucciones
del modelo indican que los datos son simulados, que Pressure es el último valor
upstream y que no debe inventar pronósticos ni información ausente. Cada consulta
incluye la selección actual; no se envía el historial de mensajes del chat.

**Despliegue:** además de publicar el frontend actualizado, hay que desplegar
`lambda/chatbot/lambda_function.py` siguiendo el procedimiento de Terraform de esta
documentación. Estos cambios de código no despliegan automáticamente recursos en AWS ni prueban una inferencia real.

Pruebas del backend sin invocar AWS:

```powershell
python -B -m unittest discover -s tests -v
```

### Ejemplos de consultas:

- "¿Cuál es la última presión simulada del Sistema Tandil - MDP?"
- "¿Cuál es la última presión upstream de este punto?"
- "¿Qué puntos están por debajo del mínimo contractual?"
- "Muéstrame la variación de presión de este punto en las últimas 24 horas disponibles"

El chatbot se conecta a AWS API Gateway y devuelve respuestas basadas en el contexto
simulado de la sesión. Las respuestas del modelo, especialmente sus cálculos,
deben contrastarse con los datos del gráfico.

## Mantenimiento

- Actualiza `js/data.js` para modificar las unidades, puntos y códigos asociados al GeoJSON.
- Publica cambios de HTML, JavaScript, CSS y GeoJSON mediante `terraform plan` y `terraform apply`.
- Si modificas el contexto o el contrato de la API, actualiza también `lambda/chatbot/lambda_function.py` y despliega el backend con Terraform.
- Ejecuta las pruebas del backend antes de desplegar cambios en la validación o el envío del contexto a Bedrock.
