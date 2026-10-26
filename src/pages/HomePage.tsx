import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import NeuralNetworkCanvas from '../components/NeuralNetworkCanvas';
import { StatusBadge } from '../components/projects/ProjectCard';
import { professionalWork } from '../data/profile';
import { getProjectBySlug } from '../data/projects';

export default function HomePage() {
  const enhancement = getProjectBySlug('ai-image-enhancement');
  const enterprise = professionalWork.slice(0, 2);

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-inner section-wrap">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-cyan">Generative AI · Machine learning · Computer vision</p>
            <h1 id="hero-heading">Building intelligent solutions for real-world challenges.</h1>
            <p className="hero-intro">
              I design and ship enterprise AI systems, and pursue applied computer vision research as a PhD candidate.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/projects">Explore Projects</Link>
              <Link className="button button-secondary" to="/contact">Get in Touch</Link>
            </div>
          </div>
          <div className="hero-visual"><NeuralNetworkCanvas /></div>
        </div>
      </section>

      <section className="home-section section-wrap" aria-labelledby="featured-heading">
        <Reveal as="header" className="home-head home-head-row">
          <div>
            <p className="eyebrow eyebrow-cyan">Featured projects</p>
            <h2 id="featured-heading">Practical AI, built to be used</h2>
          </div>
          <Link className="text-link" to="/projects">All projects →</Link>
        </Reveal>
        <div className="fp-grid">
          {enhancement && (
            <Reveal as="article" className="fp-card" index={0}>
              <div className="fp-meta"><span className="pw-label">Personal project</span><StatusBadge status={enhancement.status} /></div>
              <h3><Link to={`/projects/${enhancement.slug}`}>{enhancement.title}</Link></h3>
              <p>{enhancement.description}</p>
              <ul className="tag-list" aria-label="Technology stack">{enhancement.technologies.map((t) => <li key={t}>{t}</li>)}</ul>
            </Reveal>
          )}
          {enterprise.map((item, index) => (
            <Reveal as="article" className="fp-card" key={item.number} index={index + 1}>
              <div className="fp-meta"><span className="pw-label">Professional work</span></div>
              <h3><Link to="/projects#professional-work">{item.title}</Link></h3>
              <p>{item.description}</p>
              <ul className="tag-list" aria-label="Technology stack">{item.stack.map((t) => <li key={t}>{t}</li>)}</ul>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section section-wrap" aria-labelledby="research-heading">
        <Reveal className="highlight">
          <div>
            <p className="eyebrow eyebrow-cyan">Research</p>
            <h2 id="research-heading">Robust computer vision in adverse conditions</h2>
            <p className="highlight-text">Doctoral research on object detection for driving scenes in fog and low light.</p>
          </div>
          <Link className="button button-secondary" to="/research">Explore research</Link>
        </Reveal>
      </section>

      <section className="home-section section-wrap" aria-labelledby="cta-heading">
        <Reveal className="cta-band">
          <h2 id="cta-heading">Working on something meaningful in AI?</h2>
          <p>I’d like to hear about it.</p>
          <Link className="button button-primary" to="/contact">Get in Touch</Link>
        </Reveal>
      </section>
    </>
  );
}
