# GasNet-Pressure-Monitor

Dashboard de presiones simuladas con Google Maps, ECharts y Tecbot, una ventana
flotante que utiliza **Strands Agents SDK** y Amazon Bedrock. Conserva la única
Lambda `POC-chatbot` y el endpoint `/chat` existentes.

## Arquitectura

```text
Navegador → CloudFront → archivos estáticos en S3 (tecnet-dashboard)
                └────→ /chat → API Gateway → Lambda POC-chatbot
                                                ├─ estado / escenarios → S3
                                                └─ Strands → Bedrock → herramientas → S3
```

El frontend inicia la simulación con los valores de `Math.random()` de `chart.js`
sólo cuando no existe un estado guardado. La Lambda valida esos datos y crea
`simulation/state.json` con una escritura condicional. Desde entonces **S3 es la
fuente compartida** para gráficos, escenarios y herramientas; otro navegador no
reemplaza los datos con sus propios valores aleatorios.

No se agrega otra Lambda, base de datos, Knowledge Base ni colaboración entre
agentes. No se procesan datasets de presión CSV. El GeoJSON sigue dibujando los
tramos del mapa. No hay operaciones sobre equipos industriales.

## Estructura

```text
GasNet-Pressure-Monitor/
├── index.html                     # Dashboard y ventana flotante
├── style_landing.css
├── config.template.js
├── config.js                      # Sólo desarrollo local, ignorado por Git
├── requirements.txt               # Strands/boto3 para backend y pruebas
├── requirements-lambda.lock       # Dependencias fijadas para Linux/Python 3.11
├── js/
│   ├── state.js                   # Caché local del estado compartido
│   ├── dom.js
│   ├── data.js                    # Catálogo de puntos y parámetros físicos
│   ├── config-check.js
│   ├── main.js
│   ├── map.js                     # Google Maps y selección de tramos
│   ├── sidebar.js                 # Tarjetas y selección de puntos
│   ├── chart.js                   # Simulación inicial, ECharts y botón de escenario
│   ├── simulation-api.js          # Lectura/sincronización del estado mediante /chat
│   ├── calcularLinepack.js
│   └── navigation.js
├── chatbot/
│   ├── chatbot.js                 # Conversación, contexto de selección y enlaces de reportes
│   ├── widget.css
│   └── index.html                 # Redirige enlaces antiguos a ../index.html#tecbot
├── data/
│   └── Gasoductos_y_ramales_CGP_05per.json
├── lambda/chatbot/
│   ├── lambda_function.py         # Mismo handler; despacha acciones y chat
│   ├── measurement_state.py       # Acceso S3, validación, escenarios y cálculos compartidos
│   ├── agent_tools.py             # Las cuatro herramientas y creación de borradores
│   └── chat_agent.py              # Agente Strands, modelo Bedrock y límites de ejecución
├── templates/
│   └── incident.html              # Template privado que Terraform carga en S3
├── scripts/
│   └── build_lambda.py            # Dependencias Linux + código para el ZIP existente
├── tests/
│   ├── test_agent.py              # Estado, API, herramientas y ciclo real de Strands con AWS simulado
│   └── test_simulation.js         # Botón, sincronización, errores y enlaces; sin npm
└── terraform/
    ├── provider.tf                # AWS us-east-1, perfil trabajo; proveedores fijados
    ├── variables.tf
    ├── outputs.tf
    ├── frontend.tf                # S3 privado, CloudFront OAC y proxy /chat
    ├── simulation.tf              # Template y permisos S3 de la Lambda
    ├── api_gateway.tf
    ├── lambda.tf                  # ZIP, variables de entorno y Lambda existente
    ├── security.tf                # IAM, API key, plan de uso y backend de Terraform
    ├── main.tf                    # Reservado, actualmente vacío
    ├── bedrock.tf                 # Reservado, actualmente vacío
    ├── terraform.tfvars.example
    ├── .terraform.lock.hcl
    ├── lambda.zip                # Artefacto heredado; no se usa para desplegar
    └── tests/frontend.tftest.hcl  # Infraestructura con proveedores simulados
```

Se omiten `.venv/`, `build/`, cachés, planes, state, tfvars privados y el ZIP
generado `terraform/POC-chatbot-lambda.zip`. `tests/test_agent.py` reemplaza las
pruebas anteriores de `test_chat_context.py`.

## Estado y escenarios

