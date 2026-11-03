import { useEffect, useRef, useState } from 'react';
import ImageComparisonSlider from './ImageComparisonSlider';
import CornerCropper from './CornerCropper';
import PhotoUpload from './PhotoUpload';
import { detectPhoto } from '../../lib/enhance/detect';
import { rectifiedSize, warpQuad, polygonArea } from '../../lib/enhance/geometry';
import type { Quad } from '../../lib/enhance/geometry';
import { fitWithin, tileCount } from '../../lib/enhance/tiling';

/**
 * Old-photo restoration, entirely in the visitor's browser (ONNX Runtime Web, WebGPU with a WASM
 * fallback). Pipeline: detect the print -> perspective-correct -> DDColor colorization ->
 * Real-ESRGAN restoration -> optional DeblurGAN-v2. Nothing is uploaded.
 */
const BASE_SIDE = 3000;
const COLOR_INTENSITY = 0.85;
const DETAIL_STRENGTH = 0.8;

type StepStatus = 'pending' | 'running' | 'done' | 'failed';
interface Step { id: keyof EnhancementOptions; label: string; status: StepStatus }
interface Progress { label: string; value: number | null }
type CropState = 'pending' | 'applied' | 'skipped';
interface EnhancementOptions { colorize: boolean; deblur: boolean; background: boolean }

