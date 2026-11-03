import { useEffect, useRef, useState, type DragEvent } from 'react';
import ImageComparisonSlider from './ImageComparisonSlider';
import { clampRect, detectPhotoBounds, type CropRect } from '../../lib/enhance/crop';
import { fitWithin, tileCount } from '../../lib/enhance/tiling';

/**
 * The live demo runs DeblurGAN-v2 entirely in the visitor's browser (ONNX Runtime Web, WebGPU with
 * a WASM fallback), so no image leaves the device. If VITE_ENHANCE_API_URL is set, the optional
 * server methods (POST {url}/enhance with multipart `file` and `method`) are offered as well.
 */
const API_URL = (import.meta.env.VITE_ENHANCE_API_URL as string | undefined)?.replace(/\/$/, '');
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = { webgpu: 2048, wasm: 1024 } as const;

const browserMethods = [{ id: 'browser:deblur', label: 'DeblurGAN-v2 — deblur (GAN, runs in your browser)' }];
const serverMethods = API_URL ? [
  { id: 'server:deblur', label: 'DeblurGAN-v2 — deblur (GAN, server)' },
  { id: 'server:colorize', label: 'DeOldify — colorize (GAN, server)' },
  { id: 'server:auto', label: 'Auto Enhance (OpenCV, server)' },
] : [];
const methods = [...browserMethods, ...serverMethods];

type State = 'idle' | 'loading' | 'success' | 'error';
interface Trim { left: number; top: number; right: number; bottom: number }
interface Progress { label: string; value: number | null }