El botón **Escenario caída de presión** envía una acción a la misma Lambda. Ésta
modifica sólo el downstream del punto seleccionado: las últimas seis muestras
horarias descienden progresivamente hasta el 80 % del mínimo contractual guardado.
**Restaurar escenario normal** recupera exactamente la serie original. Upstream,
fechas y otros puntos se conservan. El gráfico y Line Pack se actualizan con la
respuesta confirmada de S3; un error no activa una anomalía local ficticia.

Los cambios sobreviven a las recargas y son compartidos por todos los navegadores
de esta demo. La página sincroniza al abrirse, recuperar el foco, cada 30 segundos
y antes de consultar al bot. El control de versión y `If-Match` evitan perder
cambios concurrentes: ante un conflicto se vuelve a leer el estado y se pide
reintentar. Si S3 no está disponible se informa el error y no se habilita el botón
hasta sincronizar.

La simulación es una **instantánea**, no un generador continuo. Sus fechas no
avanzan al recargar. “Última hora” significa la última hora del historial
persistido, con las dos muestras horarias disponibles; no se interpolan ni
inventan mediciones. El comienzo de la caída puede ser anterior a esa hora.

Si se cambia el catálogo de `data.js`, es necesario migrar el estado persistido.
Para reiniciar deliberadamente esta demo se puede respaldar y eliminar
`simulation/state.json` desde S3 y recargar la página; no lo hace Terraform ni
el chatbot automáticamente. Los incidentes existentes permanecen guardados.

## Herramientas y reportes

| Herramienta | Resultado |
| --- | --- |
| `get_asset_status` | Estado de un punto o todos: upstream, downstream actual/normal, mínimo, desviación, calidad SIMULATED, escenario y fecha. |
| `get_active_alarms` | Alarmas de downstream inferior al mínimo, por punto o todo el sitio; ID, tipo, severidad HIGH, mensaje, fecha y estado ACTIVE. |
| `get_tag_history` | Última hora de downstream, upstream o minimum del punto indicado/seleccionado/de la conversación. |
| `create_incident_draft` | Lee los hechos y el template desde S3, crea un HTML DRAFT privado y devuelve su ID y enlace temporal. |

La presión esperada es la última muestra downstream del escenario normal. La
desviación es `(actual - normal) / normal × 100`; se distingue del mínimo contractual.
No se inventan unidades físicas. Los nombres repetidos requieren unidad o clave
única. Para datos ausentes o errores, el agente debe explicarlo sin inventar hechos.

El agente puede responder saludos directamente y decidir qué herramientas de
lectura necesita. La herramienta de escritura sólo se registra si el **mensaje
actual** contiene una solicitud directa como “Generá un reporte del incidente”
o “Podés crear un informe de este incidente?”. Consultas, negaciones, ejemplos
y solicitudes hipotéticas no habilitan escritura. El historial del chat no
autoriza nuevos reportes. Si la formulación no se reconoce, el bot pide una
solicitud directa. No existe una herramienta para aprobar incidentes.

El borrador requiere una alarma activa. Sus valores se calculan desde el estado
S3, nunca desde cifras aportadas por el modelo. Incluye ID, fecha, punto, alarma,
presiones, desviación, severidad, descripción, evidencia, recomendaciones y DRAFT.
Los valores se escapan antes de insertar HTML. Un ID de solicitud permite
reintentar una petición fallida sin duplicar el reporte del mismo punto.

La ventana muestra texto legible y, al crear un borrador, un enlace **Abrir
borrador** válido durante 15 minutos. El objeto persiste después de expirar el
enlace. El enlace firmado permite leer ese objeto a quien lo posea durante su
vigencia. No se publica el reporte mediante CloudFront.

### Objetos del bucket

| Key | Administración y acceso |
| --- | --- |
| `index.html`, `js/*`, etc. | Lista explícita de Terraform; lectura pública mediante CloudFront OAC. |
| `config.js` | Generado por Terraform, sin API key de API Gateway. |
| `simulation/state.json` | Creado al abrir la interfaz por primera vez; lectura/escritura de Lambda. |
| `templates/incident.html` | Terraform carga `templates/incident.html`; Lambda sólo lo lee. |
| `incidents/INC-….html` | Lambda crea los DRAFT; lectura mediante URL firmada. |

La política de CloudFront permite sólo los archivos estáticos enumerados. No
permite leer estado, template ni incidentes. El rol de Lambda agrega Get/Put
únicamente sobre estado e incidentes, Get sobre el template y ListBucket limitado
al prefijo exacto del estado para distinguir ausencia de objeto y acceso denegado.
No tiene DeleteObject. Se conserva el permiso existente de Bedrock InvokeModel.

### Contrato de la API

Todos los mensajes usan `POST /chat` y JSON:

