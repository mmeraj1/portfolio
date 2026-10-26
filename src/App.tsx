import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SiteFooter, SiteHeader } from './components/SiteChrome';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './components/projects/ProjectsPage';
import ResearchShowcase from './components/research/ResearchShowcase';
import ProjectDetail from './components/projects/ProjectDetail';
import encryptedResearch from './research-content.enc.json';

type ResearchDetails = {
  university: string;
  heading: string;
  topic: string;
  focus: string;
  areas: string[];
};

type ResearchPayload = {
  details: ResearchDetails;
  key: CryptoKey;
};

const racPresentations = [
  { title: 'RAC presentation 1', file: 'Mohammad_Meraj_RAC1.pptx.enc', downloadName: 'Mohammad Meraj_RAC1.pptx', iv: 'kGjpUd+XgT7a+sz1', previewFile: 'Mohammad_Meraj_RAC1.pdf.enc', previewIv: 'Gmjyj4jWfj1cXMRs' },
  { title: 'RAC presentation 2', file: 'Mohammad_Meraj_RAC_2.pptx.enc', downloadName: 'Mohammad Meraj_RAC_2.pptx', iv: 'P7va9k1EaGkcicKo', previewFile: 'Mohammad_Meraj_RAC_2.pdf.enc', previewIv: 'Auwp7e5QbhsRWzTx' },
];

function decodeBase64(value: string): ArrayBuffer {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes.buffer;
}

async function decryptResearch(passphrase: string): Promise<ResearchPayload> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: decodeBase64(encryptedResearch.salt),
      iterations: encryptedResearch.iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const ciphertext = new Uint8Array(decodeBase64(encryptedResearch.ciphertext));
  const tag = new Uint8Array(decodeBase64(encryptedResearch.tag));
  const authenticatedCiphertext = new Uint8Array(ciphertext.length + tag.length);
  authenticatedCiphertext.set(ciphertext);
  authenticatedCiphertext.set(tag, ciphertext.length);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(encryptedResearch.iv), tagLength: 128 },
    key,
    authenticatedCiphertext.buffer,
  );
  return { details: JSON.parse(new TextDecoder().decode(plaintext)) as ResearchDetails, key };
}

async function decryptRacAsset(file: string, iv: string, key: CryptoKey): Promise<ArrayBuffer> {
  const response = await fetch(`${import.meta.env.BASE_URL}rac/${file}`);
  if (!response.ok) throw new Error('Presentation download failed');
  const ciphertext = await response.arrayBuffer();
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodeBase64(iv), tagLength: 128 },
    key,
    ciphertext,
  );
}

