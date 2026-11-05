$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'enter-dev.ps1')
$LxyJar = Join-Path $LxyRepoRoot 'backend/target/qiuzhi-helper-rules-0.1.0.jar'
if (-not (Test-Path -LiteralPath $LxyJar)) { throw 'Run scripts/build.ps1 first, or download the backend JAR from Releases.' }
& java -Xmx256m -XX:ActiveProcessorCount=2 -jar $LxyJar
exit $LASTEXITCODE