- `{ "action": "get_state" }` → `{ "state": ... }`.
- `{ "action": "initialize_state", "measurementContext": ... }` → crea sólo si no existe.
- `{ "action": "set_scenario", "assetKey": "…", "active": true, "version": "…" }` → estado confirmado.
- `{ "query": "…", "selectedPointKey": "…", "conversationAssetKey": "…", "history": [...], "requestId": "UUID" }`
  → `{ "response": "Texto", "incidents": [...], "conversationAssetKey": "…" }`.

`query` y `response` conservan el contrato anterior. El formato antiguo
`{query, measurementContext}` también se admite: puede inicializar un estado
ausente, pero jamás sobrescribe mediciones ya persistidas. El frontend nuevo sólo
envía todas las series durante la inicialización.

Los últimos diez mensajes y el punto de la conversación se conservan en memoria
del navegador, sin localStorage. Cerrar la ventana no los borra; recargar sí.
La simulación y los reportes persisten en S3 independientemente del chat.

## Instalación y pruebas

Requisitos: Python 3.11 o posterior, Terraform 1.7 o posterior y un navegador.
Node.js es opcional para ejecutar el test JavaScript. No se necesita npm.
Ahora sí hay dependencias Python reales para el backend; el entorno virtual
mantiene esas dependencias separadas de otras aplicaciones.

Desde **Bash**, en la raíz del repositorio:

```bash
python -m venv .venv
# Git Bash en Windows:
source .venv/Scripts/activate
# En Linux/macOS, usar en cambio: source .venv/bin/activate

python -m pip install -r requirements.txt
python -B -m unittest discover -s tests -v
node tests/test_simulation.js # opcional; requiere Node.js instalado
python scripts/build_lambda.py
```

Las pruebas Python ejecutan el SDK real de Strands con clientes S3/Bedrock
simulados: no invocan modelos ni modifican AWS. Verifican estado normal, caída,
restauración, concurrencia, alarmas, historia, template, DRAFT, ausencia de
escrituras en consultas, datos inválidos, assets ambiguos/inexistentes y errores
S3/Bedrock. El test JavaScript simula DOM/HTTP para comprobar el botón, gráficos
alimentados por el estado, errores y enlaces seguros; no reemplaza una prueba
visual en el navegador.

El build descarga wheels **Linux x86_64 / Python 3.11**, incluso desde Windows,
verifica las dependencias y prepara `build/lambda`. Terraform sigue usando
`archive_file` y el mismo ZIP. No se empaqueta `.venv`. Hay que reconstruir después
de modificar Python o dependencias: Terraform rechaza un paquete desactualizado.
Si cambiás `lambda_path`, pasá esa ruta de código a `build_lambda.py --source`.

## Despliegue con Terraform (Bash)

La configuración conserva AWS `us-east-1`, perfil `trabajo`, el backend existente
`terraform-state-mdp`, key `POC-chatbot/terraform.tfstate` y tabla `terraform-lock`.
No migres ni copies el state `bedrock-app/terraform.tfstate` a esta POC.

Configurá `google_maps_api_key` en `terraform/terraform.tfvars` a partir del
archivo `.example`, o mediante `TF_VAR_google_maps_api_key`. El bucket
`tecnet-dashboard` debe estar disponible o ya administrado en este state; si
existe fuera del state se debe importar, no vaciar ni recrear.

Con el entorno virtual activo y las pruebas anteriores aprobadas:

```bash
export AWS_PROFILE=trabajo
export TF_DATA_DIR="$PWD/terraform/.terraform-poc"
export TF_WORKSPACE=default

python scripts/build_lambda.py
terraform -chdir=terraform init -reconfigure
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform validate
terraform -chdir=terraform test
terraform -chdir=terraform plan -out=poc.tfplan

# Revisar el plan antes de aplicar:
terraform -chdir=terraform apply poc.tfplan
terraform -chdir=terraform output -raw frontend_url
```

`plan` no despliega: `apply` actualiza frontend, código y dependencias de la
Lambda, variables, permisos y template. **No hace falta subir el template a mano.**
La simulación se crea en la primera apertura exitosa posterior al despliegue.
Generá siempre un plan nuevo después de modificar archivos. CloudFront puede
tardar varios minutos en distribuir cambios.

Las pruebas Terraform usan proveedores simulados: aunque internamente indiquen
`command = apply`, no despliegan recursos reales. El plan real debe conservar
los recursos de la POC y no modificar `ophub-chatbot` ni `lambda-bedrock-role`.

