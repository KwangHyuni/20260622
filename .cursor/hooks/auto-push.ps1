# Agent 작업 종료 시 변경사항을 GitHub에 자동 업로드
$ErrorActionPreference = 'SilentlyContinue'
$root = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot '..\..') } else { Get-Location }

Set-Location $root

if (-not (Test-Path '.git')) { exit 0 }

$status = git status --porcelain 2>$null
if (-not $status) { exit 0 }

git add -A
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
git commit -m "자동 업로드: $timestamp"
git push origin main 2>$null
if ($LASTEXITCODE -ne 0) {
  git push -u origin main 2>$null
}

exit 0
