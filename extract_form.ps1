$html = (Invoke-WebRequest -Uri 'https://docs.google.com/forms/d/e/1FAIpQLSc3cVcgcW99zHpAHO9gZYOSiN5gYT8lhOrRW4oFNUStHnHb7w/viewform' -UseBasicParsing).Content
$match = [regex]::Match($html, 'FB_PUBLIC_LOAD_DATA_\s*=\s*(.+?);\s*</script>')
if($match.Success){
    $match.Groups[1].Value | Out-File -Encoding utf8 'form_data.txt'
    Write-Host "Extracted successfully"
} else {
    Write-Host "Pattern not found"
}
