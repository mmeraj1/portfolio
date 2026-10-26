import { Link } from 'react-router-dom';
import type { Project } from '../../data/projects';

export function StatusBadge({ status }: { status: Project['status'] }) {
  return <span className={`pj-status pj-status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span>;
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="pj-card">
      <div className="pj-thumb">
        {project.image
          ? <img src={`${import.meta.env.BASE_URL}${project.image}`} alt={`${project.title} preview`} loading="lazy" />
          : <div className="pj-thumb-placeholder" aria-hidden="true"><span>{project.title.split(' ').map((w) => w[0]).slice(0, 3).join('').toUpperCase()}</span></div>}
        <StatusBadge status={project.status} />
      </div>
      <div className="pj-body">
        <p className="pj-category">{project.categories.join(' / ')}</p>
        <h3>{project.title}</h3>
        <p className="pj-desc">{project.description}</p>
        {project.technologies.length > 0 && <ul className="pj-tech" aria-label="Technology stack">{project.technologies.map((t) => <li key={t}>{t}</li>)}</ul>}
        <div className="pj-actions">
          <Link className="pj-btn pj-btn-primary" to={`/projects/${project.slug}`}>View Details →</Link>
          {project.githubUrl && <a className="pj-btn" href={project.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
          {project.demoUrl && <a className="pj-btn" href={project.demoUrl} target="_blank" rel="noreferrer">Live Demo ↗</a>}
        </div>
      </div>
    </article>
  );
}
