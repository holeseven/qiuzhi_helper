param([switch]$WithBrowser)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'test.ps1') -WithBrowser:$WithBrowser
if (-not $?) { throw 'Verification failed' }
$LxyBuildRoot = Split-Path -Parent $PSScriptRoot
$LxyDistRoot = Join-Path $LxyBuildRoot 'dist'
New-Item -ItemType Directory -Path $LxyDistRoot -Force | Out-Null
$LxyManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $LxyBuildRoot 'extension/manifest.json') | ConvertFrom-Json
$LxyZip = Join-Path $LxyDistRoot ("lxy-autumn-helper-" + $LxyManifest.version + ".zip")
Compress-Archive -Path (Join-Path $LxyBuildRoot 'extension/*') -DestinationPath $LxyZip -Force
Copy-Item -LiteralPath (Join-Path $LxyBuildRoot 'backend/target/qiuzhi-helper-rules-0.1.0.jar') -Destination (Join-Path $LxyDistRoot 'lxy-helper-rules-0.1.0.jar') -Force
$LxyChecksums = Get-ChildItem -LiteralPath $LxyDistRoot -File | Where-Object { $_.Extension -in '.zip', '.jar' } | Sort-Object Name | ForEach-Object {
    (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant() + '  ' + $_.Name
}
[IO.File]::WriteAllLines((Join-Path $LxyDistRoot 'SHA256SUMS.txt'), [string[]]$LxyChecksums, [Text.UTF8Encoding]::new($false))
Get-ChildItem -LiteralPath $LxyDistRoot -File | Select-Object Name,Length
