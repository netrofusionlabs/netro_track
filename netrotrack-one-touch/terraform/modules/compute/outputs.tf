output "instance_name" { value = data.google_compute_instance.existing.name }
output "instance_group_name" { value = google_compute_instance_group.this.name }
output "instance_self_link" { value = data.google_compute_instance.existing.self_link }
output "network_self_link" { value = data.google_compute_instance.existing.network_interface[0].network }
output "service_account_email" { value = data.google_compute_instance.existing.service_account[0].email }
