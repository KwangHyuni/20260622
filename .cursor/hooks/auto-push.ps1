# Agent 작업 종료 시 변경사항을 GitHub에 자동 업로드
$ErrorActionPreference = 'SilentlyContinue'
$root = if ($PSScriptRoot) { Resolve-Path (Join-Path $PSScriptRoot '..\..') } else { Get-Location }

Set-Location $root

if (-not (Test-Path '.git')) { exit 0 }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
if ($PSVersionTable.PSVersion.Major -lt 6) {
  chcp 65001 | Out-Null
}

$status = git status --porcelain 2>$null
if (-not $status) { exit 0 }

git add -A
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

# PS 5.1은 BOM 없는 UTF-8 .ps1의 한글 리터럴을 CP949로 읽어 깨지므로 UTF-8 바이트로 조립
$labelBytes = [byte[]](
  0xEC, 0x9E, 0x90, 0xEB, 0x8F, 0x99, 0x20,
  0xEC, 0x97, 0x85, 0xEB, 0xA1, 0x9C, 0xEB, 0x93, 0x9C
)
$label = $utf8NoBom.GetString($labelBytes)
$commitMessage = "${label}: $timestamp"

$msgFile = Join-Path $env:TEMP ("cursor-auto-push-{0}.txt" -f [Guid]::NewGuid().ToString('N'))
try {
  [System.IO.File]::WriteAllText($msgFile, $commitMessage, $utf8NoBom)
  git commit -F $msgFile
} finally {
  if (Test-Path $msgFile) { Remove-Item $msgFile -Force }
}

git push origin main 2>$null
if ($LASTEXITCODE -ne 0) {
  git push -u origin main 2>$null
}

exit 0
