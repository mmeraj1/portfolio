import { Link } from 'react-router-dom';
import type { Project } from '../../data/projects';

export function StatusBadge({ status }: { status: Project['status'] }) {
  return <span className={`pj-status pj-status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="pj-card">
      <Link className="pj-thumb" to={`/projects/${project.slug}`} tabIndex={-1} aria-hidden="true">
        {project.image
          ? <img src={`${import.meta.env.BASE_URL}${project.image}`} alt="" loading="lazy" />
          : <span className="pj-thumb-placeholder">{project.categories[0]}</span>}
      </Link>
      <div className="pj-body">
        <div className="pj-meta">
          <span className="pj-category">{project.categories.join(' · ')}</span>
          <StatusBadge status={project.status} />
        </div>
        <h3><Link to={`/projects/${project.slug}`}>{project.title}</Link></h3>
        <p className="pj-desc">{project.description}</p>
        {project.technologies.length > 0 && <ul className="tag-list" aria-label="Technology stack">{project.technologies.map((t) => <li key={t}>{t}</li>)}</ul>}
        <div className="pj-actions">
          <Link className="button button-small button-primary" to={`/projects/${project.slug}`}>View details<span className="visually-hidden"> of {project.title}</span></Link>
          {project.githubUrl && <a className="button button-small button-quiet" href={project.githubUrl} target="_blank" rel="noreferrer">GitHub<span className="visually-hidden"> repository for {project.title} (opens in a new tab)</span></a>}
          {project.demoUrl && <a className="button button-small button-quiet" href={project.demoUrl} target="_blank" rel="noreferrer">Live demo<span className="visually-hidden"> of {project.title} (opens in a new tab)</span></a>}
        </div>
      </div>
    </article>
  );
}
