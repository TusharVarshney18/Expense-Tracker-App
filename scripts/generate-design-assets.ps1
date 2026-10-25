Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'

function New-RoundedPath {
    param([float]$X, [float]$Y, [float]$W, [float]$H, [float]$R)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $R * 2
    $path.AddArc($X, $Y, $d, $d, 180, 90)
    $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
    $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
    $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-SolidBrush {
    param([string]$Hex)
    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Hex))
}

function New-GlyphPath {
    param([float]$X, [float]$Y, [float]$S)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.StartFigure()
    $path.AddLine($X + 0.25 * $S, $Y + 0.28 * $S, $X + 0.75 * $S, $Y + 0.28 * $S)
    $path.AddLine($X + 0.25 * $S, $Y + 0.41 * $S, $X + 0.75 * $S, $Y + 0.41 * $S)
    $path.StartFigure()
    $path.AddBezier(
        $X + 0.47 * $S, $Y + 0.28 * $S,
        $X + 0.78 * $S, $Y + 0.31 * $S,
        $X + 0.78 * $S, $Y + 0.55 * $S,
        $X + 0.49 * $S, $Y + 0.57 * $S
    )
    $path.StartFigure()
    $path.AddLine($X + 0.49 * $S, $Y + 0.57 * $S, $X + 0.78 * $S, $Y + 0.78 * $S)
    return $path
}

function Save-Mark {
    param(
        [int]$Size,
        [string]$Path,
        [bool]$InkBackground,
        [bool]$TransparentTile = $false,
        [bool]$Monochrome = $false
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($InkBackground) {
        $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0B0D12'))
    }

    $tileSize = if ($TransparentTile) { $Size * 0.56 } else { $Size * 0.66 }
    $tileX = ($Size - $tileSize) / 2
    $tileY = ($Size - $tileSize) / 2
    $tilePath = New-RoundedPath -X $tileX -Y $tileY -W $tileSize -H $tileSize -R ($tileSize * 0.295)

    if ($Monochrome) {
        # Glyph-only alpha mask for Android themed and notification icons.
        $glyphColor = '#FFFFFF'
        $textSize = $Size * 0.68
        $textX = 0.0
        $textY = 0.0
        $textW = [float]$Size
        $textH = [float]$Size
        $tileBrush = $null
    } else {
        $rect = New-Object System.Drawing.RectangleF($tileX, $tileY, $tileSize, $tileSize)
        $tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect,
            [System.Drawing.ColorTranslator]::FromHtml('#3DDC97'),
            [System.Drawing.ColorTranslator]::FromHtml('#25B97B'),
            45
        )
        $g.FillPath($tileBrush, $tilePath)
        $glyphColor = '#04251A'
        $textSize = $tileSize * 0.64
        $textX = [float]$tileX
        $textY = [float]($tileY - $tileSize * 0.035)
        $textW = [float]$tileSize
        $textH = [float]$tileSize
    }

    $font = New-Object System.Drawing.Font('Segoe UI', $textSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textBrush = New-SolidBrush $glyphColor
    $textRect = [System.Drawing.RectangleF]::new($textX, $textY, $textW, $textH)
    $g.DrawString([string][char]0x20B9, $font, $textBrush, $textRect, $format)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $format.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
    $tilePath.Dispose()
    if ($tileBrush) { $tileBrush.Dispose() }
    $g.Dispose()
    $bmp.Dispose()
}

Save-Mark -Size 1024 -Path (Join-Path $assets 'icon.png') -InkBackground $true
Save-Mark -Size 512 -Path (Join-Path $assets 'play-store-icon.png') -InkBackground $true
Save-Mark -Size 48 -Path (Join-Path $assets 'favicon.png') -InkBackground $true
Save-Mark -Size 512 -Path (Join-Path $assets 'splash-icon.png') -InkBackground $false -TransparentTile $true
Save-Mark -Size 1024 -Path (Join-Path $assets 'adaptive-icon-foreground.png') -InkBackground $false -TransparentTile $true
Save-Mark -Size 1024 -Path (Join-Path $assets 'adaptive-icon-monochrome.png') -InkBackground $false -Monochrome $true

$background = New-Object System.Drawing.Bitmap(1024, 1024)
$bg = [System.Drawing.Graphics]::FromImage($background)
$bg.Clear([System.Drawing.ColorTranslator]::FromHtml('#0B0D12'))
$background.Save((Join-Path $assets 'adaptive-icon-background.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bg.Dispose()
$background.Dispose()

Save-Mark -Size 96 -Path (Join-Path $assets 'notification-icon.png') -InkBackground $false -Monochrome $true

Write-Host 'Brand assets generated in assets/'
