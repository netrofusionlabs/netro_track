output "ip_address" { value = google_compute_global_address.this.address }
output "health_check_name" { value = google_compute_health_check.this.name }
output "backend_service_name" { value = google_compute_backend_service.this.name }
output "ssl_certificate_name" { value = google_compute_managed_ssl_certificate.this.name }
