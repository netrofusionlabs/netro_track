resource "google_compute_firewall" "lb_to_backend" {
  project = var.project_id
  name    = var.firewall_name
  network = var.network_self_link

  allow {
    protocol = "tcp"
    ports    = [tostring(var.backend_port)]
  }

  source_ranges           = ["35.191.0.0/16", "130.211.0.0/22"]
  target_service_accounts = [var.target_service_account]
}
