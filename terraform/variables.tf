variable "lambda_path" {
  default = "../lambda/chatbot"
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
