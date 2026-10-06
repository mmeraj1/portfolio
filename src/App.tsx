import { useState, type FormEvent } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import encryptedResearch from './research-content.enc.json';

type ResearchDetails = {
  university: string;
  heading: string;
  topic: string;
  focus: string;
  areas: string[];
};

function decodeBase64(value: string): ArrayBuffer {
  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes.buffer;
}

async function decryptResearch(passphrase: string): Promise<ResearchDetails> {
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
  return JSON.parse(new TextDecoder().decode(plaintext)) as ResearchDetails;
}

const navigation = [
  ['Home', '/'],
  ['About', '/about'],
  ['Expertise', '/expertise'],
  ['Work', '/work'],
  ['Experience', '/experience'],
  ['Research', '/research'],
  ['Contact', '/contact'],
];

const projects = [
  {
    number: '01',
    label: 'MULTI-AGENT SYSTEMS · PRODUCT ENGINEERING',
    title: 'Requirements to Jira, thoughtfully automated.',
    description:
      'A human-in-the-loop agent platform that turns product requirement documents into reviewable, traceable Epics and Stories—then connects the approved work to Jira.',
    stack: ['LangGraph', 'LangChain', 'FastAPI', 'Pinecone', 'Jira API'],
    mark: 'PRD → Jira',
    accent: 'lime',
  },
  {
    number: '02',
    label: 'RETRIEVAL-AUGMENTED GENERATION · FINTECH',
    title: 'A better way to ask questions of market data.',
    description:
      'An agentic RAG application that combines Text-to-SQL over PostgreSQL with semantic retrieval, bringing structured and unstructured stock context into explainable recommendations.',
    stack: ['Python', 'LangChain', 'PostgreSQL', 'ChromaDB', 'GPT-4'],
    mark: 'SQL + RAG',
    accent: 'blue',
  },
  {
    number: '03',
    label: 'GENERATIVE AI · FINANCIAL SERVICES',
    title: 'Audit answers grounded in the source.',
    description:
      'A document Q&A experience for an audit team, with retrieval-grounded answers and a secure, serverless AWS foundation built around Bedrock, S3, Lambda and IAM.',
    stack: ['RAG', 'AWS Bedrock', 'S3', 'Lambda', 'Streamlit'],
    mark: 'Ask / Verify',
    accent: 'pink',
  },
  {
    number: '04',
    label: 'MACHINE LEARNING · CUSTOMER INTELLIGENCE',
    title: 'Segmentation that moved business outcomes.',
    description:
      'Customer segments and predictive models built from payment and behavioural data to enable more relevant product targeting—contributing to a 4% sales increase.',
    stack: ['Python', 'PySpark', 'XGBoost', 'Random Forest', 'AWS'],
    mark: '+4% sales',
    accent: 'orange',
  },
];

const roles = [
  {
    period: 'APR 2025 — PRESENT',
    title: 'AI Engineer Advisor',
    company: 'NTT DATA',
    detail: 'Building production-oriented GenAI and agentic AI systems, including a multi-agent PRD-to-Jira platform and a stock recommendation assistant.',
    tags: ['Agentic AI', 'LangGraph', 'RAG', 'LLMOps'],
    current: true,
  },
  {
    period: 'MAY 2024 — MAR 2025',
    title: 'Assistant Manager 2',
    company: 'Grant Thornton (GT) Bharat',
    detail: 'Delivered document-grounded audit Q&A on AWS and a call transcription, summarisation and sentiment workflow for an insurance client.',
    tags: ['AWS Bedrock', 'RAG', 'Whisper', 'Gemma'],
  },
  {
    period: 'MAR 2021 — APR 2024',
    title: 'Senior Consultant · Lead Data Scientist',
    company: 'Capgemini',
    detail: 'Led data science delivery across Generative AI, customer segmentation and cybersecurity anomaly detection for global clients.',
    tags: ['Generative AI', 'XGBoost', 'Azure ML', 'PySpark'],
  },
  {
    period: 'SEP 2019 — MAR 2021',
    title: 'Freelance Data Scientist',
    company: 'Independent',
    detail: 'Built propensity-to-pay models, customer segments and campaign insights to support more relevant customer engagement.',
    tags: ['Predictive modelling', 'Clustering', 'Decision Trees'],
  },
  {
    period: 'SEP 2013 — NOV 2017',
    title: 'Advanced Analyst',
    company: 'EY · Deutsche Bank engagement',
    detail: 'Delivered financial analysis and data-quality reporting for global operations, while leading task planning and stakeholder updates.',
    tags: ['Financial analytics', 'Reporting', 'Team leadership'],
  },
];

