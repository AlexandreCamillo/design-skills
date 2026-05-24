#!/usr/bin/env pwsh
param(
  [Parameter(Mandatory=$true, Position=0)][string]$File,
  [Parameter(Mandatory=$true, Position=1)][string]$Slug
)
$ErrorActionPreference = 'Stop'

if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }
if (-not (Test-Path $File)) { [Console]::Error.WriteLine("promote: source file not found: $File"); exit 4 }
# Slug must be kebab-case (matches the convention used everywhere in the skill).
# Constrains the value so the subsequent -match/regex::Replace patterns can interpolate
# it without regex/replacement metacharacter risk.
if ($Slug -notmatch '^[a-z][a-z0-9-]*$') {
  [Console]::Error.WriteLine("promote: slug must match ^[a-z][a-z0-9-]*$ (kebab-case): $Slug"); exit 4
}

$dsDir = 'docs/design/design-system'
New-Item -ItemType Directory -Force -Path $dsDir | Out-Null

$max = 0
Get-ChildItem -Path $dsDir -Filter '[0-9][0-9]-*.html' -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.Name -match '^(\d{2})-') {
    $n = [int]$Matches[1]
    if ($n -gt $max) { $max = $n }
  }
}
$next = '{0:D2}' -f ($max + 1)
$dest = Join-Path $dsDir "$next-$Slug.html"

Copy-Item -Path $File -Destination $dest

$content = Get-Content -Raw -Path $dest
if ($content -notmatch "data-ds-component=`"$Slug`"") {
  $content = [regex]::Replace($content, '<body([^>]*)>', "<body`$1 data-ds-component=`"$Slug`">", 1)
  Set-Content -Path $dest -Value $content -NoNewline
}

try {
  $resp = Invoke-RestMethod -Method Post -Uri "$($env:MARKUP_URL)/api/ds/components" `
    -Headers @{ Authorization = "Bearer $($env:MARKUP_TOKEN)"; 'Content-Type' = 'text/html'; 'X-Component-Slug' = $Slug } `
    -InFile $dest -TimeoutSec 30
  Write-Output "promote: ok — wrote $dest, server resp: $($resp | ConvertTo-Json -Compress -Depth 4)"
  exit 0
} catch {
  [Console]::Error.WriteLine("promote: upload failed (local file written: $dest)")
  exit 1
}
