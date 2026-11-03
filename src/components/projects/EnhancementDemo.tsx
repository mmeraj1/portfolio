import { useEffect, useRef, useState, type DragEvent } from 'react';
import ImageComparisonSlider from './ImageComparisonSlider';
import CornerCropper from './CornerCropper';
import { detectPhoto } from '../../lib/enhance/detect';
import { rectifiedSize, warpQuad, polygonArea } from '../../lib/enhance/geometry';
import type { Quad } from '../../lib/enhance/geometry';
import { rgbToLab } from '../../lib/enhance/lab';
import { fitWithin, tileCount } from '../../lib/enhance/tiling';

/**
 * Old-photo restoration, entirely in the visitor's browser (ONNX Runtime Web, WebGPU with a WASM
 * fallback). Pipeline: detect the print -> perspective-correct -> DDColor colorization ->
 * Real-ESRGAN restoration -> optional DeblurGAN-v2. Nothing is uploaded.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const BASE_SIDE = 3000;
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
const backendLabel = (b: string) => (b === 'webgpu' ? 'WebGPU' : 'WebAssembly (CPU)');

type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed';
interface Step { id: string; label: string; status: StepStatus; detail: string }
interface Progress { label: string; value: number | null }
interface Stage { label: string; url: string }
type CropState = 'pending' | 'applied' | 'skipped';

const stepDefs = (colorize: boolean, restoreOn: boolean, deblurOn: boolean): Step[] => [
  { id: 'colorize', label: 'AI colorization (DDColor)', status: colorize ? 'pending' : 'skipped', detail: colorize ? '' : 'Off' },
  { id: 'restore', label: 'Restoration & background enhancement (Real-ESRGAN)', status: restoreOn ? 'pending' : 'skipped', detail: restoreOn ? '' : 'Off' },
  { id: 'deblur', label: 'Deblur (DeblurGAN-v2)', status: deblurOn ? 'pending' : 'skipped', detail: deblurOn ? '' : 'Off' },
];

const canvasBlob = (c: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('The result image could not be encoded.'))), 'image/png'));

function scaled(source: HTMLCanvasElement | HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const size = fitWithin(w, h, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

const readPixels = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);

/** Mean Lab chroma on a small copy: low for black-and-white and sepia photographs. */
function meanChroma(canvas: HTMLCanvasElement): number {
  const small = scaled(canvas, 96);
  const { data } = readPixels(small);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) { const [, a, b] = rgbToLab(data[i], data[i + 1], data[i + 2]); sum += Math.hypot(a, b); }
  return sum / (data.length / 4);
}

