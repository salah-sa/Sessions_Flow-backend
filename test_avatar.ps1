$ErrorActionPreference = "Stop"

try {
    $adminLogin = @{
        email = "salahfdasalahfda.11188@gmail.com"
        password = "Admin1234!"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://127.0.0.1:5180/api/auth/login" -Method Post -Body $adminLogin -ContentType "application/json" -Headers @{ "X-Requested-With" = "XMLHttpRequest" }
    $token = $loginResponse.token
    Write-Host "Login successful. Token: $($token.Substring(0, 10))..."

    $base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    $avatarRequest = @{
        avatarUrl = $base64Image
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://127.0.0.1:5180/api/auth/profile/avatar" -Method Put -Body $avatarRequest -ContentType "application/json" -Headers @{ Authorization = "Bearer $token"; "X-Requested-With" = "XMLHttpRequest" }
    Write-Host "Avatar update successful:"
    $response | ConvertTo-Json -Depth 10 | Write-Host

    Write-Host "Fetching /me..."
    $meResponse = Invoke-RestMethod -Uri "http://127.0.0.1:5180/api/auth/me" -Method Get -Headers @{ Authorization = "Bearer $token"; "X-Requested-With" = "XMLHttpRequest" }
    Write-Host "Me successful:"
    $meResponse | ConvertTo-Json -Depth 10 | Write-Host

} catch {
    Write-Host "ERROR OCCURRED:"
    Write-Host $_.Exception.Message
    
    if ($_.ErrorDetails) {
        Write-Host "Error Details from Server:"
        Write-Host $_.ErrorDetails.Message
    } elseif ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:"
        Write-Host $responseBody
    }
}
