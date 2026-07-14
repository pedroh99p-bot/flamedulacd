param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$projectRef = 'gimugfooncsmyztjuull'
$databaseUrl = "postgresql://postgres.$projectRef@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
$logDirectory = Join-Path $PSScriptRoot '..\artifacts'
$logFile = Join-Path $logDirectory ($(if ($Apply) { 'supabase-staging-apply.log' } else { 'supabase-staging-dry-run.log' }))
$isolatedCliHome = Join-Path $logDirectory 'cli-home'
$originalHome = $env:HOME
$originalUserProfile = $env:USERPROFILE
$securePassword = Read-Host 'Digite a senha do banco do staging (entrada oculta)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $arguments = @(
    '--yes',
    'supabase@2.109.1',
    'db',
    'push',
    '--db-url',
    $databaseUrl,
    '--output',
    'pretty',
    '--yes',
    '--agent',
    'no'
  )

  if (-not $Apply) {
    $arguments += '--dry-run'
    Write-Host 'Executando somente simulacao (dry-run). Nenhuma migration sera aplicada.' -ForegroundColor Cyan
  } else {
    Write-Host 'Aplicando migrations no projeto de staging gimugfooncsmyztjuull.' -ForegroundColor Yellow
  }

  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  New-Item -ItemType Directory -Path $isolatedCliHome -Force | Out-Null
  $env:HOME = $isolatedCliHome
  $env:USERPROFILE = $isolatedCliHome

  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $commandOutput = & npx.cmd @arguments 2>&1
  $commandExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  $commandOutput | Tee-Object -FilePath $logFile
  Write-Host "Saida salva em: $logFile" -ForegroundColor DarkGray

  if ($commandExitCode -ne 0) {
    throw "Supabase CLI encerrou com codigo $commandExitCode."
  }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $env:HOME = $originalHome
  $env:USERPROFILE = $originalUserProfile
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $securePassword = $null
}
