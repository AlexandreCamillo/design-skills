#!/usr/bin/env pwsh
param(
  [Parameter(Mandatory=$true, Position=0)][ValidateSet('list','read','reply','react','resolve')][string]$Sub,
  [Parameter(Position=1)][string]$Arg1,
  [Parameter(Position=2)][string]$Arg2,
  [Parameter(Position=3)][string]$Arg3,
  [Parameter(Position=4)][string]$Arg4
)
$ErrorActionPreference = 'Stop'
if (-not $env:MARKUP_URL)   { [Console]::Error.WriteLine('MARKUP_URL not set');   exit 2 }
if (-not $env:MARKUP_TOKEN) { [Console]::Error.WriteLine('MARKUP_TOKEN not set'); exit 2 }

$headers = @{ Authorization = "Bearer $($env:MARKUP_TOKEN)"; 'Content-Type' = 'application/json' }
$base = $env:MARKUP_URL

try {
  switch ($Sub) {
    'list' {
      if (-not $Arg1) { [Console]::Error.WriteLine('usage: comment list <mockup-id> [--status <s>]'); exit 4 }
      $qs = ''
      if ($Arg2 -eq '--status' -and $Arg3) { $qs = "?status=$Arg3" }
      Invoke-RestMethod -Uri "$base/api/mockups/$Arg1/comments$qs" -Headers $headers | ConvertTo-Json -Compress -Depth 6
    }
    'read' {
      if (-not $Arg1) { [Console]::Error.WriteLine('usage: comment read <id>'); exit 4 }
      Invoke-RestMethod -Uri "$base/api/comments/$Arg1" -Headers $headers | ConvertTo-Json -Compress -Depth 6
    }
    'reply' {
      if (-not $Arg1 -or -not $Arg2) { [Console]::Error.WriteLine('usage: comment reply <id> <body>'); exit 4 }
      $payload = @{ body = $Arg2 } | ConvertTo-Json -Compress
      Invoke-RestMethod -Method Post -Uri "$base/api/comments/$Arg1/replies" -Headers $headers -Body $payload | ConvertTo-Json -Compress -Depth 6
    }
    'react' {
      if (-not $Arg1 -or -not $Arg2) { [Console]::Error.WriteLine('usage: comment react <id> <emoji>'); exit 4 }
      $payload = @{ emoji = $Arg2 } | ConvertTo-Json -Compress
      Invoke-RestMethod -Method Post -Uri "$base/api/comments/$Arg1/reactions" -Headers $headers -Body $payload | ConvertTo-Json -Compress -Depth 6
    }
    'resolve' {
      if (-not $Arg1) { [Console]::Error.WriteLine('usage: comment resolve <id> [<body>]'); exit 4 }
      $payload = if ($Arg2) { @{ body = $Arg2 } | ConvertTo-Json -Compress } else { '{}' }
      Invoke-RestMethod -Method Post -Uri "$base/api/comments/$Arg1/resolve" -Headers $headers -Body $payload | ConvertTo-Json -Compress -Depth 6
    }
  }
  exit 0
} catch {
  [Console]::Error.WriteLine("comment: request failed: $($_.Exception.Message)")
  exit 1
}