Variables de entorno de la Lambda: `BEDROCK_MODEL_ID`, `STATE_BUCKET`, `STATE_KEY`,
`INCIDENT_TEMPLATE_KEY` e `INCIDENTS_PREFIX`, administradas por Terraform.
`AWS_REGION` proviene de Lambda. La variable Terraform `bedrock_model_id` conserva
el perfil de inferencia que ya utilizaba el chatbot. Las credenciales provienen
del rol IAM, no del código ni del navegador.

Se conserva el endpoint síncrono de API Gateway: Lambda tiene 28 segundos y el
agente limita rondas, herramientas y tiempos de red. Una consulta demasiado
lenta devuelve un error para reintentar o precisar la pregunta; no hay trabajo
asíncrono en segundo plano. Si el borrador ya se guardó y falla el resumen final,
se devuelve igualmente el enlace. El logging de API Gateway usa la configuración
regional existente; se desactiva el registro de cuerpos completos de mensajes.

### Configuración pública

Terraform no sube `config.js` local. Genera Google Maps API key y
`API_GATEWAY_URL: '/chat'`; CloudFront agrega `x-api-key` al origen de API Gateway.
La clave de Maps debe restringirse al dominio de CloudFront y a Maps JavaScript
API desde Google Cloud. El bucket bloquea el acceso público y no usa Website Hosting.

El sitio y `/chat` siguen siendo públicos: ocultar la clave del origen **no
autentica usuarios**. Los visitantes de esta demo comparten la simulación y
pueden activar escenarios y solicitar borradores. Una aplicación privada
requeriría autenticación/autorización, fuera del alcance de esta implementación.
El state y los planes de Terraform contienen datos sensibles; no se deben publicar.

Para desarrollo local, completá `config.js` usando `config.template.js` con Maps,
URL y API key de API Gateway de la POC. Serví el sitio con:

```bash
python -m http.server 8000
```

Abrí `http://localhost:8000`; no uses `file://`. La API local configurada debe ser
la versión desplegada con Strands y persistencia. El mapa sigue funcionando por
Google Maps y el GeoJSON, sin reemplazar su vista por el chat.

## Verificación después de desplegar

Si al ejecutar localmente aparece “La consulta debe contener entre 1 y 4000
caracteres” durante la sincronización, la API puede seguir apuntando a la Lambda
anterior. `pip install`, las pruebas y `build_lambda.py` sólo preparan archivos
locales: es necesario aplicar el despliegue de Terraform y comprobar que
`API_GATEWAY_URL` en `config.js` corresponda a esa API actualizada. Incluso servido
desde localhost, este frontend utiliza el backend de AWS; `http.server` no ejecuta
la Lambda Python. El chat sincroniza antes de enviar la pregunta, por lo que el
mismo error también puede impedir todas las consultas.

1. Abrir el dashboard y esperar “Escenario compartido sincronizado”.
2. Seleccionar `037-001`, activar la caída y comprobar downstream inferior a 34.
3. Recargar u abrir otro navegador: debe conservarse la misma caída.
4. Preguntar “¿Qué está sucediendo en el sistema?”: debe identificar punto y alarma.
5. Preguntar “¿Cómo evolucionó la presión durante la última hora?”: debe describir las muestras persistidas.
6. Pedir “Generá un reporte del incidente”: debe aparecer ID, DRAFT y enlace al HTML.
7. Abrir el enlace y verificar datos, evidencia y pendiente de revisión humana.
8. Consultar sólo el estado nuevamente: no debe generarse otro incidente.
9. Restaurar el escenario normal: debe desaparecer la alarma y recuperarse downstream.

La validación con clientes simulados no prueba credenciales, permisos efectivos,
latencia ni inferencia real en tu cuenta. Esos pasos se verifican tras `apply`.

## Mapa, gráficos y Line Pack

La selección entre mapa y barra lateral sigue sincronizada. Se muestran 72 horas
de historial, inicialmente las últimas 24, con DataZoom y leyendas. Pressure
muestra el último upstream con dos decimales. Los códigos del GeoJSON se buscan
en `properties.name`, `properties.id` o `id` de la geometría.

`calcularLinepack.js` usa `P = (upstream + downstream) / 2`, `A = πD²/4` y
`Line Pack = (P × A × L)/(Z × R × T)`, con parámetros de `data.js`, sin conversiones.
Si faltan parámetros se muestra `—`; actualmente sólo los cuatro puntos de Mar
del Plata tienen configuración física completa.

## Referencias

- [Strands Python SDK](https://strandsagents.com/docs/user-guide/sdk/quickstart/python/).
- [Hooks de Strands](https://strandsagents.com/docs/user-guide/sdk/agents/hooks-events/).
- [Escrituras condicionales S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html).
