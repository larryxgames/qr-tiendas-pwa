
// app.js (LIVE v2)
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
const selQrbox = document.getElementById('qrbox');
const chkVibrate = document.getElementById('vibrate');
const chkSound = document.getElementById('sound');

let html5QrCode = null;
let currentCameraId = null;
let cameras = [];
let audioCtx = null;

const LS = { qrbox: 'qr.qrbox', vibrate: 'qr.vibrate', sound: 'qr.sound' };

(function loadPrefs() {
  const q = localStorage.getItem(LS.qrbox); if (q) selQrbox.value = q;
  const v = localStorage.getItem(LS.vibrate); if (v !== null) chkVibrate.checked = v == '1';
  const s = localStorage.getItem(LS.sound); if (s !== null) chkSound.checked = s == '1';
})();

selQrbox.onchange = () => localStorage.setItem(LS.qrbox, selQrbox.value);
chkVibrate.onchange = () => localStorage.setItem(LS.vibrate, chkVibrate.checked ? '1' : '0');
chkSound.onchange = () => localStorage.setItem(LS.sound, chkSound.checked ? '1' : '0');

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

function normSKU(s) { return (s ?? '').toString().trim().toUpperCase(); }

function findRowBySKU(sku) {
  const target = normSKU(sku);
  if (!target) return null;
  return SHEET_ROWS.find(r => normSKU(r['SKU']) === target) || null;
}

function anyURL(row) {
  for (const key of SHEET_HEADERS) {
    if (key === 'SKU') continue;
    const val = (row[key] || '').toString().trim();
    if (/^https?:\/\//i.test(val)) return true;
  }
  return false;
}

function renderOpciones(sku, row) {
  resultado.innerHTML = '';
  const skuNorm = normSKU(sku);
  if (!row) { resultado.innerHTML = `<p>No se encontró el SKU <span class="sku">${skuNorm}</span>.</p>`; return; }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<p>SKU: <span class="sku">${skuNorm}</span></p>`;
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

  if (!grid.childElementCount) {
    const p = document.createElement('p');
    p.textContent = "Este SKU existe, pero no tiene URLs configuradas.";
    wrapper.appendChild(p);
  } else {
    wrapper.appendChild(grid);
  }
  resultado.appendChild(wrapper);
}

function playBeep() {
  if (!chkSound.checked) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, audioCtx.currentTime);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    o.stop(audioCtx.currentTime + 0.14);
  } catch (e) {}
}

function haptic() {
  if (chkVibrate.checked && navigator.vibrate) navigator.vibrate(60);
}

function onScanSuccess(decodedText) {
  if (onScanSuccess._last === decodedText) return;
  onScanSuccess._last = decodedText;
  haptic(); playBeep();
  skuInput.value = normSKU(decodedText);
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
      const box = parseInt(selQrbox.value || '260', 10);
      await html5QrCode.start(
        currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: "environment" },
        { fps: 10, qrbox: box },
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
