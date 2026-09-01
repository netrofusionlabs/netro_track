output "load_balancer_ip" {
  value = module.load_balancer.ip_address
}

output "api_url" {
  value = "https://${var.domain}"
}

output "instance_name" {
  value = module.compute.instance_name
}
