data "google_compute_instance" "existing" {
  project = var.project_id
  name    = var.existing_vm_name
  zone    = var.zone
}

resource "google_compute_instance_group" "this" {
  project = var.project_id
  zone    = var.zone
  name    = "${var.name}-ig"

  # Terraform owns this unmanaged group, not the existing VM.
  instances = [data.google_compute_instance.existing.self_link]

  named_port {
    name = "http"
    port = var.backend_port
  }
}
