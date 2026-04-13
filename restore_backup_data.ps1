$BackupZip = "data/backup/baseline_1m_records.zip"

if (-not (Test-Path $BackupZip)) {
  Write-Error "Backup file not found: $BackupZip"
  exit 1
}

if (-not (Test-Path "data")) {
  New-Item -ItemType Directory -Path "data" | Out-Null
}

Get-ChildItem -Path "data" -File | Remove-Item -Force
Expand-Archive -Path $BackupZip -DestinationPath "data" -Force
Write-Output "Restored data from: $BackupZip"
