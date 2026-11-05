param([switch]$WithBrowser)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'enter-dev.ps1')
function Invoke-LxyNative {
    param([string]$Executable, [string[]]$ArgumentList, [string]$Failure)
    $LxyExecutablePath = (Get-Command -Name $Executable -ErrorAction Stop).Source
    $LxySavedPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5 treats native stderr warnings as ErrorRecords.
        # Preserve the output and use the actual process exit code.
        $ErrorActionPreference = 'Continue'
        & $LxyExecutablePath @ArgumentList 2>&1 | ForEach-Object { $_.ToString() }
        $LxyNativeExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $LxySavedPreference }
    if ($LxyNativeExit -ne 0) { throw ($Failure + ' (exit ' + $LxyNativeExit + ')') }
}
Push-Location -LiteralPath $LxyRepoRoot
try {
    Invoke-LxyNative 'node' @('--test','tests/background.test.mjs') 'Node tests failed'
    Invoke-LxyNative 'mvn.cmd' @('-B','-ntp','-f','backend/pom.xml',("-Dmaven.repo.local=" + (Join-Path $LxyToolsRoot 'm2')),'clean','verify') 'Maven verification failed'
    Invoke-LxyNative 'node' @('tests/backend-integration.mjs') 'Backend integration failed'
    if ($WithBrowser) {
        Invoke-LxyNative 'node' @('tests/action-safety.mjs') 'Action safety failed'
        Invoke-LxyNative 'node' @('tests/browser-smoke.mjs','--ambiguous') 'Ambiguous record test failed'
        Invoke-LxyNative 'node' @('tests/extension-smoke.mjs') 'Extension smoke test failed'
    }
} finally { Pop-Location }