async function downloadRacPresentation(presentation: (typeof racPresentations)[number], key: CryptoKey): Promise<void> {
  const plaintext = await decryptRacAsset(presentation.file, presentation.iv, key);
  const file = new Blob([plaintext], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = presentation.downloadName;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

function RacPdfPreview({ data }: { data: ArrayBuffer }) {
  const [pages, setPages] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let destroyLoadingTask: (() => void) | null = null;

    async function renderPages() {
      try {
        const [pdfjs, worker] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true });
        destroyLoadingTask = () => { void loadingTask.destroy(); };
        const pdf = await loadingTask.promise;
        const renderedPages: string[] = [];
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const originalViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.25, 920 / originalViewport.width);
          const viewport = page.getViewport({ scale: scale * pixelRatio });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Unable to render slide preview');

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          renderedPages.push(canvas.toDataURL('image/jpeg', 0.88));
          canvas.width = 0;
          canvas.height = 0;
        }

        if (!cancelled) setPages(renderedPages);
      } catch {
        if (!cancelled) setHasError(true);
      }
    }

    void renderPages();
    return () => {
      cancelled = true;
      destroyLoadingTask?.();
    };
  }, [data]);

  if (hasError) return <p className="rac-preview-error" role="alert">The slides could not be rendered. Please use the download button instead.</p>;
  if (pages.length === 0) return <p className="rac-preview-loading" role="status">Preparing slide preview…</p>;

  return <div className="rac-pdf-pages">{pages.map((src, index) => <figure className="rac-pdf-page" key={index}><img alt={`Slide ${index + 1}`} src={src} /><figcaption>SLIDE {String(index + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</figcaption></figure>)}</div>;
}

function ArrowIcon() {
  return <span aria-hidden="true" className="arrow-icon">→</span>;
}

function ResearchGate() {
  const [passphrase, setPassphrase] = useState('');
  const [details, setDetails] = useState<ResearchDetails | null>(null);
  const [researchKey, setResearchKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);
  const [preview, setPreview] = useState<{ title: string; data: ArrayBuffer } | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setIsUnlocking(true);
    try {
      const unlocked = await decryptResearch(passphrase);
      setDetails(unlocked.details);
      setResearchKey(unlocked.key);
      setPassphrase('');
    } catch {
      setError(true);
    } finally {
      setIsUnlocking(false);
    }
  }

  if (!details) {
    return (
      <section className="research section-wrap section-pad" id="research">
        <div className="section-kicker"><span>Private research</span><span>Access restricted</span></div>
        <div className="research-layout research-locked-layout">
          <div className="research-intro">
            <p className="research-overline">PRIVATE RESEARCH</p>
            <h2>Detailed research is<br /><span>access restricted.</span></h2>
            <p>The detailed overview, experiment results and presentations are protected. Enter the access code to continue.</p>
          </div>
          <article className="research-card research-lock-card">
            <div className="research-card-top"><span className="mono">ACCESS REQUIRED</span><span className="research-symbol" aria-hidden="true">⌑</span></div>
            <form className="research-access-form" onSubmit={handleUnlock}>
              <label className="mono" htmlFor="research-passphrase">ACCESS CODE</label>
              <input
                autoComplete="current-password"
                id="research-passphrase"
                onChange={(event) => setPassphrase(event.target.value)}
                placeholder="Enter access code"
                required
                type="password"
                value={passphrase}
              />
              {error && <p className="research-access-error" role="alert">That code didn’t unlock the research. Please try again.</p>}
              <button className="button button-primary" disabled={isUnlocking} type="submit">
                {isUnlocking ? 'Checking…' : 'Unlock research'} <ArrowIcon />
              </button>
            </form>
            <div className="research-card-footer"><span>ENCRYPTED CONTENT</span><span>AUTHORIZED ACCESS <i>↗</i></span></div>
          </article>
        </div>
      </section>
    );
  }

  const [headingFirstLine, headingSecondLine] = details.heading.split(', ', 2);

  async function handlePresentationDownload(presentation: (typeof racPresentations)[number]) {
    if (!researchKey) return;
    setDownloading(presentation.file);
    setDownloadError(false);
    try {
      await downloadRacPresentation(presentation, researchKey);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(null);
    }
  }

  async function handlePresentationPreview(presentation: (typeof racPresentations)[number]) {
    if (!researchKey) return;
    setPreviewing(presentation.file);
    setDownloadError(false);
    try {
      const pdf = await decryptRacAsset(presentation.previewFile, presentation.previewIv, researchKey);
      setPreview({ title: presentation.title, data: pdf });
    } catch {
      setDownloadError(true);
    } finally {
      setPreviewing(null);
    }
  }

  function closePreview() {
    setPreview(null);
  }

  return (
    <section className="research section-wrap section-pad" id="research">
      <div className="section-kicker"><span>Research</span><span>PhD · {details.university}</span></div>
      <div className="research-layout">
        <div className="research-intro">
          <p className="research-overline">PHD RESEARCH</p>
          <h2>{headingFirstLine},<br /><span>{headingSecondLine}</span></h2>
          <p>{details.focus}</p>
        </div>
        <article className="research-card">
          <div className="research-card-top"><span className="mono">RESEARCH TOPIC</span><span className="research-symbol">✳</span></div>
          <h3>“{details.topic}”</h3>
          <div className="research-focus"><span className="mono">KEY AREAS</span><div className="research-tags">
            {details.areas.map((area) => <span key={area}>{area}</span>)}
          </div></div>
          <div className="research-card-footer"><span>{details.university}</span><span>DATA SCIENCE &amp; AI <i>↗</i></span></div>
        </article>
      </div>
      <section className="rac-presentations" aria-labelledby="rac-presentations-heading">
        <div className="rac-heading">
          <div>
            <p className="research-overline">RAC</p>
            <h3 id="rac-presentations-heading">Research presentations</h3>
          </div>
          <span className="mono">PRIVATE MATERIALS</span>
        </div>
        <div className="rac-presentation-list">
          {racPresentations.map((presentation, index) => (
            <article className="rac-presentation" key={presentation.file}>
              <span className="rac-number mono">0{index + 1}</span>
              <div className="rac-presentation-copy">
                <h4>{presentation.title}</h4>
                <span>PowerPoint presentation · Private slide preview</span>
              </div>
              <div className="rac-actions">
                <button className="rac-preview" disabled={previewing !== null} onClick={() => void handlePresentationPreview(presentation)} type="button">
                  {previewing === presentation.file ? 'Preparing…' : 'Preview'}
                </button>
                <button className="rac-download" disabled={downloading !== null} onClick={() => void handlePresentationDownload(presentation)} type="button">
                  {downloading === presentation.file ? 'Decrypting…' : 'Download'} <ArrowIcon />
                </button>
              </div>
            </article>
          ))}
        </div>
        {downloadError && <p className="research-access-error" role="alert">The presentation could not be decrypted or downloaded. Please unlock again and retry.</p>}
      </section>
      {preview && <div className="rac-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
        <section aria-label={`${preview.title} slide preview`} aria-modal="true" className="rac-preview-dialog" role="dialog">
          <header className="rac-preview-header"><div><span className="mono">RAC · PRIVATE PREVIEW</span><h3>{preview.title}</h3></div><button aria-label="Close preview" className="rac-preview-close" onClick={closePreview} type="button">×</button></header>
          <RacPdfPreview data={preview.data} />
        </section>
      </div>}
    </section>
  );
}

