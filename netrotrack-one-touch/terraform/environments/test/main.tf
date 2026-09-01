terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    bucket = "netrotrack-test-tfstate-netro-track-prod"
    prefix = "production"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

module "compute" {
  source = "../../modules/compute"

  project_id       = var.project_id
  name             = var.name
  zone             = var.zone
  existing_vm_name = var.existing_vm_name
  backend_port     = var.backend_port
}

module "storage" {
  source = "../../modules/storage"

  project_id             = var.project_id
  terraform_state_bucket = "${var.name}-terraform-state-${var.project_id}"
  location               = var.storage_location
}

module "network" {
  source = "../../modules/network"

  project_id             = var.project_id
  name                   = var.name
  firewall_name          = var.firewall_name
  network_self_link      = module.compute.network_self_link
  target_service_account = module.compute.service_account_email
  backend_port           = var.backend_port
}

module "load_balancer" {
  source = "../../modules/load_balancer"

  project_id                 = var.project_id
  name                       = var.name
  domain                     = var.domain
  zone                       = var.zone
  instance_group_name        = module.compute.instance_group_name
  backend_port               = var.backend_port
  global_address_name        = var.global_address_name
  health_check_name          = var.health_check_name
  backend_service_name       = var.backend_service_name
  https_url_map_name         = var.https_url_map_name
  certificate_name           = var.certificate_name
  https_proxy_name           = var.https_proxy_name
  https_forwarding_rule_name = var.https_forwarding_rule_name
  http_redirect_url_map_name = var.http_redirect_url_map_name
  http_redirect_proxy_name   = var.http_redirect_proxy_name
  http_forwarding_rule_name  = var.http_forwarding_rule_name
  enable_http_redirect       = true
}
