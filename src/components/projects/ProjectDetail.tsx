import { Link, useParams } from 'react-router-dom';
import { getProjectBySlug } from '../../data/projects';
import { StatusBadge } from './ProjectCard';
import EnhancementDemo from './EnhancementDemo';

const List = ({ items }: { items: string[] }) => <ul className="pj-list">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) {
    return (
      <div className="section-wrap page">
        <header className="page-header"><p className="eyebrow">Projects</p><h1 className="page-title">Project not found</h1><p className="page-lead">This project does not exist.</p></header>
        <Link className="button button-primary" to="/projects">All projects</Link>
      </div>
    );
  }
  const { details } = project;

  return (
    <div className="section-wrap page">
      <Link className="back-link" to="/projects#personal-research">← All projects</Link>
      <header className="page-header">
        <p className="eyebrow">{project.categories.join(' · ')}</p>
        <h1 className="page-title">{project.title}</h1>
        <p className="page-lead">{project.description}</p>
      </header>

      <div className="pj-detail">
        <div className="pj-detail-main">
          {details && <section><h2>Problem statement</h2><p>{details.problem}</p></section>}
          {details && <section><h2>Proposed solution</h2><p>{details.solution}</p></section>}
          {project.features.length > 0 && <section><h2>{project.status === 'Completed' ? 'Features' : 'Planned features'}</h2><List items={project.features} /></section>}
          {details && <section><h2>Architecture</h2><List items={details.architecture} /></section>}
          <section id="demo">
            <h2>Live demo</h2>
            {project.slug === 'ai-image-enhancement'
              ? <EnhancementDemo />
              : !project.demoUrl && <p>No demo is available yet. This project is marked “{project.status}”.</p>}
          </section>
          {details && <section><h2>Future improvements</h2><List items={details.futureImprovements} /></section>}
        </div>

        <aside className="pj-detail-aside" aria-label="Project summary">
          <dl>
            <div><dt>Status</dt><dd><StatusBadge status={project.status} /></dd></div>
            <div><dt>Category</dt><dd>{project.categories.join(', ')}</dd></div>
            {project.technologies.length > 0 && <div><dt>Technology stack</dt><dd><ul className="tag-list">{project.technologies.map((t) => <li key={t}>{t}</li>)}</ul></dd></div>}
            <div><dt>Repository</dt><dd>{project.githubUrl ? <a className="text-link" href={project.githubUrl} target="_blank" rel="noreferrer">GitHub repository ↗</a> : 'To be published'}</dd></div>
            {project.demoUrl && <div><dt>Live demo</dt><dd><a className="text-link" href={project.demoUrl} target="_blank" rel="noreferrer">Open demo ↗</a></dd></div>}
          </dl>
        </aside>
      </div>
    </div>
  );
}
