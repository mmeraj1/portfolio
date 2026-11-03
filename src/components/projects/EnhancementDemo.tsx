import { useEffect, useRef, useState, type DragEvent } from 'react';
import ImageComparisonSlider from './ImageComparisonSlider';

/**
 * Backend contract:
 *   POST {VITE_ENHANCE_API_URL}/enhance   multipart/form-data: file, method
 *   -> 200 with the enhanced image as the response body (image/*)
 * When VITE_ENHANCE_API_URL is unset the demo is shown as "not connected".
 */
const API_URL = (import.meta.env.VITE_ENHANCE_API_URL as string | undefined)?.replace(/\/$/, '');
const MAX_BYTES = 10 * 1024 * 1024;
const allMethods = [
  { id: 'deblur', label: 'DeblurGAN-v2 — deblur (GAN)' },
  { id: 'colorize', label: 'DeOldify — colorize (GAN)' },
  { id: 'auto', label: 'Auto Enhance (OpenCV)' },
  { id: 'clahe', label: 'Contrast (CLAHE)' },
  { id: 'gamma', label: 'Brightness (Gamma)' },
  { id: 'sharpen', label: 'Sharpen' },
];

type Status = 'checking' | 'online' | 'offline';
type State = 'idle' | 'loading' | 'success' | 'error';

export default function EnhancementDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [methods, setMethods] = useState(allMethods);
  const [method, setMethod] = useState(allMethods[0].id);
  const [status, setStatus] = useState<Status>(API_URL ? 'checking' : 'offline');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  useEffect(() => {
    if (!API_URL) return;
    const controller = new AbortController();
    fetch(`${API_URL}/methods`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((j: { methods: string[] }) => {
        const available = allMethods.filter((m) => j.methods.includes(m.id));
        if (available.length) { setMethods(available); setMethod(available[0].id); }
        setStatus('online');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('offline'); });
    return () => controller.abort();
  }, []);
  const track = (blob: Blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };

  function accept(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setState('error'); setMessage('Please choose an image file (PNG, JPEG or WebP).'); return; }
    if (f.size > MAX_BYTES) { setState('error'); setMessage('Image is larger than 10 MB.'); return; }
    setFile(f); setOriginal(track(f)); setEnhanced(null); setState('idle'); setMessage('');
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files[0]); };

  async function enhance() {
    if (!API_URL || !file) return;
    setState('loading'); setMessage('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 300_000);
    try {
      const body = new FormData();
      body.set('file', file); body.set('method', method);
      const res = await fetch(`${API_URL}/enhance`, { method: 'POST', body, signal: controller.signal });
      if (!res.ok) {
        const detail = await res.json().then((j) => (typeof j.detail === 'string' ? j.detail : '')).catch(() => '');
        throw new Error(detail || `The service responded with status ${res.status}.`);
      }
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('The service returned an unexpected response.');
      setEnhanced(track(blob)); setState('success'); setMessage('Enhancement complete.');
    } catch (err) {
      setState('error');
      setMessage(controller.signal.aborted ? 'The service took too long to respond. It may be waking up — please try again.'
        : err instanceof TypeError ? 'Could not reach the enhancement service. Please try again later.'
        : (err as Error).message);
    } finally {
      window.clearTimeout(timer);
    }
  }

  const connected = Boolean(API_URL);
  const outName = file ? `enhanced-${file.name.replace(/\.[^.]+$/, '')}.png` : 'enhanced.png';

  return (
    <div className="pj-demo">
      {!connected && <p className="pj-notice" role="status"><strong>Backend not connected.</strong> No enhancement service is configured for this build, so enhancement is disabled. You can still preview an upload locally; nothing is sent anywhere.</p>}
      {connected && <p className="pj-msg" role="status"><strong>Backend:</strong> {status === 'online' ? 'online' : status === 'checking' ? 'connecting… (a sleeping Space can take a minute to wake)' : 'unreachable — enhancement may fail'}</p>}
      {connected && <p className="pj-notice"><strong>Processing note.</strong> The image is uploaded to the configured backend. GANs may alter or invent detail; DeOldify predicts plausible colors rather than recovering the original colors.</p>}
      <div
        className={dragging ? 'pj-drop pj-drop-active' : 'pj-drop'}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
        role="button" tabIndex={0} aria-label="Upload an image" onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ''; }} />
        <p><strong>Drag &amp; drop an image</strong> or click to browse</p>
        <small>PNG, JPEG or WebP · up to 10 MB</small>
      </div>

      <div className="pj-controls">
        <label>Model or method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>{methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
        </label>
        <button type="button" className="pj-btn pj-btn-primary" disabled={!connected || !file || state === 'loading'} onClick={enhance}>{state === 'loading' ? 'Enhancing…' : 'Enhance Image'}</button>
        {enhanced
          ? <a className="pj-btn" href={enhanced} download={outName}>Download Enhanced Image</a>
          : <button type="button" className="pj-btn" disabled>Download Enhanced Image</button>}
      </div>

      <p className={`pj-msg pj-msg-${state}`} role="status" aria-live="polite">{state === 'loading' ? 'Processing image…' : message}</p>

      <div className="pj-previews">
        <figure><figcaption>Original</figcaption>{original ? <img src={original} alt="Original upload" /> : <div className="pj-empty-preview">No image selected</div>}</figure>
        <figure><figcaption>Enhanced</figcaption>{enhanced ? <img src={enhanced} alt="Enhanced result" /> : <div className="pj-empty-preview">{connected ? 'Result will appear here' : 'Unavailable until the service is connected'}</div>}</figure>
      </div>

      {original && enhanced && <div className="pj-slider-wrap"><h4>Before / After</h4><ImageComparisonSlider before={original} after={enhanced} /></div>}
    </div>
  );
}
