#!/usr/bin/env pwsh
# sync-index — regenerate the DS index on the Markup server.
# Replaces `markup-cli sync-index`. Exit: 0 ok, 1 net error, 2 missing env.
$ErrorActionPreference = 'Stop'
if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }
try {
  Invoke-RestMethod -Method Post -Uri "$($env:MARKUP_URL)/api/ds/sync-index" `
    -Headers @{ Authorization = "Bearer $($env:MARKUP_TOKEN)"; 'Content-Type' = 'application/json' } `
    -Body '{}' -TimeoutSec 10 | ConvertTo-Json -Compress -Depth 4
  exit 0
} catch {
  [Console]::Error.WriteLine('sync-index: server error or unreachable')
  exit 1
}
