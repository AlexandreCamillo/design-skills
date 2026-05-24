#!/usr/bin/env pwsh
param(
  [Parameter(Mandatory=$true, Position=0)][string]$File,
  [Parameter(Position=1)][string]$Slug
)
$ErrorActionPreference = 'Stop'

if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }
if (-not (Test-Path $File)) { [Console]::Error.WriteLine("file not found: $File"); exit 4 }

$headers = @{
  Authorization  = "Bearer $($env:MARKUP_TOKEN)"
  'Content-Type' = 'text/html'
}
if ($Slug) { $headers['X-Mockup-Slug'] = $Slug }

try {
  Invoke-RestMethod -Method Post -Uri "$($env:MARKUP_URL)/api/mockups" `
    -Headers $headers -InFile $File -TimeoutSec 30 | ConvertTo-Json -Compress -Depth 4
  exit 0
} catch {
  [Console]::Error.WriteLine('mockup-upload: upload failed')
  exit 1
}