const OPTION_CARDS: { key: keyof EnhancementOptions; title: string; text: string }[] = [
  { key: 'colorize', title: 'Colorize Photo', text: 'Add natural colors to old black-and-white or faded photos.' },
  { key: 'deblur', title: 'Remove Blur', text: 'Improve sharpness and reduce blur.' },
  { key: 'background', title: 'Enhance Photo Details', text: 'Reduce noise and recover detail across the whole photo.' },
];
const STEP_LABELS: Record<keyof EnhancementOptions, string> = { colorize: 'Adding colors', deblur: 'Removing blur', background: 'Enhancing details' };

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
  const [options, setOptions] = useState<EnhancementOptions>({ colorize: false, deblur: false, background: false });
  const [steps, setSteps] = useState<Step[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const urls = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { urls.current.forEach(URL.revokeObjectURL); abortRef.current?.abort(); }, []);
  const track = (blob: Blob) => { const u = URL.createObjectURL(blob); urls.current.push(u); return u; };
  const busy = state === 'loading';

  function resetResults() { abortRef.current?.abort(); setResultUrl(null); setSteps([]); setState('idle'); setMessage(''); setProgress(null); }

  function resetAll() {
    resetResults();
    urls.current.forEach(URL.revokeObjectURL); urls.current = [];
    setFile(null); setBase(null); setQuad(null); setAutoQuads(null); setCropNote('');
    setWorking(null); setWorkingUrl(null); setCropState('pending'); setIncludeBorder(false);
    setOptions({ colorize: false, deblur: false, background: false });
  }

  function onPhotoSelected(f: File | null, image?: HTMLImageElement) {
    resetAll();
    if (!f || !image) return;
    const canvas = scaled(image, BASE_SIDE);
    setFile(f); setBase(canvas);
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

  async function run() {
    if (!working) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    setResultUrl(null); setMessage('');
    setState('loading');
    const selected = (Object.keys(options) as (keyof EnhancementOptions)[]).filter((k) => options[k]);
    setSteps(selected.map((id) => ({ id, label: STEP_LABELS[id], status: 'pending' })));
    let current = working;
    let failures = 0;
    const timer = window.setTimeout(() => controller.abort(), 900_000);
    const setStep = (id: keyof EnhancementOptions, status: StepStatus) => setSteps((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    const download = (l: number, t: number) => setProgress({ label: 'Preparing the enhancement model…', value: t ? l / t : null });
    const busyLabel = (label: string) => setProgress({ label, value: null });

    try {
      if (options.colorize) {
        setStep('colorize', 'running');
        try {
          const { loadColorizer, colorize } = await import('../../lib/enhance/colorize');
          const model = await loadColorizer(download, busyLabel);
          busyLabel('Adding colors…');
          const result = await colorize(current, model, signal);
          current = result.canvasAtIntensity(COLOR_INTENSITY);
          setStep('colorize', 'done');
        } catch (err) {
          if (signal.aborted) throw err;
          failures++; setStep('colorize', 'failed');
        }
      }

      if (options.deblur) {
        setStep('deblur', 'running');
        try {
          const { loadModel, deblur } = await import('../../lib/enhance/deblur');
          const info = await loadModel(download, busyLabel);
          const size = fitWithin(current.width, current.height, info.backend === 'webgpu' ? 2048 : 1024);
          const input = size.width === current.width ? current : scaled(current, Math.max(size.width, size.height));
          const total = tileCount(input.width, input.height);
          current = await deblur(input, (p) => setProgress({ label: 'Removing blur…', value: p.done / total }), signal);
          setStep('deblur', 'done');
        } catch (err) {
          if (signal.aborted) throw err;
          failures++; setStep('deblur', 'failed');
        }
      }

      if (options.background) {
        setStep('background', 'running');
        try {
          const { loadRestorer, restore } = await import('../../lib/enhance/restore');
          const model = await loadRestorer(download, busyLabel);
          const cap = model.backend === 'webgpu' ? 1600 : 640;
          const input = Math.max(current.width, current.height) > cap ? scaled(current, cap) : current;
          current = await restore(input, model, { outputScale: 1, strength: DETAIL_STRENGTH }, (done, total) => setProgress({ label: 'Enhancing details…', value: done / total }), signal);
          setStep('background', 'done');
        } catch (err) {
          if (signal.aborted) throw err;
          failures++; setStep('background', 'failed');
        }
      }

      if (current === working) {
        setState('error'); setMessage('The enhancement could not be completed in this browser. Try a different option or a smaller photo.');
      } else {
        setResultUrl(track(await canvasBlob(current)));
        setState('success');
        setMessage(failures ? 'Some enhancements were unavailable in this browser and were skipped.' : '');
      }
    } catch (err) {
      setState('error');
      setMessage(signal.aborted ? 'Enhancement was cancelled or took too long.' : (err as Error).message);
    } finally {
      window.clearTimeout(timer);
      setProgress(null);
    }
  }

  const outName = file ? `enhanced-${file.name.replace(/\.[^.]+$/, '')}.png` : 'enhanced.png';
  const cropArea = quad && base ? polygonArea(quad) / (base.width * base.height) : 1;
  const fullQuad = quad && base && quad.every((p, i) => Math.abs(p.x - (i === 1 || i === 2 ? base.width : 0)) < 1 && Math.abs(p.y - (i >= 2 ? base.height : 0)) < 1);
  const anySelected = options.colorize || options.deblur || options.background;
  const stage = !base ? 1 : cropState === 'pending' ? 2 : state === 'loading' ? 4 : resultUrl ? 5 : 3;
  const STAGES = ['Upload', 'Crop', 'Enhance', 'Download'];
  const activeStage = stage === 1 ? 0 : stage === 2 ? 1 : stage === 3 || stage === 4 ? 2 : 3;
  const toggle = (key: keyof EnhancementOptions) => setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  const focusHandle = () => { setCropNote('Drag any of the four corners onto the corners of the photograph.'); document.querySelector<HTMLElement>('.pj-handle')?.focus(); };

  return (
    <div className="pj-demo pe-app">
      <ol className="pe-steps" aria-label="Progress">
        {STAGES.map((label, i) => <li key={label} className={i === activeStage ? 'pe-step pe-step-active' : i < activeStage ? 'pe-step pe-step-done' : 'pe-step'} aria-current={i === activeStage ? 'step' : undefined}><span>{i + 1}</span>{label}</li>)}
      </ol>

      <PhotoUpload photoName={file?.name} disabled={busy} onPhotoSelected={onPhotoSelected} />

      {base && quad && cropState === 'pending' && (
        <section className="pe-panel" aria-label="Crop photo">
          <h3>Crop your photo</h3>
          <CornerCropper base={base} quad={quad} disabled={busy} onChange={setQuad} />
          {cropNote && <p className="pe-hint" role="status" data-testid="crop-note">{cropNote}</p>}
          {autoQuads?.print && autoQuads.photo && (
            <label className="pe-check"><input type="checkbox" checked={includeBorder} onChange={(e) => toggleBorder(e.target.checked)} /> Include the paper border around the picture</label>
          )}
          {cropArea < 0.25 && !fullQuad && <p className="pj-warn" role="alert">This crop covers only {Math.round(cropArea * 100)}% of the image — make sure no faces are cut off.</p>}
          <div className="pe-actions">
            <button type="button" className="pj-btn" onClick={() => base && runAutoDetect(base)}>Auto Crop</button>
            <button type="button" className="pj-btn" onClick={focusHandle}>Adjust Crop</button>
            <button type="button" className="pj-btn pj-btn-primary" onClick={applyCrop}>Apply Crop</button>
            <button type="button" className="pj-btn" onClick={skipCrop}>Skip Crop</button>
          </div>
        </section>
      )}

      {working && !resultUrl && state !== 'loading' && (
        <section className="pe-panel" aria-label="Choose enhancements">
          <div className="pe-cropped">
            {workingUrl && <img src={workingUrl} alt="Cropped photograph" />}
            <div>
              <h3>Choose enhancements</h3>
              <p className="pe-hint">{cropState === 'applied' ? 'Crop applied.' : 'Using the whole image.'} <button type="button" className="pj-link" onClick={editCrop}>Edit Crop</button></p>
            </div>
          </div>
          <div className="enhancement-options">
            {OPTION_CARDS.map((c) => (
              <label key={c.key} className={options[c.key] ? 'enhancement-card enhancement-card-on' : 'enhancement-card'}>
                <input type="checkbox" checked={options[c.key]} onChange={() => toggle(c.key)} />
                <span><strong>{c.title}</strong><small>{c.text}</small></span>
              </label>
            ))}
          </div>
          <p className="pe-hint">Colors are an AI estimate, not the photo's true original colors. Enhancement can add plausible detail that was not in the original.</p>
          <div className="pe-actions">
            <button type="button" className="pj-btn pj-btn-primary" disabled={!anySelected} onClick={() => void run()}>Enhance Photo</button>
          </div>
          {state === 'error' && <p className="pj-msg pj-msg-error" role="alert">{message}</p>}
        </section>
      )}

      {state === 'loading' && (
        <section className="pe-panel pe-processing" aria-label="Enhancing" aria-live="polite">
          <div className="pe-spinner" aria-hidden="true" />
          <h3>Enhancing your photograph...</h3>
          {progress && <p className="pe-hint">{progress.label}</p>}
          {progress && <progress max={1} value={progress.value ?? undefined} />}
          <ul className="pe-todo">
            {steps.map((x) => <li key={x.id} className={`pe-todo-${x.status}`}>{x.label}{x.status === 'done' ? ' ✓' : x.status === 'failed' ? ' — unavailable' : ''}</li>)}
          </ul>
          <button type="button" className="pj-btn" onClick={() => abortRef.current?.abort()}>Cancel</button>
        </section>
      )}

      {workingUrl && resultUrl && (
        <section className="pe-panel pe-result" aria-label="Result" data-testid="enhanced-image" data-url={resultUrl}>
          <h3>Your Enhanced Photo</h3>
          <ImageComparisonSlider before={workingUrl} after={resultUrl} beforeLabel="Original" afterLabel="Enhanced" />
          {message && <p className="pe-hint" role="status">{message}</p>}
          <div className="pe-actions">
            <a className="pj-btn pj-btn-primary" href={resultUrl} download={outName}>Download Enhanced Photo</a>
            <button type="button" className="pj-btn" onClick={() => { setResultUrl(null); setSteps([]); setState('idle'); setMessage(''); }}>Edit Enhancements</button>
            <button type="button" className="pj-btn" onClick={editCrop}>Edit Crop</button>
            <button type="button" className="pj-btn" onClick={resetAll}>Try Another Photo</button>
          </div>
        </section>
      )}
    </div>
  );
}
