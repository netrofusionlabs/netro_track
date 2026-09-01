variable "project_id" { type = string }
variable "name" {
  type    = string
  default = "netrotrack-prod"
}
variable "region" {
  type    = string
  default = "us-central1"
}
variable "zone" {
  type    = string
  default = "us-central1-a"
}
variable "existing_vm_name" { type = string }
variable "firewall_name" {
  type    = string
  default = "netrotrack-allow-lb"
}
variable "backend_port" {
  type    = number
  default = 3000
}
variable "storage_location" {
  type    = string
  default = "US"
}
variable "domain" {
  type    = string
  default = "netro-track-api.netrofusion.in"
}
variable "global_address_name" {
  type    = string
  default = "netrotrack-prod-ip"
}
variable "health_check_name" {
  type    = string
  default = "netrotrack-backend-health"
}
variable "backend_service_name" {
  type    = string
  default = "netrotrack-backend-service"
}
variable "https_url_map_name" {
  type    = string
  default = "netrotrack-prod-url-map"
}
variable "certificate_name" {
  type    = string
  default = "netrotrack-api-cert"
}
variable "https_proxy_name" {
  type    = string
  default = "netrotrack-prod-https-proxy"
}
variable "https_forwarding_rule_name" {
  type    = string
  default = "netrotrack-prod-https-rule"
}
variable "http_redirect_url_map_name" {
  type    = string
  default = "netrotrack-http-redirect-map"
}
variable "http_redirect_proxy_name" {
  type    = string
  default = "netrotrack-prod-http-redirect-proxy"
}
variable "http_forwarding_rule_name" {
  type    = string
  default = "netrotrack-prod-http-rule"
}
