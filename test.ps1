$ErrorActionPreference = "Stop"

try {
    $adminLogin = @{
        email = "salahfdasalahfda.11188@gmail.com"
        password = "Admin1234!"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://127.0.0.1:5180/api/auth/login" -Method Post -Body $adminLogin -ContentType "application/json" -Headers @{ "X-Requested-With" = "XMLHttpRequest" }
    $token = $loginResponse.token
    Write-Host "Login successful. Token: $($token.Substring(0, 10))..."

    $ticketRequest = @{
        title = "Test Ticket"
        description = "This is a test ticket."
        department = "Technical"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://127.0.0.1:5180/api/support/tickets" -Method Post -Body $ticketRequest -ContentType "application/json" -Headers @{ Authorization = "Bearer $token"; "X-Requested-With" = "XMLHttpRequest" }
    Write-Host "Ticket creation successful:"
    $response | ConvertTo-Json -Depth 10 | Write-Host

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
