
# Script para generar iconos PWA desde un SVG base
# Requiere Inkscape instalado o simplemente usa el SVG como base
# Este script intenta usar System.Drawing si está disponible

Add-Type -AssemblyName System.Drawing


Write-Host "Generando iconos..."

# Nota: PowerShell nativo no renderiza SVG a Bitmap fácilmente sin librerías externas.
# Por lo tanto, crearemos un script HTML/JS que el usuario puede abrir para descargar los iconos
# o simplemente usaremos el SVG como fallback.

$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Generador de Iconos</title>
</head>
<body>
    <h1>Generando Iconos...</h1>
    <p>Por favor espera, las descargas comenzarán automáticamente.</p>
    <canvas id="canvas" style="display:none;"></canvas>
    <img id="source" src="icon.svg" style="display:none;" onload="generateIcons()" />
    <script>
        function generateIcons() {
            const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
            const img = document.getElementById('source');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            sizes.forEach(size => {
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);
                
                const link = document.createElement('a');
                link.download = 'icon-' + size + 'x' + size + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
            
            document.body.innerHTML += '<p style="color:green">¡Iconos generados! Revisa tu carpeta de descargas.</p>';
        }
    </script>
</body>
</html>
"@

$htmlContent | Out-File "d:\test antigravity\cismm-x-connect\public\icons\generator.html" -Encoding utf8

Write-Host "He creado un generador de iconos en public/icons/generator.html"
Write-Host "Abre ese archivo en tu navegador para descargar los PNGs."