const noTrim: Trim = { left: 0, top: 0, right: 0, bottom: 0 };
const trimToRect = (t: Trim, w: number, h: number): CropRect => clampRect({
  x: (t.left / 100) * w, y: (t.top / 100) * h,
  width: w * (1 - (t.left + t.right) / 100), height: h * (1 - (t.top + t.bottom) / 100),
}, w, h);
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export default function EnhancementDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [method, setMethod] = useState(methods[0].id);
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dragging, setDragging] = useState(false);
  const [trim, setTrim] = useState<Trim>(noTrim);
  const [cropNote, setCropNote] = useState('');
  const [runInfo, setRunInfo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const urls = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); abortRef.current?.abort(); }, []);
  const track = (blob: Blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };

  function accept(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setState('error'); setMessage('Please choose an image file (PNG, JPEG or WebP).'); return; }
    if (f.size > MAX_BYTES) { setState('error'); setMessage('Image is larger than 10 MB.'); return; }
    const url = track(f);
    const img = new Image();
    img.onload = () => { imageRef.current = img; };
    img.onerror = () => { imageRef.current = null; setState('error'); setMessage('This image could not be decoded by your browser.'); };
    img.src = url;
    setFile(f); setOriginal(url); setEnhanced(null); setBefore(null); setState('idle'); setMessage(''); setTrim(noTrim); setCropNote(''); setRunInfo(''); setProgress(null);
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files[0]); };

  function autoCrop() {
    const img = imageRef.current;
    if (!img) return;
    const scale = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const found = detectPhotoBounds(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (!found) { setTrim(noTrim); setCropNote('No clear photo border was detected. Adjust the sliders manually if needed.'); return; }
    const { rect } = found;
    setTrim({
      left: (rect.x / canvas.width) * 100, top: (rect.y / canvas.height) * 100,
      right: (1 - (rect.x + rect.width) / canvas.width) * 100, bottom: (1 - (rect.y + rect.height) / canvas.height) * 100,
    });
    setCropNote('Border detected as a rectangle. Fine-tune it with the sliders; skewed photos are cropped to their bounding box.');
  }

  async function enhanceInBrowser(img: HTMLImageElement, signal: AbortSignal) {
    const { loadModel, deblur } = await import('../../lib/enhance/deblur');
    const info = await loadModel(
      (done, total) => setProgress({ label: `Downloading model ${mb(done)} / ${mb(total)}`, value: total ? done / total : null }),
      (label) => setProgress({ label, value: null }),
    );
    const rect = trimToRect(trim, img.naturalWidth, img.naturalHeight);
    const size = fitWithin(rect.width, rect.height, MAX_SIDE[info.backend]);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, size.width, size.height);
    const beforeBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    const started = performance.now();
    const total = tileCount(size.width, size.height);
    const result = await deblur(canvas, (p) => setProgress({ label: `Enhancing tile ${p.done} of ${p.total}`, value: p.done / total }), signal);
    const blob = await new Promise<Blob | null>((resolve) => result.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The result image could not be encoded.');
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    setRunInfo(`${info.backend === 'webgpu' ? 'WebGPU' : 'WebAssembly (CPU)'} · ${size.width}×${size.height}px · ${total} tiles · ${seconds}s · model ${mb(info.modelBytes)}, loaded in ${(info.loadMs / 1000).toFixed(1)}s`);
    return { blob, beforeBlob };
  }

  async function enhanceOnServer(signal: AbortSignal) {
    const body = new FormData();
    body.set('file', file!); body.set('method', method.replace('server:', ''));
    setProgress({ label: 'Waiting for the server…', value: null });
    const res = await fetch(`${API_URL}/enhance`, { method: 'POST', body, signal });
    if (!res.ok) {
      const detail = await res.json().then((j) => (typeof j.detail === 'string' ? j.detail : '')).catch(() => '');
      throw new Error(detail || `The service responded with status ${res.status}.`);
    }
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The service returned an unexpected response.');
    return blob;
  }

  async function enhance() {
    const img = imageRef.current;
    if (!file || !img) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState('loading'); setMessage(''); setEnhanced(null); setBefore(null); setRunInfo('');
    const timer = window.setTimeout(() => controller.abort(), 600_000);
    try {
      const result = method.startsWith('server:')
        ? { blob: await enhanceOnServer(controller.signal), beforeBlob: null }
        : await enhanceInBrowser(img, controller.signal);
      setBefore(result.beforeBlob ? track(result.beforeBlob) : original);
      setEnhanced(track(result.blob)); setState('success'); setMessage('Enhancement complete.');
    } catch (err) {
      setState('error');
      setMessage(controller.signal.aborted ? 'Enhancement was cancelled or took too long.'
        : err instanceof TypeError && method.startsWith('server:') ? 'Could not reach the enhancement service. Please try again later.'
        : (err as Error).message);
    } finally {
      window.clearTimeout(timer);
      setProgress(null);
    }
  }

  const rect = original && imageRef.current ? trimToRect(trim, imageRef.current.naturalWidth || 1, imageRef.current.naturalHeight || 1) : null;
  const cropped = trim.left + trim.right + trim.top + trim.bottom > 0.01;
  const busy = state === 'loading';
  const outName = file ? `enhanced-${file.name.replace(/\.[^.]+$/, '')}.png` : 'enhanced.png';
  const slider = (key: keyof Trim, label: string) => (
    <label key={key}>{label}: {trim[key].toFixed(0)}%
      <input type="range" min={0} max={45} step={0.5} value={trim[key]} disabled={busy} onChange={(e) => setTrim({ ...trim, [key]: Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="pj-demo">
      <p className="pj-notice"><strong>Runs in your browser.</strong> Images are processed locally on your device with a GAN (DeblurGAN-v2) and are never uploaded. The first run downloads a ~23 MB model. GANs may alter or invent fine detail.</p>
      <div
        className={dragging ? 'pj-drop pj-drop-active' : 'pj-drop'}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
        role="button" tabIndex={0} aria-label="Upload an image" onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden data-testid="image-input" onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
        <p><strong>Drag &amp; drop an image</strong> or click to browse</p>
        <small>PNG, JPEG or WebP · up to 10 MB</small>
      </div>

      {original && (
        <div className="pj-crop">
          <h4>Crop to the photograph</h4>
          <div className="pj-crop-stage">
            <img src={original} alt="Original upload with crop outline" />
            {rect && cropped && imageRef.current && (
              <div className="pj-crop-box" style={{
                left: `${(rect.x / imageRef.current.naturalWidth) * 100}%`, top: `${(rect.y / imageRef.current.naturalHeight) * 100}%`,
                width: `${(rect.width / imageRef.current.naturalWidth) * 100}%`, height: `${(rect.height / imageRef.current.naturalHeight) * 100}%`,
              }} />
            )}
          </div>
          <div className="pj-crop-controls">
            <button type="button" className="pj-btn" disabled={busy} onClick={autoCrop}>Auto-detect photo</button>
            <button type="button" className="pj-btn" disabled={busy || !cropped} onClick={() => { setTrim(noTrim); setCropNote(''); }}>Reset crop</button>
            {slider('left', 'Trim left')}{slider('right', 'Trim right')}{slider('top', 'Trim top')}{slider('bottom', 'Trim bottom')}
          </div>
          {cropNote && <small className="pj-crop-note" role="status">{cropNote}</small>}
        </div>
      )}

      <div className="pj-controls">
        <label>Model or method
          <select value={method} onChange={(e) => setMethod(e.target.value)} disabled={busy}>{methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
        </label>
        <button type="button" className="pj-btn pj-btn-primary" disabled={!file || busy} onClick={enhance}>{busy ? 'Enhancing…' : 'Enhance Image'}</button>
        {busy && <button type="button" className="pj-btn" onClick={() => abortRef.current?.abort()}>Cancel</button>}
        {enhanced
          ? <a className="pj-btn" href={enhanced} download={outName}>Download Enhanced Image</a>
          : <button type="button" className="pj-btn" disabled>Download Enhanced Image</button>}
      </div>

      {progress && (
        <div className="pj-progress" role="status" aria-live="polite">
          <span>{progress.label}</span>
          <progress max={1} value={progress.value ?? undefined} />
        </div>
      )}
      <p className={`pj-msg pj-msg-${state}`} role="status" aria-live="polite">{message}</p>
      {runInfo && <small className="pj-run-info" data-testid="run-info">{runInfo}</small>}

      <div className="pj-previews">
        <figure><figcaption>Original</figcaption>{original ? <img src={original} alt="Original upload" /> : <div className="pj-empty-preview">No image selected</div>}</figure>
        <figure><figcaption>Enhanced</figcaption>{enhanced ? <img src={enhanced} alt="Enhanced result" data-testid="enhanced-image" /> : <div className="pj-empty-preview">Result will appear here</div>}</figure>
      </div>

      {before && enhanced && <div className="pj-slider-wrap"><h4>Before / After</h4><ImageComparisonSlider before={before} after={enhanced} /></div>}
    </div>
  );
}
