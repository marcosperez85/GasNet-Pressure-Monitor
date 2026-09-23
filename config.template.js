// Configuración para desarrollo local: copiar como config.js (excluido de Git).
// En AWS, Terraform genera otro config.js con Google Maps y API_GATEWAY_URL: '/chat'.
// CloudFront agrega la clave de API Gateway al reenviar la solicitud al origen.

const CONFIG = {
  GOOGLE_MAPS_API_KEY: 'API KEY DE GOOGLE MAPS',
  API_GATEWAY_URL: 'URL DEL API GATEWAY',
  API_GATEWAY_KEY: 'API KEY DEL NUEVO API GATEWAY'
};
