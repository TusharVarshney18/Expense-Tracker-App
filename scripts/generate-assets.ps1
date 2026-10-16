# Generates all raster assets required by app.config.ts and the Play Store.
# Requires Windows PowerShell with System.Drawing (available on Windows).
# Run:  powershell -ExecutionPolicy Bypass -File scripts/generate-assets.ps1

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null

$teal   = [System.Drawing.Color]::FromArgb(255, 15, 118, 110)   # #0F766E
$tealDk = [System.Drawing.Color]::FromArgb(255, 11, 93, 86)
$amber  = [System.Drawing.Color]::FromArgb(255, 245, 158, 11)   # #F59E0B
$white  = [System.Drawing.Color]::White
$clear  = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Draws the Expense Counter mark (a wallet + coin) centered in a $size x $size canvas.
# $scale controls how much of the canvas the mark occupies (0..1).
function Draw-Mark($g, [int]$size, [float]$scale, $markColor, $accentColor) {
  $s = $size * $scale
  $ox = ($size - $s) / 2.0
  $oy = ($size - $s) / 2.0

  # Wallet body
  $bw = $s * 0.78
  $bh = $s * 0.52
  $bx = $ox + ($s - $bw) / 2.0
  $by = $oy + $s * 0.28
  $bodyPath = New-RoundedPath $bx $by $bw $bh ($s * 0.075)
  $bodyBrush = New-Object System.Drawing.SolidBrush $markColor
  $g.FillPath($bodyBrush, $bodyPath)

  # Clasp (accent) on the right edge of the wallet
  $cw = $s * 0.20
  $ch = $s * 0.20
  $cx = $bx + $bw - $cw - $s * 0.005
  $cy = $by + ($bh - $ch) / 2.0
  $claspPath = New-RoundedPath $cx $cy $cw $ch ($s * 0.06)
  $accentBrush = New-Object System.Drawing.SolidBrush $accentColor
  $g.FillPath($accentBrush, $claspPath)

  # Clasp button
  $db = $s * 0.055
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), ($cx + $cw / 2 - $db / 2), ($cy + $ch / 2 - $db / 2), $db, $db)

  # Coin peeking above the wallet
  $coin = $s * 0.26
  $coinX = $bx + $s * 0.05
  $coinY = $by - $coin * 0.62
  $g.FillEllipse($accentBrush, $coinX, $coinY, $coin, $coin)
  $inner = $coin * 0.56
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $markColor), ($coinX + ($coin - $inner) / 2), ($coinY + ($coin - $inner) / 2), $inner, $inner)

  $bodyPath.Dispose(); $claspPath.Dispose(); $bodyBrush.Dispose(); $accentBrush.Dispose()
}

function Save-Icon([int]$size, [string]$name, [bool]$background, [float]$scale, $markColor, $accentColor) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear($clear)
  if ($background) {
    $bg = New-Object System.Drawing.SolidBrush $teal
    $g.FillRectangle($bg, 0, 0, $size, $size)
    $bg.Dispose()
  }
  Draw-Mark $g $size $scale $markColor $accentColor
  $g.Dispose()
  $out = Join-Path $assets $name
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "wrote $out"
}

# App icon (1024) with background
Save-Icon 1024 'icon.png' $true 0.62 $white $amber

# Adaptive icon layers (foreground must keep the mark inside the 66% safe zone)
Save-Icon 1024 'adaptive-icon-foreground.png' $false 0.52 $white $amber
$bmp = New-Object System.Drawing.Bitmap 1024, 1024
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear($teal)
$g.Dispose()
$bmp.Save((Join-Path $assets 'adaptive-icon-background.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "wrote adaptive-icon-background.png"

# Monochrome adaptive layer (white mark, transparent background)
Save-Icon 1024 'adaptive-icon-monochrome.png' $false 0.52 $white $white

# Splash mark (transparent, used by expo-splash-screen plugin)
Save-Icon 1024 'splash-icon.png' $false 0.9 $white $amber

# Notification icon (white silhouette, 96dp)
Save-Icon 96 'notification-icon.png' $false 0.92 $white $white

# Web favicon
Save-Icon 48 'favicon.png' $true 0.62 $white $amber

# Play Store listing icon (512x512, opaque, no alpha)
Save-Icon 512 'play-store-icon.png' $true 0.62 $white $amber

Write-Host "`nAll assets generated in $assets"
