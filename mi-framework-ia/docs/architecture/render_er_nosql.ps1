param(
    [string]$OutputPath = (Join-Path $PSScriptRoot 'diagrama_er_nosql.png')
)

Add-Type -AssemblyName System.Drawing

$width = 2300
$height = 1650
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#F5F7F5'))

function Get-Color([string]$Hex) {
    return [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function New-Font([float]$Size, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular) {
    return New-Object System.Drawing.Font('Segoe UI', $Size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-Text([string]$Text, [float]$X, [float]$Y, [float]$W, [float]$H, [float]$Size, [string]$Color, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular) {
    $font = New-Font $Size $Style
    $brush = New-Object System.Drawing.SolidBrush((Get-Color $Color))
    $graphics.DrawString($Text, $font, $brush, [System.Drawing.RectangleF]::new($X, $Y, $W, $H))
    $font.Dispose()
    $brush.Dispose()
}

function Draw-RoundedRect([float]$X, [float]$Y, [float]$W, [float]$H, [float]$Radius, [string]$Fill, [string]$Stroke, [float]$StrokeWidth = 1) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc(($X + $W - $diameter), $Y, $diameter, $diameter, 270, 90)
    $path.AddArc(($X + $W - $diameter), ($Y + $H - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($X, ($Y + $H - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.SolidBrush((Get-Color $Fill))
    $pen = New-Object System.Drawing.Pen((Get-Color $Stroke), $StrokeWidth)
    $graphics.FillPath($brush, $path)
    $graphics.DrawPath($pen, $path)
    $brush.Dispose()
    $pen.Dispose()
    $path.Dispose()
}

function Draw-Panel([float]$X, [float]$Y, [float]$W, [float]$H, [string]$Title, [string]$Subtitle, [string]$Fill, [string]$Stroke) {
    Draw-RoundedRect $X $Y $W $H 18 $Fill $Stroke 2
    Draw-Text $Title ($X + 28) ($Y + 18) ($W - 56) 38 27 $Stroke ([System.Drawing.FontStyle]::Bold)
    Draw-Text $Subtitle ($X + 28) ($Y + 55) ($W - 56) 28 17 '#59645E'
}

function Draw-Entity([float]$X, [float]$Y, [float]$W, [float]$H, [string]$Title, [string]$Collection, [string[]]$Fields, [string]$Accent) {
    Draw-RoundedRect $X $Y $W $H 12 '#FFFFFF' '#D5DDD7' 2
    $header = New-Object System.Drawing.SolidBrush((Get-Color $Accent))
    $graphics.FillRectangle($header, $X, $Y, $W, 54)
    $header.Dispose()
    Draw-Text $Title ($X + 18) ($Y + 7) ($W - 36) 29 22 '#FFFFFF' ([System.Drawing.FontStyle]::Bold)
    Draw-Text $Collection ($X + 18) ($Y + 32) ($W - 36) 19 14 '#F2F7F3'
    $fieldY = $Y + 64
    foreach ($field in $Fields) {
        Draw-Text $field ($X + 20) $fieldY ($W - 40) 23 17 '#28332D'
        $fieldY += 25
    }
}

function Draw-Relation([System.Drawing.Point[]]$Points, [string]$Label, [float]$LabelX, [float]$LabelY, [bool]$Dashed = $false) {
    $pen = New-Object System.Drawing.Pen((Get-Color '#78877E'), 3)
    $pen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(7, 9, $true)
    if ($Dashed) { $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash }
    $graphics.DrawLines($pen, $Points)
    $pen.Dispose()
    $font = New-Font 15 ([System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush((Get-Color '#35423A'))
    $size = $graphics.MeasureString($Label, $font)
    $graphics.FillRectangle((New-Object System.Drawing.SolidBrush((Get-Color '#F5F7F5'))), $LabelX - 5, $LabelY - 1, $size.Width + 10, $size.Height + 2)
    $graphics.DrawString($Label, $font, $brush, $LabelX, $LabelY)
    $font.Dispose()
    $brush.Dispose()
}

try {
    Draw-Text 'OmniSearch | Modelo ER NoSQL' 70 35 1600 62 43 '#1E2B23' ([System.Drawing.FontStyle]::Bold)
    Draw-Text 'MongoDB para metadatos persistentes, Redis para ejecucion efimera y LanceDB para vectores semanticos' 74 98 1900 34 21 '#526057'

    Draw-Panel 60 180 1500 1360 'MongoDB | Datos persistentes' 'Colecciones documentales: metadatos, ubicaciones, extracciones y trabajos duraderos' '#EFF6F0' '#39734A'
    Draw-Panel 1620 180 620 870 'Redis | Datos efimeros' 'Cola de trabajo, progreso temporal y cache con TTL' '#FFF2EC' '#BF542B'
    Draw-Panel 1620 1090 620 450 'LanceDB | Indice vectorial' 'Almacen de embeddings; MongoDB guarda referencias, no vectores' '#EEF2FB' '#4664A8'

    Draw-Relation @([System.Drawing.Point]::new(350, 550), [System.Drawing.Point]::new(350, 750)) '1 : N' 365 625
    Draw-Relation @([System.Drawing.Point]::new(700, 420), [System.Drawing.Point]::new(635, 420), [System.Drawing.Point]::new(635, 850), [System.Drawing.Point]::new(590, 850)) '1 : N' 638 620
    Draw-Relation @([System.Drawing.Point]::new(960, 550), [System.Drawing.Point]::new(960, 750)) '1 : N' 976 630
    Draw-Relation @([System.Drawing.Point]::new(1010, 550), [System.Drawing.Point]::new(1010, 650), [System.Drawing.Point]::new(1380, 650), [System.Drawing.Point]::new(1380, 750)) '1 : N' 1150 622
    Draw-Relation @([System.Drawing.Point]::new(960, 1000), [System.Drawing.Point]::new(960, 1190)) '1 : N' 976 1080
    Draw-Relation @([System.Drawing.Point]::new(1220, 1300), [System.Drawing.Point]::new(1670, 1300)) 'referencia al vector' 1370 1272 $true
    Draw-Relation @([System.Drawing.Point]::new(1510, 850), [System.Drawing.Point]::new(1585, 850), [System.Drawing.Point]::new(1585, 410), [System.Drawing.Point]::new(1670, 410)) 'jobId' 1588 625 $true
    Draw-Relation @([System.Drawing.Point]::new(1670, 890), [System.Drawing.Point]::new(1590, 890), [System.Drawing.Point]::new(1590, 245), [System.Drawing.Point]::new(1160, 245), [System.Drawing.Point]::new(1160, 300)) 'referencias a resultados' 1290 222 $true

    Draw-Entity 110 300 480 250 'WatchedFolder' 'MongoDB / watched_folders' @('ObjectId _id  PK', 'string rootPath  UK', 'boolean enabled', 'datetime createdAt') '#39734A'
    Draw-Entity 700 300 520 250 'File' 'MongoDB / files' @('ObjectId _id  PK', 'string sha256  UK', 'string mimeType', 'int sizeBytes', 'datetime modifiedAt', 'string indexStatus', 'datetime indexedAt') '#39734A'
    Draw-Entity 110 750 480 250 'FileLocation' 'MongoDB / file_locations' @('ObjectId _id  PK', 'string fileId  FK', 'string watchedFolderId  FK', 'string absolutePath  UK', 'string fileName', 'datetime discoveredAt') '#39734A'
    Draw-Entity 700 750 520 250 'Extraction' 'MongoDB / extractions' @('ObjectId _id  PK', 'string fileId  FK', 'string modality', 'string content', 'string modelName', 'datetime createdAt') '#39734A'
    Draw-Entity 1250 750 260 250 'IndexJob' 'MongoDB / index_jobs' @('ObjectId _id  PK', 'string fileId  FK', 'string status', 'int attempts', 'string errorCode', 'datetime updatedAt') '#39734A'
    Draw-Entity 700 1190 520 250 'ContentChunk' 'MongoDB / content_chunks' @('ObjectId _id  PK', 'string extractionId  FK', 'int sequence', 'string text', 'string vectorRecordId') '#39734A'

    Draw-Entity 1670 300 500 195 'IndexQueue' 'Redis / Stream index:jobs' @('string jobId', 'int attempt', 'datetime enqueuedAt') '#BF542B'
    Draw-Entity 1670 545 500 195 'JobState' 'Redis / Key job:{jobId}' @('string jobId  PK', 'string state', 'int progress', 'datetime expiresAt (TTL terminal)') '#BF542B'
    Draw-Entity 1670 790 500 195 'SearchCache' 'Redis / Key search:{queryHash}' @('string queryHash  PK', 'string resultReferences', 'datetime expiresAt (TTL corto)') '#BF542B'
    Draw-Entity 1670 1190 500 230 'VectorRecord' 'LanceDB / vector_records' @('string id  PK', 'string chunkId  UK', 'string modelName', 'vector<float> embedding') '#4664A8'

    Draw-RoundedRect 70 1570 28 28 6 '#39734A' '#39734A' 1
    Draw-Text 'MongoDB: persistencia' 110 1567 300 34 17 '#35423A'
    Draw-RoundedRect 375 1570 28 28 6 '#BF542B' '#BF542B' 1
    Draw-Text 'Redis: TTL / estructuras efimeras' 415 1567 390 34 17 '#35423A'
    Draw-Relation @([System.Drawing.Point]::new(830, 1584), [System.Drawing.Point]::new(925, 1584)) 'referencia logica' 950 1568 $true
    Draw-Text 'Los trabajos y archivos siguen siendo recuperables aunque expire la cache Redis.' 1240 1567 970 34 17 '#526057'

    $directory = Split-Path -Parent $OutputPath
    if (-not (Test-Path $directory)) { New-Item -ItemType Directory -Path $directory -Force | Out-Null }
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "PNG generado: $OutputPath ($width x $height)"
}
finally {
    $graphics.Dispose()
    $bitmap.Dispose()
}