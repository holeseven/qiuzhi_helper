$LxyRepoRoot = Split-Path -Parent $PSScriptRoot
$LxyWorkspaceRoot = Split-Path -Parent $LxyRepoRoot
$LxyToolsRoot = Join-Path $LxyWorkspaceRoot 'tools'
$OutputEncoding = [Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$LxyNodeDir = Get-ChildItem -LiteralPath (Join-Path $LxyToolsRoot 'node') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($LxyNodeDir) { $env:Path = $LxyNodeDir.FullName + ';' + $env:Path }
$LxyJavaDir = Get-ChildItem -LiteralPath (Join-Path $LxyToolsRoot 'jdk') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($LxyJavaDir) { $env:JAVA_HOME = $LxyJavaDir.FullName; $env:Path = (Join-Path $LxyJavaDir.FullName 'bin') + ';' + $env:Path }
$LxyMavenDir = Get-ChildItem -LiteralPath (Join-Path $LxyToolsRoot 'maven') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($LxyMavenDir) { $env:Path = (Join-Path $LxyMavenDir.FullName 'bin') + ';' + $env:Path }
if (Test-Path -LiteralPath (Join-Path $LxyToolsRoot 'browsers')) { $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $LxyToolsRoot 'browsers' }
$env:npm_config_cache = Join-Path $LxyToolsRoot 'npm-cache'
$env:MAVEN_OPTS = '-Xmx512m -XX:ActiveProcessorCount=2 -Dfile.encoding=UTF-8'
$LxyTempRoot = Join-Path $LxyToolsRoot 'tmp'
New-Item -ItemType Directory -Path $LxyTempRoot -Force | Out-Null
$env:TEMP = $LxyTempRoot
$env:TMP = $LxyTempRoot
