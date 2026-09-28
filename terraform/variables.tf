variable "lambda_path" {
  description = "Código fuente incluido por scripts/build_lambda.py; reconstruir el paquete tras editarlo."
  default     = "../lambda/chatbot"
}

variable "bedrock_model_id" {
  description = "Perfil de inferencia Bedrock ya utilizado por el chatbot."
  type        = string
  default     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}

variable "google_maps_api_key" {
  description = "Clave pública de Maps JavaScript API, restringida por sitio web en Google Cloud."
  type        = string
  sensitive   = true
  validation {
    condition     = length(trimspace(var.google_maps_api_key)) > 0
    error_message = "Indica la clave de Google Maps en terraform.tfvars o TF_VAR_google_maps_api_key."
  }
}
