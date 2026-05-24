#!/usr/bin/env pwsh
# doctor — version check + reachability probe. Replaces `markup-cli doctor --json`.
# Output: JSON to stdout matching the legacy schema's `markup` block.
# Exit:   0 = reachable; 1 = network error; 2 = missing env var.
$ErrorActionPreference = 'Stop'
if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }

$headers = @{ Authorization = "Bearer $($env:MARKUP_TOKEN)" }
try {
  $resp = Invoke-RestMethod -Uri "$($env:MARKUP_URL)/api/version" `
    -Headers $headers -TimeoutSec 5 -ErrorAction Stop
  $payload = @{ markup = @{ configured = $true; url = $env:MARKUP_URL; actual = $resp.version; api = 'v1'; ok = $true } }
  $payload | ConvertTo-Json -Compress -Depth 4
  exit 0
} catch {
  $payload = @{ markup = @{ configured = $true; url = $env:MARKUP_URL; ok = $false; error = 'unreachable' } }
  $payload | ConvertTo-Json -Compress -Depth 4
  exit 1
}
