Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("logo.png")
$iconHandle = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)
$fs = New-Object System.IO.FileStream("SessionFlow.Desktop\icon.ico", [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()
Write-Host "Created valid System.Drawing.Icon at SessionFlow.Desktop\icon.ico"
