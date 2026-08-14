# Genera l'icona della suite: quadrato arrotondato scuro con il nastro di colori
# delle sei app. Rigenerabile, così l'icona non è un binario opaco nel repo.
#
#   pwsh apps/shell/scripts/make-icon.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$size = 512
$out = Join-Path $PSScriptRoot '..\build\icon.png'
$out = [System.IO.Path]::GetFullPath($out)
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null

$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::Transparent)

# Fondo: quadrato arrotondato nello stesso scuro dell'interfaccia.
$r = [int]($size * 0.22)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
$path.AddArc($size - $r * 2, 0, $r * 2, $r * 2, 270, 90)
$path.AddArc($size - $r * 2, $size - $r * 2, $r * 2, $r * 2, 0, 90)
$path.AddArc(0, $size - $r * 2, $r * 2, $r * 2, 90, 90)
$path.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 13, 15, 20))), $path)

# Nastro: i sei colori d'accento, uno per app, in un arco spesso.
$accenti = @(
    [System.Drawing.Color]::FromArgb(255, 124, 92, 255),   # Visualizer
    [System.Drawing.Color]::FromArgb(255, 255, 92, 138),   # Musica
    [System.Drawing.Color]::FromArgb(255, 255, 166, 61),   # Foto
    [System.Drawing.Color]::FromArgb(255, 61, 219, 255),   # Dream
    [System.Drawing.Color]::FromArgb(255, 92, 255, 157),   # Companion
    [System.Drawing.Color]::FromArgb(255, 255, 124, 92)    # IoDigitale
)

$margine = [int]($size * 0.22)
$spessore = [int]($size * 0.11)
$rect = New-Object System.Drawing.Rectangle $margine, $margine, ($size - $margine * 2), ($size - $margine * 2)

# Un settore per colore, con un filo di sovrapposizione per non far vedere le giunzioni.
$passo = 360.0 / $accenti.Count
for ($i = 0; $i -lt $accenti.Count; $i++) {
    $pen = New-Object System.Drawing.Pen $accenti[$i], $spessore
    $pen.StartCap = 'Round'
    $pen.EndCap = 'Round'
    $g.DrawArc($pen, $rect, (-90 + $passo * $i), ($passo + 2))
    $pen.Dispose()
}

# Punto centrale: la suite che tiene insieme le sei app.
$d = [int]($size * 0.16)
$g.FillEllipse(
    (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 232, 236, 244))),
    [int](($size - $d) / 2), [int](($size - $d) / 2), $d, $d
)

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Host "Icona scritta in $out"