export default function EnhancementDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [autoQuads, setAutoQuads] = useState<{ photo: Quad | null; print: Quad | null; confidence: number } | null>(null);
  const [cropNote, setCropNote] = useState('');
  const [cropState, setCropState] = useState<CropState>('pending');
  const [working, setWorking] = useState<HTMLCanvasElement | null>(null);
  const [workingUrl, setWorkingUrl] = useState<string | null>(null);
  const [includeBorder, setIncludeBorder] = useState(false);
  const [doColorize, setDoColorize] = useState(false);
  const [doRestore, setDoRestore] = useState(true);
  const [doDeblur, setDoDeblur] = useState(false);
  const [intensity, setIntensity] = useState(0.85);
  const [strength, setStrength] = useState(0.8);
  const [outScale, setOutScale] = useState<1 | 2>(1);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [runInfo, setRunInfo] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); abortRef.current?.abort(); }, []);
  const track = (blob: Blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };
  const busy = state === 'loading';

  function resetResults() { setResultUrl(null); setStages([]); setSteps([]); setRunInfo(''); setState('idle'); setMessage(''); setProgress(null); }

  async function accept(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setState('error'); setMessage('Please choose an image file (PNG, JPEG or WebP).'); return; }
    if (f.size > MAX_BYTES) { setState('error'); setMessage('Image is larger than 10 MB.'); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    try {
      img.src = url;
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      setState('error'); setMessage('This image could not be decoded by your browser.');
      return;
    }
    const canvas = scaled(img, BASE_SIDE);
    URL.revokeObjectURL(url);
    resetResults();
    setFile(f); setBase(canvas); setWorking(null); setWorkingUrl(null); setCropState('pending'); setIncludeBorder(false);
    setDoColorize(meanChroma(canvas) < 28);
    runAutoDetect(canvas);
  }

  function runAutoDetect(canvas: HTMLCanvasElement) {
    const analysis = scaled(canvas, 1600);
    const k = canvas.width / analysis.width;
    const found = detectPhoto(readPixels(analysis));
    const up = (q: Quad | undefined) => (q ? (q.map((p) => ({ x: p.x * k, y: p.y * k })) as Quad) : null);
    const photo = up(found.photo?.quad), print = up(found.print?.quad);
    const full: Quad = [{ x: 0, y: 0 }, { x: canvas.width, y: 0 }, { x: canvas.width, y: canvas.height }, { x: 0, y: canvas.height }];
    const confidence = found.photo?.confidence ?? 0;
    setAutoQuads({ photo, print, confidence });
    setQuad(photo ?? full);
    setIncludeBorder(false);
    if (!photo) setCropNote('No photograph outline could be detected automatically. Drag the four corners onto the photograph, or skip cropping.');
    else if (confidence < 0.6) setCropNote(`Detection is uncertain (confidence ${Math.round(confidence * 100)}%). Please check the outline and drag any corner that is off.`);
    else setCropNote(`Photograph detected (confidence ${Math.round(confidence * 100)}%). Check the outline, adjust the corners if needed, then apply the crop.`);
  }

  function applyCrop() {
    if (!base || !quad) return;
    const size = rectifiedSize(quad, base.width, base.height, 2048);
    const out = warpQuad(readPixels(base), quad, size.width, size.height);
    if (!out) { setCropNote('These corners do not form a valid shape. Move them apart and try again.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = out.width; canvas.height = out.height;
    canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(out.data), out.width, out.height), 0, 0);
    commitWorking(canvas, 'applied');
  }
  function skipCrop() { if (base) commitWorking(base, 'skipped'); }
  function commitWorking(canvas: HTMLCanvasElement, mode: CropState) {
    resetResults();
    setWorking(canvas); setCropState(mode);
    canvasBlob(canvas).then((b) => setWorkingUrl(track(b))).catch(() => setWorkingUrl(null));
  }
  function editCrop() { setCropState('pending'); setWorking(null); setWorkingUrl(null); resetResults(); }

  function toggleBorder(on: boolean) {
    setIncludeBorder(on);
    const next = on ? autoQuads?.print : autoQuads?.photo;
    if (next) setQuad(next);
  }

  const updateStep = (id: string, patch: Partial<Step>) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const downloadProgress = (name: string) => (l: number, t: number) => setProgress({ label: `Downloading ${name} ${mb(l)} / ${mb(t)}`, value: t ? l / t : null });
  const stageLabel = (label: string) => setProgress({ label, value: null });

  async function run() {
    if (!working) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    resetResults();
    setState('loading');
    setSteps(stepDefs(doColorize, doRestore, doDeblur));
    const gallery: Stage[] = [];
    const infos: string[] = [];
    const started = performance.now();
    let current = working;
    let failures = 0;
    const timer = window.setTimeout(() => controller.abort(), 900_000);
    const record = async (label: string, canvas: HTMLCanvasElement) => { gallery.push({ label, url: track(await canvasBlob(canvas)) }); setStages([...gallery]); };

    try {
      await record('Cropped original', working);
      if (doColorize) {
        updateStep('colorize', { status: 'running' });
        try {
          const { loadColorizer, colorize, DDCOLOR_BYTES } = await import('../../lib/enhance/colorize');
          const model = await loadColorizer(downloadProgress('DDColor model'), stageLabel);
          stageLabel('Colorizing…');
          const t0 = performance.now();
          const result = await colorize(current, model, signal);
          current = result.canvasAtIntensity(intensity);
          const detail = `${backendLabel(model.backend)} · ${((performance.now() - t0) / 1000).toFixed(1)}s · model ${mb(DDCOLOR_BYTES)}${model.fromCache ? ' (cached)' : ''}`;
          updateStep('colorize', { status: 'done', detail });
          infos.push(`Colorization: ${detail}`);
          await record('Colorized', current);
        } catch (err) {
          if (signal.aborted) throw err;
          failures++;
          updateStep('colorize', { status: 'failed', detail: (err as Error).message });
        }
      }

      if (doRestore) {
        updateStep('restore', { status: 'running' });
        try {
          const { loadRestorer, restore } = await import('../../lib/enhance/restore');
          const model = await loadRestorer(downloadProgress('restoration model'), stageLabel);
          const cap = (model.backend === 'webgpu' ? 1600 : 640) / outScale;
          const input = Math.max(current.width, current.height) > cap ? scaled(current, cap) : current;
          const t0 = performance.now();
          const result = await restore(input, model, { outputScale: outScale, strength }, (done, total) => setProgress({ label: `Restoring tile ${done} of ${total}`, value: done / total }), signal);
          const resized = input !== current ? ` (downscaled to ${input.width}×${input.height} for this browser)` : '';
          const detail = `${backendLabel(model.backend)} · ${result.width}×${result.height}px${resized} · ${((performance.now() - t0) / 1000).toFixed(1)}s`;
          current = result;
          updateStep('restore', { status: 'done', detail });
          infos.push(`Restoration: ${detail}`);
          await record('Restored', current);
        } catch (err) {
          if (signal.aborted) throw err;
          failures++;
          updateStep('restore', { status: 'failed', detail: (err as Error).message });
        }
      }

      if (doDeblur) {
        updateStep('deblur', { status: 'running' });
        try {
          const { loadModel, deblur } = await import('../../lib/enhance/deblur');
          const info = await loadModel(downloadProgress('DeblurGAN-v2 model'), stageLabel);
          const size = fitWithin(current.width, current.height, info.backend === 'webgpu' ? 2048 : 1024);
          const input = size.width === current.width ? current : scaled(current, Math.max(size.width, size.height));
          const total = tileCount(input.width, input.height);
          const t0 = performance.now();
          current = await deblur(input, (p) => setProgress({ label: `Deblurring tile ${p.done} of ${p.total}`, value: p.done / total }), signal);
          const detail = `${backendLabel(info.backend)} · ${total} tiles · ${((performance.now() - t0) / 1000).toFixed(1)}s`;
          updateStep('deblur', { status: 'done', detail });
          infos.push(`Deblur: ${detail}`);
          await record('Deblurred', current);
        } catch (err) {
          if (signal.aborted) throw err;
          failures++;
          updateStep('deblur', { status: 'failed', detail: (err as Error).message });
        }
      }

      if (current === working) {
        setState('error'); setMessage(doColorize || doRestore || doDeblur ? 'No enhancement step completed, so there is no result to show.' : 'Select at least one enhancement step.');
      } else {
        setResultUrl(gallery[gallery.length - 1].url);
        setState('success');
        setMessage(failures ? `Finished with ${failures} step${failures > 1 ? 's' : ''} unavailable in this browser.` : 'Restoration complete.');
        setRunInfo(`${infos.join(' · ')} · total ${((performance.now() - started) / 1000).toFixed(1)}s`);
      }
    } catch (err) {
      setState('error');
      setMessage(signal.aborted ? 'Processing was cancelled or took too long.' : (err as Error).message);
    } finally {
      window.clearTimeout(timer);
      setProgress(null);
      setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed', detail: 'Stopped' } : s)));
    }
  }

  const outName = file ? `restored-${file.name.replace(/\.[^.]+$/, '')}.png` : 'restored.png';
  const cropArea = quad && base ? polygonArea(quad) / (base.width * base.height) : 1;
  const fullQuad = quad && base && quad.every((p, i) => Math.abs(p.x - (i === 1 || i === 2 ? base.width : 0)) < 1 && Math.abs(p.y - (i >= 2 ? base.height : 0)) < 1);

  return (
    <div className="pj-demo">
      <p className="pj-notice"><strong>Runs in your browser.</strong> Photos are processed locally and never uploaded. Models are downloaded on first use (colorization ≈ 135 MB, restoration ≈ 5 MB, deblur ≈ 23 MB) and cached. Colorization estimates plausible colours — it cannot recover the original ones — and GAN models may invent fine detail.</p>
      <div
        className={dragging ? 'pj-drop pj-drop-active' : 'pj-drop'}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); void accept(e.dataTransfer.files[0]); }}
        role="button" tabIndex={0} aria-label="Upload an image" onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden data-testid="image-input" onChange={(e) => { void accept(e.target.files?.[0]); e.target.value = ''; }} />
        <p><strong>Drag &amp; drop a photo</strong> or click to browse</p>
        <small>PNG, JPEG or WebP · up to 10 MB · a phone photo of a printed picture works best</small>
      </div>

      {base && quad && cropState === 'pending' && (
        <div className="pj-crop">
          <h4>1 · Find the photograph</h4>
          <CornerCropper base={base} quad={quad} disabled={busy} onChange={setQuad} />
          {cropNote && <small className="pj-crop-note" role="status" data-testid="crop-note">{cropNote}</small>}
          {autoQuads?.print && autoQuads.photo && (
            <label className="pj-check"><input type="checkbox" checked={includeBorder} onChange={(e) => toggleBorder(e.target.checked)} /> Include the paper border around the picture</label>
          )}
          {cropArea < 0.25 && !fullQuad && <small className="pj-warn" role="alert">This crop covers only {Math.round(cropArea * 100)}% of the image — make sure no faces are cut off.</small>}
          <div className="pj-crop-controls">
            <button type="button" className="pj-btn pj-btn-primary" disabled={busy} onClick={applyCrop}>Apply crop</button>
            <button type="button" className="pj-btn" disabled={busy} onClick={() => base && runAutoDetect(base)}>Auto detect</button>
            <button type="button" className="pj-btn" disabled={busy} onClick={() => base && setQuad([{ x: 0, y: 0 }, { x: base.width, y: 0 }, { x: base.width, y: base.height }, { x: 0, y: base.height }])}>Reset</button>
            <button type="button" className="pj-btn" disabled={busy} onClick={skipCrop}>Skip cropping</button>
          </div>
        </div>
      )}

      {working && (
        <div className="pj-crop">
          <h4>2 · Restore</h4>
          <p className="pj-crop-note">{cropState === 'applied' ? `Perspective-corrected crop ready (${working.width}×${working.height}px).` : 'Using the whole image (cropping skipped).'} <button type="button" className="pj-link" disabled={busy} onClick={editCrop}>Edit crop</button></p>
          <div className="pj-options">
            <label className="pj-check"><input type="checkbox" checked={doColorize} disabled={busy} onChange={(e) => setDoColorize(e.target.checked)} /> AI colorization (DDColor) — for black-and-white or sepia photos</label>
            {doColorize && <label>Colour intensity: {Math.round(intensity * 100)}%<input type="range" min={0.2} max={1} step={0.05} value={intensity} disabled={busy} onChange={(e) => setIntensity(Number(e.target.value))} /></label>}
            <label className="pj-check"><input type="checkbox" checked={doRestore} disabled={busy} onChange={(e) => setDoRestore(e.target.checked)} /> Restoration &amp; background enhancement (Real-ESRGAN) — denoise, sharpen, recover detail</label>
            {doRestore && <>
              <label>Restoration strength: {Math.round(strength * 100)}%<input type="range" min={0.2} max={1} step={0.05} value={strength} disabled={busy} onChange={(e) => setStrength(Number(e.target.value))} /></label>
              <label>Output size<select value={outScale} disabled={busy} onChange={(e) => setOutScale(Number(e.target.value) as 1 | 2)}><option value={1}>Same size</option><option value={2}>2× larger</option></select></label>
            </>}
            <label className="pj-check"><input type="checkbox" checked={doDeblur} disabled={busy} onChange={(e) => setDoDeblur(e.target.checked)} /> Extra deblur pass (DeblurGAN-v2)</label>
          </div>
          <div className="pj-controls">
            <button type="button" className="pj-btn pj-btn-primary" disabled={busy || !(doColorize || doRestore || doDeblur)} onClick={() => void run()}>{busy ? 'Processing…' : 'Restore photo'}</button>
            {busy && <button type="button" className="pj-btn" onClick={() => abortRef.current?.abort()}>Cancel</button>}
            {resultUrl
              ? <a className="pj-btn" href={resultUrl} download={outName}>Download restored image</a>
              : <button type="button" className="pj-btn" disabled>Download restored image</button>}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="pj-steps" aria-label="Pipeline status">
          {steps.map((s) => <li key={s.id} className={`pj-step pj-step-${s.status}`} data-testid={`step-${s.id}`}><strong>{s.label}</strong> <span>{s.status}{s.detail ? ` — ${s.detail}` : ''}</span></li>)}
        </ol>
      )}
      {progress && (
        <div className="pj-progress" role="status" aria-live="polite">
          <span>{progress.label}</span>
          <progress max={1} value={progress.value ?? undefined} />
        </div>
      )}
      <p className={`pj-msg pj-msg-${state}`} role="status" aria-live="polite">{message}</p>
      {runInfo && <small className="pj-run-info" data-testid="run-info">{runInfo}</small>}

      {stages.length > 1 && (
        <div className="pj-stages">
          {stages.map((s) => <figure key={s.label}><figcaption>{s.label}</figcaption><img src={s.url} alt={s.label} /></figure>)}
        </div>
      )}
      {workingUrl && resultUrl && (
        <>
          <div className="pj-previews">
            <figure><figcaption>Before (cropped)</figcaption><img src={workingUrl} alt="Cropped original" /></figure>
            <figure><figcaption>Restored</figcaption><img src={resultUrl} alt="Restored result" data-testid="enhanced-image" /></figure>
          </div>
          <div className="pj-slider-wrap"><h4>Before / After</h4><ImageComparisonSlider before={workingUrl} after={resultUrl} /></div>
        </>
      )}
    </div>
  );
}