const skillGroups = [
  { label: 'GENERATIVE & AGENTIC AI', items: ['Agentic AI', 'Multi-agent systems', 'RAG', 'LangGraph', 'LangChain', 'CrewAI', 'MCP', 'Prompt engineering'] },
  { label: 'MACHINE LEARNING & DATA', items: ['Predictive modelling', 'NLP', 'XGBoost', 'Random Forest', 'Clustering', 'Anomaly detection', 'Computer vision', 'PySpark'] },
  { label: 'ENGINEERING & CLOUD', items: ['Python', 'FastAPI', 'AWS Bedrock', 'SageMaker', 'Azure ML', 'PostgreSQL', 'Pinecone', 'ChromaDB', 'Docker', 'GitHub Actions'] },
  { label: 'LLMOPS & DELIVERY', items: ['Langfuse', 'Grafana', 'CI/CD', 'Observability', 'Human-in-the-loop', 'Technical ownership', 'Client engagement'] },
];

function ArrowIcon() {
  return <span aria-hidden="true" className="arrow-icon">↗</span>;
}

function ResearchPage() {
  const [passphrase, setPassphrase] = useState('');
  const [details, setDetails] = useState<ResearchDetails | null>(null);
  const [error, setError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setIsUnlocking(true);
    try {
      setDetails(await decryptResearch(passphrase));
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
        <div className="section-kicker"><span>05 / RESEARCH ACCESS</span><span>RESTRICTED</span></div>
        <div className="research-layout research-locked-layout">
          <div className="research-intro">
            <p className="research-overline">PRIVATE RESEARCH</p>
            <h2>Research is<br /><span>access restricted.</span></h2>
            <p>This research overview is protected. Enter the access code to continue.</p>
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

  return (
    <section className="research section-wrap section-pad" id="research">
      <div className="section-kicker"><span>05 / RESEARCH</span><span>PHD · {details.university}</span></div>
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
    </section>
  );
}

function PortfolioPage({ page }: { page: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();
    const subject = encodeURIComponent(`Portfolio message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nContact number: ${phone}\nEmail: ${email}\n\nMessage:\n${message}`);
    const recipient = ['meet.meraj2000', 'gmail.com'].join('@');

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    setContactSubmitted(true);
  }

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Mohammad Meraj, home">
          <span className="brand-mark">MM</span>
          <span className="brand-copy"><strong>MOHAMMAD MERAJ</strong><small>Senior Generative AI Engineer | Lead Data Scientist</small></span>
        </Link>
        <button className="menu-toggle" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <nav className={menuOpen ? 'nav nav-open' : 'nav'} aria-label="Main navigation">
          {navigation.map(([label, path]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'active' : undefined} onClick={() => setMenuOpen(false)}>{label}</NavLink>
          ))}
          <a className="nav-resume" href={`${import.meta.env.BASE_URL}Mohammad_Meraj_Resume.pdf`} target="_blank" rel="noreferrer">Resume <ArrowIcon /></a>
        </nav>
      </header>

      <main className="route-page" key={page}>
        {page === 'home' && <>
          <section className="hero section-wrap" id="home">
            <div className="hero-copy">
              <div className="availability"><span className="pulse-dot" /> BANGALORE, INDIA <span className="availability-divider">/</span> BUILDING WHAT'S NEXT</div>
              <h1>Intelligence,<br /><span>put to work.</span></h1>
              <p className="hero-intro">I’m <strong>Mohammad Meraj</strong> — a Senior Generative AI Engineer and Lead Data Scientist building production-ready AI systems that solve real-world problems.</p>
              <div className="hero-actions">
                <Link className="button button-primary" to="/work">Explore my work <ArrowIcon /></Link>
                <a className="button button-quiet" href={`${import.meta.env.BASE_URL}Mohammad_Meraj_Resume.pdf`} target="_blank" rel="noreferrer">View résumé <span aria-hidden="true">↗</span></a>
              </div>
              <div className="hero-footnote"><span className="mono">12+ YEARS</span><span className="footnote-line" /><span>FROM DATA SCIENCE TO AGENTIC AI</span></div>
            </div>
            <div className="hero-art" aria-label="Abstract illustration of connected AI systems">
              <div className="art-grid" />
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="orbit-node node-one">RAG</div><div className="orbit-node node-two">ML</div><div className="orbit-node node-three">AGENT</div>
              <div className="core-card">
                <div className="core-top"><span className="live-indicator" /> SYSTEMS ONLINE <span>MM—01</span></div>
                <div className="core-symbol"><span /><span /><span /><span /><span /><span /><span /></div>
                <div className="core-caption"><span>INTELLIGENCE<br />IN MOTION</span><span className="core-arrow">↗</span></div>
              </div>
              <div className="art-index mono">FIG. 01 <span>·</span> HUMAN + MACHINE</div>
              <div className="art-coordinate mono">12°58' N<br />77°35' E</div>
            </div>
            <Link className="scroll-note mono" to="/about"><span className="scroll-line" /> SCROLL TO EXPLORE</Link>
          </section>
          <section className="signal-strip" aria-label="Areas of focus">
            <div className="signal-inner"><span>AGENTIC AI</span><i>✳</i><span>RAG SYSTEMS</span><i>✳</i><span>MACHINE LEARNING</span><i>✳</i><span>LLM ENGINEERING</span><i>✳</i><span>PRODUCTION IMPACT</span></div>
          </section>
        </>}

        {page === 'about' && <section className="about section-wrap section-pad" id="about">
          <div className="section-kicker"><span>01 / A LITTLE CONTEXT</span><span>ABOUT</span></div>
          <div className="about-grid">
            <h2>Building AI that<br /><span>earns its place.</span></h2>
            <div className="about-body"><p className="lead">Good technology isn’t a demo. It’s a dependable part of how people get meaningful work done.</p><p>Over 12 years across analytics, data science and AI, I’ve taken ideas from messy data to deployed products in BFSI, insurance and cybersecurity. Today, I focus on agentic workflows, retrieval-augmented generation and the engineering practices that make AI useful beyond a prototype.</p><p>I bring a hands-on builder’s mindset, thoughtful technical ownership and a steady focus on outcomes—working closely with teams and stakeholders from first question to production.</p><Link className="text-link" to="/contact">Let’s make something useful <ArrowIcon /></Link></div>
          </div>
          <div className="metrics-row">
            <div className="metric"><strong>12<span>+</span></strong><span>YEARS IN TECHNOLOGY</span></div>
            <div className="metric"><strong>4<span>%</span></strong><span>SALES LIFT ENABLED</span></div>
            <div className="metric"><strong>03</strong><span>CORE DISCIPLINES<br />AI · DATA · ENGINEERING</span></div>
            <div className="metric metric-note"><span className="metric-star">✳</span><span>FROM INSIGHT<br />TO IMPLEMENTATION</span></div>
          </div>
        </section>}

        {page === 'expertise' && <section className="expertise section-wrap section-pad" id="expertise">
          <div className="section-kicker"><span>02 / THE TOOLKIT</span><span>EXPERTISE</span></div>
          <div className="expertise-heading"><h2>Range is useful.<br /><span>Depth makes it matter.</span></h2><p>The right mix of models, systems and engineering discipline—selected for the problem, not the trend.</p></div>
          <div className="skill-grid">{skillGroups.map((group, index) => <article className="skill-card" key={group.label}><div className="skill-card-top"><span>0{index + 1}</span><span className="skill-spark">✳</span></div><h3>{group.label}</h3><div className="skill-tags">{group.items.map((item) => <span key={item}>{item}</span>)}</div></article>)}</div>
        </section>}

        {page === 'work' && <section className="work section-wrap section-pad" id="work">
          <div className="section-kicker"><span>03 / SELECTED WORK</span><span>BUILT FOR THE REAL WORLD</span></div>
          <div className="work-heading"><h2>Interesting problems.<br /><span>Useful outcomes.</span></h2><p>A few examples of the systems and solutions I’ve helped bring to life.</p></div>
          <div className="project-grid">{projects.map((project) => <article className={`project-card ${project.accent}`} key={project.number}><div className="project-meta"><span>{project.number} / CASE STUDY</span><span className="project-mark">{project.mark}</span></div><div className="project-art"><span className="project-art-orbit" /><span className="project-art-label">{project.number}</span><span className="project-art-text">{project.mark}</span><span className="project-art-plus">+</span></div><div className="project-content"><p className="project-label">{project.label}</p><h3>{project.title}</h3><p className="project-description">{project.description}</p><div className="project-tags">{project.stack.map((item) => <span key={item}>{item}</span>)}</div></div></article>)}</div>
        </section>}

        {page === 'experience' && <>
          <section className="journey section-wrap section-pad" id="journey">
            <div className="section-kicker"><span>04 / THE THROUGH-LINE</span><span>EXPERIENCE</span></div>
            <div className="journey-layout"><div className="journey-intro"><h2>Different domains.<br /><span>One direction.</span></h2><p>A career shaped by curiosity, collaboration and the belief that data is most powerful when it leads to action.</p><div className="journey-education"><span className="education-icon">✳</span><div><span className="mono">CURRENTLY PURSUING</span><strong>PhD · Data Science &amp; AI</strong><span>CMR University</span></div></div></div><div className="timeline">{roles.map((role) => <article className="role" key={`${role.company}-${role.period}`}><div className="role-marker"><span className={role.current ? 'marker-dot marker-active' : 'marker-dot'} /></div><div className="role-content"><div className="role-top"><span className="mono role-period">{role.period}</span>{role.current && <span className="current-label">CURRENT</span>}</div><h3>{role.title}</h3><p className="role-company">{role.company}</p><p className="role-detail">{role.detail}</p><div className="role-tags">{role.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>)}</div></div>
          </section>
          <section className="education-band section-wrap"><div className="education-band-label mono">ALSO IN THE CLASSROOM <span>↗</span></div><div className="degree"><span>2021 — 2023</span><strong>MSc, Data Science</strong><span>Chandigarh University</span></div><div className="degree"><span>2003 — 2006</span><strong>BSc</strong><span>IGNOU · Government of India</span></div><div className="degree degree-cert"><span>PROFESSIONAL DEVELOPMENT</span><strong>Azure AI Fundamentals (AI-900)</strong><span>Microsoft · MLOps Workshop, Capgemini</span></div></section>
        </>}

        {page === 'research' && <ResearchPage />}

        {page === 'contact' && <section className="contact section-wrap section-pad" id="contact"><div className="section-kicker"><span>05 / YOUR MOVE</span><span>CONTACT</span></div><div className="contact-layout"><div><p className="contact-overline">HAVE A GOOD PROBLEM?</p><h2>Let’s build<br /><span>what’s next.</span></h2><p className="contact-copy">If you’re working on something meaningful in AI, data or intelligent products, I’d like to hear about it.</p><p className="contact-copy">Send me a note using the form and I’ll get back to you.</p></div><form className="contact-form" onSubmit={handleContactSubmit}>
          <div className="contact-form-row">
            <label>Name<input autoComplete="name" name="name" placeholder="Your name" required /></label>
            <label>Contact number<input autoComplete="tel" name="phone" placeholder="Your phone number" required type="tel" /></label>
          </div>
          <label>Email<input autoComplete="email" name="email" placeholder="you@example.com" required type="email" /></label>
          <label>Message<textarea name="message" placeholder="How can I help?" required rows={5} /></label>
          <button className="button button-primary contact-button" type="submit">Send message <ArrowIcon /></button>
          <p className="contact-form-note" aria-live="polite">{contactSubmitted ? 'Your email app should open with the message ready to send.' : 'Submitting opens your email app so you can review and send your message.'}</p>
        </form></div></section>}
      </main>

      <footer className="site-footer section-wrap"><Link className="brand" to="/" aria-label="Mohammad Meraj, home"><span className="brand-mark">MM</span><span className="brand-copy"><strong>MOHAMMAD MERAJ</strong><small>Senior Generative AI Engineer | Lead Data Scientist</small></span></Link><Link className="back-top mono" to="/">BACK TO TOP ↑</Link></footer>
    </>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<PortfolioPage page="home" />} />
        <Route path="/about" element={<PortfolioPage page="about" />} />
        <Route path="/expertise" element={<PortfolioPage page="expertise" />} />
        <Route path="/work" element={<PortfolioPage page="work" />} />
        <Route path="/experience" element={<PortfolioPage page="experience" />} />
        <Route path="/research" element={<PortfolioPage page="research" />} />
        <Route path="/contact" element={<PortfolioPage page="contact" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
