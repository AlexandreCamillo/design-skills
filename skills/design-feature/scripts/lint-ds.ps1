#!/usr/bin/env pwsh
param([Parameter(Mandatory=$true, Position=0)][string]$File)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $File)) { [Console]::Error.WriteLine("lint-ds: file not found: $File"); exit 4 }

$body = Get-Content -Raw -Path $File
$fail = $false

# §1 — row-states block with at least one .state cell.
if ($body -notmatch 'class="[^"]*row-states[^"]*"') {
  [Console]::Error.WriteLine('lint-ds: §1 missing — no class="row-states" block found'); $fail = $true
} elseif ($body -notmatch 'class="[^"]*state[^"]*"') {
  [Console]::Error.WriteLine('lint-ds: §1 incomplete — row-states present but no .state cell'); $fail = $true
}

# §4 — non-empty <pre class="api">.
$apiMatch = [regex]::Match($body, '<pre[^>]*class="[^"]*api[^"]*"[^>]*>(.*?)</pre>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
if (-not $apiMatch.Success) {
  [Console]::Error.WriteLine('lint-ds: §4 missing — no <pre class="api"> block found'); $fail = $true
} elseif (([regex]::Replace($apiMatch.Groups[1].Value, '\s', '')) -eq '') {
  [Console]::Error.WriteLine('lint-ds: §4 empty — <pre class="api"> body is whitespace only'); $fail = $true
}

# §7 — <dl class="tokens">.
if ($body -notmatch '<dl[^>]*class="[^"]*tokens[^"]*"') {
  [Console]::Error.WriteLine('lint-ds: §7 missing — no <dl class="tokens"> found'); $fail = $true
}

# §8 — a Behavior header followed somewhere by a <li>.
$idx = [regex]::Match($body, '<h[1-6][^>]*>[^<]*[Bb]ehavior[^<]*</h[1-6]>')
if (-not $idx.Success) {
  [Console]::Error.WriteLine('lint-ds: §8 missing — no Behavior header found'); $fail = $true
} else {
  $rest = $body.Substring($idx.Index + $idx.Length)
  if ($rest -notmatch '<li[ >]') {
    [Console]::Error.WriteLine('lint-ds: §8 missing — no <li> after Behavior header'); $fail = $true
  }
}

if ($fail) { exit 3 }
Write-Output "lint-ds: ok ($File)"
