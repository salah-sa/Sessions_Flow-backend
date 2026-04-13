param(
    [string]$pngPath,
    [string]$icoPath
)

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)

$icoHeader = New-Object byte[] 22
$icoHeader[0] = 0
$icoHeader[1] = 0
$icoHeader[2] = 1
$icoHeader[3] = 0
$icoHeader[4] = 1
$icoHeader[5] = 0

$icoHeader[6] = 0
$icoHeader[7] = 0
$icoHeader[8] = 0
$icoHeader[9] = 0
$icoHeader[10] = 1
$icoHeader[11] = 0
$icoHeader[12] = 32
$icoHeader[13] = 0

$size = $pngBytes.Length
$icoHeader[14] = [byte]($size -band 0xFF)
$icoHeader[15] = [byte](($size -shr 8) -band 0xFF)
$icoHeader[16] = [byte](($size -shr 16) -band 0xFF)
$icoHeader[17] = [byte](($size -shr 24) -band 0xFF)

$icoHeader[18] = 22
$icoHeader[19] = 0
$icoHeader[20] = 0
$icoHeader[21] = 0

$outStream = [System.IO.File]::Create($icoPath)
$outStream.Write($icoHeader, 0, $icoHeader.Length)
$outStream.Write($pngBytes, 0, $pngBytes.Length)
$outStream.Close()

Write-Host "Success! Created $icoPath"
