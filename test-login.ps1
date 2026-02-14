# Test Agent Login
Write-Host "`n=== Testing Agent Login ===" -ForegroundColor Cyan
$agentBody = @{
    username = "testagent"
    password = "agent123"
} | ConvertTo-Json

$agentResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/users/agent/login" -Method POST -Body $agentBody -ContentType "application/json"
Write-Host "Agent Login:" -ForegroundColor Green
$agentResponse | ConvertTo-Json

# Test Employee Login
Write-Host "`n=== Testing Employee Login ===" -ForegroundColor Cyan
$employeeBody = @{
    username = "testemployee"
    password = "employee123"
} | ConvertTo-Json

$employeeResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/users/employee/login" -Method POST -Body $employeeBody -ContentType "application/json"
Write-Host "Employee Login:" -ForegroundColor Green
$employeeResponse | ConvertTo-Json

# Test bhairavam12 Login
Write-Host "`n=== Testing bhairavam12 Login ===" -ForegroundColor Cyan
$bhairavBody = @{
    username = "bhairavam12"
    password = "password123"
} | ConvertTo-Json

$bhairavResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/users/employee/login" -Method POST -Body $bhairavBody -ContentType "application/json"
Write-Host "bhairavam12 Login:" -ForegroundColor Green
$bhairavResponse | ConvertTo-Json
