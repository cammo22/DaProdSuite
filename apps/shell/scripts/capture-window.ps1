# Cattura la finestra della suite in un PNG. Serve per le immagini del README e
# per controllare l'aspetto senza doverlo descrivere a parole.
#
#   pwsh apps/shell/scripts/capture-window.ps1 -Titolo "DaProd Suite" -Out schermata.png

param(
    [string]$Titolo = "DaProd Suite",
    [string]$Out = "schermata.png"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    // PrintWindow disegna la finestra nel nostro contesto grafico: funziona anche
    // se è coperta da altre finestre, al contrario di CopyFromScreen.
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$finestra = Get-Process |
    Where-Object { $_.MainWindowTitle -like "*$Titolo*" } |
    Select-Object -First 1

if (-not $finestra) { throw "Nessuna finestra con titolo simile a '$Titolo'." }

$rect = New-Object Win+RECT
[Win]::GetWindowRect($finestra.MainWindowHandle, [ref]$rect) | Out-Null

$w = $rect.Right - $rect.Left
$h = $rect.Bottom - $rect.Top
if ($w -le 0 -or $h -le 0) { throw "Dimensioni della finestra non valide ($w x $h)." }

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
# nFlags = 2 (PW_RENDERFULLCONTENT): necessario per le finestre che disegnano in
# GPU come Electron, altrimenti si ottiene un rettangolo nero.
$ok = [Win]::PrintWindow($finestra.MainWindowHandle, $hdc, 2)
$g.ReleaseHdc($hdc)
if (-not $ok) { throw "PrintWindow non è riuscita a catturare la finestra." }

$bmp.Save([System.IO.Path]::GetFullPath($Out), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Host "Schermata $w x $h salvata in $Out"
