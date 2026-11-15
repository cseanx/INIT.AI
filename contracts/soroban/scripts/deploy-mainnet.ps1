#Requires -Version 5.1
<#
.SYNOPSIS
    Deploy SpatialAttestationRegistry to Stellar MAINNET (real XLM).

.DESCRIPTION
    Guarded deployment helper. It deliberately refuses to run unless:
      1. -Confirm is passed (no accidental mainnet deploys),
      2. the source identity exists and is funded on Mainnet,
      3. the wasm artifact exists (build it first),
      4. the account holds at least -MinBalance XLM (default 20).

    The identity's secret never leaves ~/.config/stellar/identity/. This script
    only reads the public key and queries Horizon for the balance.

.PARAMETER Source
    Stellar CLI identity name (default: initai-mainnet).

.PARAMETER MinBalance
    Minimum mainnet XLM balance required before deploying (default: 20).

.PARAMETER Confirm
    Required switch. Confirms the operator understands real XLM is spent.

.EXAMPLE
    .\deploy-mainnet.ps1 -Source initai-mainnet -Confirm

.NOTES
    Runbook: contracts/soroban/MAINNET-RUNBOOK.md
    After deploy: set STELLAR_CONTRACT_ID (backend) and VITE_SOROBAN_CONTRACT_ID
    / VITE_STELLAR_CONTRACT_ID (frontend), plus STELLAR_NETWORK=mainnet and
    STELLAR_MAINNET_ACK=true for the backend.
#>
param(
    [string]$Source = "initai-mainnet",
    [decimal]$MinBalance = 20,
    [switch]$Confirm
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

if (-not $Confirm) {
    Fail "Mainnet deploys spend real XLM. Re-run with -Confirm when you are ready."
}

# 1. Identity must exist.
$address = $null
try {
    $address = (stellar keys address $Source 2>$null | Out-String).Trim()
} catch {
    $address = $null
}
if ([string]::IsNullOrWhiteSpace($address)) {
    Fail "Stellar identity '$Source' not found. Create/fund it first (see contracts/soroban/MAINNET-RUNBOOK.md)."
}
Write-Host "Source identity : $Source"
Write-Host "Public key      : $address"

# 2. Must be funded on Mainnet.
$balance = $null
try {
    $account = Invoke-RestMethod -Uri "https://horizon.stellar.org/accounts/$address" -TimeoutSec 20
    $native = $account.balances | Where-Object { $_.asset_type -eq "native" } | Select-Object -First 1
    if ($native) { $balance = [decimal]$native.balance }
} catch {
    Fail "Account $address is not funded on Mainnet (Horizon 404). Send real XLM to it first."
}
if ($null -eq $balance) {
    Fail "No native XLM balance found for $address."
}
Write-Host ("Mainnet balance : {0} XLM" -f $balance)
if ($balance -lt $MinBalance) {
    Fail ("Balance {0} XLM is below the {1} XLM guardrail. Top up before deploying." -f $balance, $MinBalance)
}

# 3. Wasm artifact must exist (built with stellar contract build).
$wasm = Join-Path $PSScriptRoot "..\target\wasm32v1-none\release\initai_spatial_attestation.wasm"
$wasm = [System.IO.Path]::GetFullPath($wasm)
if (-not (Test-Path $wasm)) {
    Fail "Wasm not found at $wasm. Run: stellar contract build --manifest-path contracts/soroban/Cargo.toml"
}
$hash = (Get-FileHash -Algorithm SHA256 -Path $wasm).Hash.ToLowerInvariant()
$size = (Get-Item $wasm).Length
Write-Host "Wasm artifact   : $wasm"
Write-Host "Wasm SHA-256    : $hash ($size bytes)"

# 4. Final confirmation gate.
Write-Host ""
Write-Host "About to deploy to STELLAR MAINNET and spend real XLM." -ForegroundColor Yellow
if ($Host.Name -eq "ConsoleHost") {
    $answer = Read-Host "Type DEPLOY to continue"
    if ($answer -ne "DEPLOY") {
        Fail "Aborted (typed '$answer')."
    }
}

# 5. Deploy.
$contractId = & stellar contract deploy --wasm $wasm --source $Source --network mainnet
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($contractId)) {
    Fail "stellar contract deploy failed (exit $LASTEXITCODE)."
}
$contractId = ($contractId | Out-String).Trim()

Write-Host ""
Write-Host "Deployed to Mainnet: $contractId" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps (see contracts/soroban/MAINNET-RUNBOOK.md):"
Write-Host "  1. stellar contract invoke --id $contractId --network mainnet --source $Source -- total_attestations"
Write-Host "  2. Backend env:  STELLAR_NETWORK=mainnet  STELLAR_MAINNET_ACK=true"
Write-Host "                   STELLAR_CONTRACT_ID=$contractId"
Write-Host "  3. Frontend env: VITE_STELLAR_NETWORK=mainnet"
Write-Host "                   VITE_SOROBAN_CONTRACT_ID=$contractId"
Write-Host "                   VITE_STELLAR_CONTRACT_ID=$contractId"
Write-Host "  4. Record the contract id + deploy tx in contracts/soroban/README.md and README.md."
