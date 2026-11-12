$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path -Parent $PSScriptRoot
$pluginRoot = Join-Path $projectRoot 'plugins\cue-ai'
& node (Join-Path $PSScriptRoot 'validate-plugin.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Plugin validation failed' }
$outputDirectory = Join-Path $projectRoot 'dist'
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$archivePath = Join-Path $outputDirectory 'cue-ai-1.0.0.zip'
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath }
[IO.Compression.ZipFile]::CreateFromDirectory($pluginRoot, $archivePath, [IO.Compression.CompressionLevel]::Optimal, $true)
$zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
try {
 $files = @(Get-ChildItem -LiteralPath $pluginRoot -Recurse -Force -File)
 $packedFiles = @($zip.Entries | Where-Object { -not $_.FullName.EndsWith('/') -and $_.Name })
 if ($packedFiles.Count -ne $files.Count) { throw 'Archive file count mismatch' }
 foreach ($file in $files) {
  $relative = [IO.Path]::GetRelativePath($pluginRoot, $file.FullName).Replace('\','/')
  $entryName = 'cue-ai/' + $relative
  $entry = $zip.GetEntry($entryName)
  if (-not $entry) { throw "Missing ZIP entry: $entryName" }
  $stream = $entry.Open()
  try {
   $sha = [Security.Cryptography.SHA256]::Create()
   try { $hash = [Convert]::ToHexString($sha.ComputeHash($stream)) }
   finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
  if ($hash -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash) {
   throw "Archive checksum mismatch: $entryName"
  }
 }
 "Verified ZIP files: $($files.Count)"
} finally { $zip.Dispose() }
$checksum = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText($archivePath + '.sha256', "$checksum  cue-ai-1.0.0.zip`n", [Text.UTF8Encoding]::new($false))
Get-Item -LiteralPath $archivePath | Select-Object FullName, Length
