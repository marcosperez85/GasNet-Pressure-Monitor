provider "aws" {
  region  = "us-east-1"
  profile = "trabajo"
}

# Se recomienda que siempre esté esta sección de abajo para evitar problemas de versiones.
# Además hace que el proyecto sea reproducible y es un estándar profesional.
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}