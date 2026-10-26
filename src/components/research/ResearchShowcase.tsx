import { Link } from 'react-router-dom';
import Reveal from '../Reveal';
import { StatusBadge } from '../projects/ProjectCard';
import { currentStudy } from '../../data/profile';
import { projects } from '../../data/projects';

/** One-line approach for each research project, based only on its documented description. */
const approach: Record<string, string> = {
  'road-image-dehazing': 'Visibility restoration for foggy road scenes',
  'low-light-driving-scene-enhancement': 'Deep-learning enhancement of nighttime driving scenes',
  'lightweight-road-object-detection': 'Efficient detector for vehicles, pedestrians and other road users',
  'domain-adaptation-object-detection': 'Source-only versus domain-adaptive detection, clear to foggy',
};

const researchOrder = Object.keys(approach);

const comparisonFigures = [
  'Original image',
  'Foggy image',
  'Dehazed image',
  'Detection: source-only',
  'Detection: domain-adapted',
];

const experimentFacts: [string, string][] = [
  ['Source domain', 'Clear-weather driving scenes'],
  ['Target domain', 'Foggy driving scenes'],
  ['Comparison', 'Source-only versus domain-adaptive object detection'],
  ['Dataset', 'Not yet published'],
  ['Detection architecture', 'Not yet published'],
  ['Adaptation method', 'Not yet published'],
  ['Evaluation metrics', 'Not yet published'],
  ['Status', 'Research in progress'],
  ['Results', 'Pending'],
];

function SectionHead({ id, label, title, intro }: { id: string; label: string; title: string; intro?: string }) {
  return (
    <Reveal as="header" className="rs-head">
      <p className="eyebrow eyebrow-cyan">{label}</p>
      <h2 id={id}>{title}</h2>
      {intro && <p>{intro}</p>}
    </Reveal>
  );
}

export default function ResearchShowcase() {
  const items = researchOrder.flatMap((slug) => projects.filter((p) => p.slug === slug && p.area === 'research'));

  return (
    <div className="section-wrap rs">
      <header className="rs-hero">
        <p className="eyebrow eyebrow-cyan">Research · {currentStudy.title}, {currentStudy.institution}</p>
        <h1>Domain Adaptation for Robust Object Detection in Adverse Driving Conditions.</h1>
        <p className="page-lead">
          Making object detectors that learn from clear-weather driving data stay reliable in fog and low light — a prerequisite for dependable perception systems.
        </p>
      </header>

      <section className="rs-section" aria-labelledby="rs-projects">
        <SectionHead id="rs-projects" label="Featured research" title="Research projects" intro="Each project is marked with its actual status. No results are shown until they exist." />
        <div className="rs-grid">
          {items.map((project, index) => (
            <Reveal as="article" className="rs-card" key={project.id} index={index % 2}>
              <Link className="rs-visual" to={`/projects/${project.slug}`} tabIndex={-1} aria-hidden="true">
                {project.image
                  ? <img src={`${import.meta.env.BASE_URL}${project.image}`} alt="" loading="lazy" />
                  : <span>Visualization pending</span>}
              </Link>
              <div className="rs-card-body">
                <div className="pj-meta"><span className="pj-category">{project.categories.join(' · ')}</span><StatusBadge status={project.status} /></div>
                <h3><Link to={`/projects/${project.slug}`}>{project.title}</Link></h3>
                <p className="pj-desc">{project.description}</p>
                <p className="rs-approach"><span>Approach</span>{approach[project.slug]}</p>
                <Link className="button button-small button-primary" to={`/projects/${project.slug}`}>View details<span className="visually-hidden"> of {project.title}</span></Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="rs-section" aria-labelledby="rs-compare">
        <SectionHead id="rs-compare" label="Visual comparisons" title="Experimental outputs" intro="Original, foggy and dehazed images, and source-only versus adapted detections, will be published here once real outputs are available." />
        <ul className="rs-figures">
          {comparisonFigures.map((caption) => (
            <Reveal as="li" className="rs-figure" key={caption}>
              <div className="rs-figure-box"><span>Results pending</span></div>
              <p>{caption}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="rs-section rs-split" aria-labelledby="rs-experiment">
        <div>
          <SectionHead id="rs-experiment" label="Experiments" title="Experimental setup" intro="Only documented details are listed. Anything else is marked as not yet published." />
          <dl className="rs-facts">
            {experimentFacts.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>
        <div>
          <SectionHead id="rs-publications" label="Publications" title="Publications & presentations" />
          <p className="rs-note">No publications are listed yet. Research presentations are available below to authorised readers.</p>
        </div>
      </section>
    </div>
  );
}
