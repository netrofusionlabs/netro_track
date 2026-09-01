resource "google_compute_global_address" "this" {
  project = var.project_id
  name    = var.global_address_name
}

resource "google_compute_health_check" "this" {
  project             = var.project_id
  name                = var.health_check_name
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = var.backend_port
    request_path = "/health"
  }
}

resource "google_compute_backend_service" "this" {
  project               = var.project_id
  name                  = var.backend_service_name
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  health_checks         = [google_compute_health_check.this.id]

  backend {
    group = "projects/${var.project_id}/zones/${var.zone}/instanceGroups/${var.instance_group_name}"
  }
}

resource "google_compute_url_map" "https" {
  project         = var.project_id
  name            = var.https_url_map_name
  default_service = google_compute_backend_service.this.id
}

resource "google_compute_managed_ssl_certificate" "this" {
  project = var.project_id
  name    = var.certificate_name

  managed {
    domains = [var.domain]
  }
}

resource "google_compute_target_https_proxy" "this" {
  project          = var.project_id
  name             = var.https_proxy_name
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.this.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = var.https_forwarding_rule_name
  target                = google_compute_target_https_proxy.this.id
  port_range            = "443"
  ip_address            = google_compute_global_address.this.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

resource "google_compute_url_map" "http_redirect" {
  project = var.project_id
  name    = var.http_redirect_url_map_name

  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
  }
}

resource "google_compute_target_http_proxy" "redirect" {
  project = var.project_id
  name    = var.http_redirect_proxy_name
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  project               = var.project_id
  name                  = var.http_forwarding_rule_name
  target                = google_compute_target_http_proxy.redirect.id
  port_range            = "80"
  ip_address            = google_compute_global_address.this.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
