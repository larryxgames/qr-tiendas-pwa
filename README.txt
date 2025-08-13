# PWA: QR → Tiendas (v3 con Linterna)
CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vS58VxZhfp2Z4pfQCG26_LaH9E765Ijf5t6Dz-50il_uwie1LtSt5E9OV_4uVoXQ7CoitaMcj1GniIi/pub?gid=0&single=true&output=csv

Novedad:
- **Botón de linterna (torch)** durante el escaneo. Se habilita automáticamente si el dispositivo/navegador lo soporta (capability `torch`).

Incluye también (de v2):
- Selector de tamaño del cuadro del QR.
- Vibración y sonido opcionales.
- Normalización de SKU.
- Aviso si el SKU existe pero no tiene URLs.
- Banner "Nueva versión disponible" (Service Worker en espera).

Deploy: GitHub Pages (root). HTTPS requerido.
