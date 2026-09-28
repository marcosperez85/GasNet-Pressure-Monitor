locals {
  simulation_state_key  = "simulation/state.json"
  incident_template_key = "templates/incident.html"
  incidents_prefix      = "incidents/"
}

# Terraform owns the template; the Lambda alone owns the live state and reports.
resource "aws_s3_object" "incident_template" {
  bucket        = aws_s3_bucket.frontend.id
  key           = local.incident_template_key
  source        = "${path.module}/../templates/incident.html"
  source_hash   = filemd5("${path.module}/../templates/incident.html")
  content_type  = "text/html; charset=utf-8"
  cache_control = "no-store"
}

resource "aws_iam_role_policy" "simulation_storage" {
  name = "simulation-state-and-drafts"
  role = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${aws_s3_bucket.frontend.arn}/${local.simulation_state_key}", "${aws_s3_bucket.frontend.arn}/${local.incidents_prefix}*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.frontend.arn}/${local.incident_template_key}"
      },
      {
        # Enables a distinguishable 404 for absent state, without listing the bucket.
        Effect    = "Allow"
        Action    = ["s3:ListBucket"]
        Resource  = aws_s3_bucket.frontend.arn
        Condition = { StringEquals = { "s3:prefix" = local.simulation_state_key } }
      }
    ]
  })
}
