resource "google_storage_bucket" "terraform_state" {
  project                     = var.project_id
  name                        = var.terraform_state_bucket
  location                    = var.location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning { enabled = true }
}
