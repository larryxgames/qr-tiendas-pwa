
// app.js (LIVE)
export const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS58VxZhfp2Z4pfQCG26_LaH9E765Ijf5t6Dz-50il_uwie1LtSt5E9OV_4uVoXQ7CoitaMcj1GniIi/pub?gid=0&single=true&output=csv";

let SHEET_HEADERS = [];
let SHEET_ROWS = [];
let SHEET_LAST_LOADED_AT = null;

const readerEl = document.getElementById('reader');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnFlip = document.getElementById('btnFlip');
const skuInput = document.getElementById('skuInput');
const btnBuscar = document.getElementById('btnBuscar');
const btnCargar = document.getElementById('btnCargar');
const resultado = document.getElementById('resultado');
const sheetInfo = document.getElementById('sheetInfo');

let html5QrCode = null;
let currentCameraId = null;
let cameras = [];

async function init() { await loadSheet(); initQR(); }
window.addEventListener('DOMContentLoaded', init);

async function loadSheet() { 
  return new Promise((resolve) => { 
    Papa.parse(CSV_URL, { download:true, header:true, skipEmptyLines:true,
      complete: (results) => { 
        SHEET_HEADERS = results.meta.fields || [];
        SHEET_ROWS = results.data || [];
        SHEET_LAST_LOADED_AT = new Date();
        sheetInfo.textContent = `Hoja cargada (${SHEET_ROWS.length} filas, ${SHEET_HEADERS.length} columnas) – ${SHEET_LAST_LOADED_AT.toLocaleString()}`;
        resolve();
      },
      error: (err) => { sheetInfo.textContent = "Error al cargar CSV: " + err; resolve(); }
    });
  });
}

function findRowBySKU(sku) {
  if (!sku) return null;
  const target = (sku + "").trim();
  return SHEET_ROWS.find(r => ((r['SKU'] ?? '') + '').trim() === target) || null;
}

function renderOpciones(sku, row) {
  resultado.innerHTML = '';
  if (!row) { resultado.innerHTML = `<p>No se encontró el SKU <span class="sku">${sku}</span>.</p>`; return; }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<p>SKU: <span class="sku">${sku}</span></p>`;
  const grid = document.createElement('div'); grid.className = 'grid';
  for (const key of SHEET_HEADERS) {
    if (key === 'SKU') continue;
    const val = (row[key] || '').toString().trim();
    if (!val) continue;
    if (/^https?:\/\//i.test(val)) {
      const btn = document.createElement('button');
      btn.textContent = key;
      btn.onclick = () => window.open(val, '_blank', 'noopener,noreferrer');
      grid.appendChild(btn);
    }
  }
  if (!grid.childElementCount) { wrapper.appendChild(document.createTextNode("No hay URLs para este SKU.")); }
  else { wrapper.appendChild(grid); }
  resultado.appendChild(wrapper);
}

function onScanSuccess(decodedText) {
  if (onScanSuccess._last === decodedText) return;
  onScanSuccess._last = decodedText;
  navigator.vibrate && navigator.vibrate(60);
  skuInput.value = decodedText;
  const row = findRowBySKU(decodedText);
  renderOpciones(decodedText, row);
  setTimeout(() => onScanSuccess._last = null, 1500);
}

async function initQR() {
  try {
    cameras = await Html5Qrcode.getCameras();
    if (cameras.length) currentCameraId = cameras[cameras.length - 1].id;
  } catch (e) { console.warn('No cameras:', e); }

  html5QrCode = new Html5Qrcode('reader');
  btnStart.onclick = async () => {
    try {
      await html5QrCode.start(
        currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: "environment" },
        { fps:10, qrbox:260 },
        onScanSuccess
      );
    } catch (e) { alert('No se pudo iniciar la cámara: ' + e); }
  };
  btnStop.onclick = async () => { try { await html5QrCode.stop(); } catch {} };
  btnFlip.onclick = async () => {
    if (!cameras.length) return;
    const idx = cameras.findIndex(c => c.id === currentCameraId);
    const next = cameras[(idx + 1) % cameras.length];
    currentCameraId = next.id;
    if (html5QrCode.isScanning) { await html5QrCode.stop(); await btnStart.onclick(); }
  };
  skuInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') btnBuscar.click(); });
  btnBuscar.onclick = () => { const sku = skuInput.value.trim(); const row = findRowBySKU(sku); renderOpciones(sku, row); };
  btnCargar.onclick = () => loadSheet();
}
