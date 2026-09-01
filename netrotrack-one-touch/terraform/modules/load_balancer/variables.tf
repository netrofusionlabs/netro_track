variable "project_id" { type = string }
variable "name" { type = string }
variable "domain" { type = string }
variable "zone" { type = string }
variable "instance_group_name" { type = string }
variable "backend_port" { type = number }
variable "global_address_name" { type = string }
variable "health_check_name" { type = string }
variable "backend_service_name" { type = string }
variable "https_url_map_name" { type = string }
variable "certificate_name" { type = string }
variable "https_proxy_name" { type = string }
variable "https_forwarding_rule_name" { type = string }
variable "http_redirect_url_map_name" { type = string }
variable "http_redirect_proxy_name" { type = string }
variable "http_forwarding_rule_name" { type = string }
variable "enable_http_redirect" {
  type    = bool
  default = true
}