function ResearchPage() {
  return (
    <>
      <ResearchShowcase />
      <ResearchGate />
    </>
  );
}

function PortfolioPage({ page, children }: { page: string; children?: ReactNode }) {
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'not-configured'>('idle');

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT;
    if (!endpoint || endpoint.includes('REPLACE_WITH_YOUR_FORM_ID')) {
      setContactStatus('not-configured');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    formData.set('_subject', `Portfolio message from ${name}`);
    setContactStatus('sending');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) throw new Error('Form submission failed');
      setContactStatus('success');
      form.reset();
    } catch {
      setContactStatus('error');
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />

      <main className="route-page" id="main" key={page}>
        {children}
        {page === 'home' && <HomePage />}
        {page === 'about' && <AboutPage />}

        {page === 'research' && <ResearchPage />}

        {page === 'contact' && <section className="contact section-wrap section-pad" id="contact"><div className="section-kicker"><span>Contact</span></div><div className="contact-layout"><div><p className="contact-overline">HAVE A GOOD PROBLEM?</p><h2>Let’s build<br /><span>what’s next.</span></h2><p className="contact-copy">If you’re working on something meaningful in AI, data or intelligent products, I’d like to hear about it.</p><p className="contact-copy">Send me a note using the form and I’ll get back to you.</p></div><form className="contact-form" onSubmit={handleContactSubmit}>
          <div className="contact-form-row">
            <label>Name<input autoComplete="name" name="name" placeholder="Your name" required /></label>
            <label>Contact number<input autoComplete="tel" name="phone" placeholder="Your phone number" required type="tel" /></label>
          </div>
          <label>Email<input autoComplete="email" name="email" placeholder="you@example.com" required type="email" /></label>
          <label>Message<textarea name="message" placeholder="How can I help?" required rows={5} /></label>
          <button className="button button-primary contact-button" disabled={contactStatus === 'sending'} type="submit">{contactStatus === 'sending' ? 'Sending…' : 'Send message'} <ArrowIcon /></button>
          <p className={`contact-form-note contact-form-note-${contactStatus}`} aria-live="polite">
            {contactStatus === 'success' && 'Message sent. Thank you for reaching out.'}
            {contactStatus === 'error' && 'Your message could not be sent. Please try again in a moment.'}
            {contactStatus === 'not-configured' && 'The contact form is being set up. Please try again later.'}
            {contactStatus === 'idle' && 'Your message will be delivered securely without opening an email app.'}
            {contactStatus === 'sending' && 'Sending your message…'}
          </p>
        </form></div></section>}
      </main>

      <SiteFooter />
    </>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) { target.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<PortfolioPage page="home" />} />
        <Route path="/about" element={<PortfolioPage page="about" />} />
        <Route path="/expertise" element={<Navigate to="/about#expertise" replace />} />
        <Route path="/experience" element={<Navigate to="/about#experience" replace />} />
        <Route path="/work" element={<Navigate to="/projects#professional-work" replace />} />
        <Route path="/projects" element={<PortfolioPage page="projects"><ProjectsPage /></PortfolioPage>} />
        <Route path="/projects/:slug" element={<PortfolioPage page="project-detail"><ProjectDetail /></PortfolioPage>} />
        <Route path="/research" element={<PortfolioPage page="research" />} />
        <Route path="/contact" element={<PortfolioPage page="contact" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
