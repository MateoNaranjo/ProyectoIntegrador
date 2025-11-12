$token = Get-Content -Raw -Path "./scripts/token.txt".Trim()
$body = @{
    tipoCita = 'Primera Vez'
    especialidad = 'Medicina General'
    fecha = (Get-Date -Format yyyy-MM-dd)
    hora = '09:30'
    nombreCompleto = 'Prueba Usuario'
    documentoIdentidad = '99999999'
    telefono = '3000000000'
    correo = 'prueba@local.test'
    motivo = 'Prueba automatizada'
} | ConvertTo-Json -Depth 5

$headers = @{ Authorization = "Bearer $token" }

Write-Host "Sending POST /api/agendar-cita..."
try {
    $res = Invoke-RestMethod -Uri 'http://localhost:3000/api/agendar-cita' -Method Post -Body $body -ContentType 'application/json' -Headers $headers
    Write-Host "CREATE_RESPONSE:`n" ($res | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "CREATE_ERROR:`n" $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host $reader.ReadToEnd()
    }
    exit 1
}

if ($res -and ($res.id_cita -or $res.insertId)) {
    $id = $res.id_cita; if (-not $id) { $id = $res.insertId }
    Write-Host "Deleting created cita id=$id..."
    try {
        $del = Invoke-RestMethod -Uri "http://localhost:3000/api/cita/$id" -Method Delete -Headers $headers
        Write-Host "DELETE_RESPONSE:`n" ($del | ConvertTo-Json -Depth 5)
    } catch {
        Write-Host "DELETE_ERROR:`n" $_.Exception.Message
        if ($_.Exception.Response) { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); Write-Host $reader.ReadToEnd() }
        exit 1
    }
} else {
    Write-Host "No id returned from create, skipping delete. Create response: $($res | ConvertTo-Json -Depth 5)"
}
