import { Link, useParams } from 'react-router-dom';
import { getProjectBySlug } from '../../data/projects';
import { StatusBadge } from './ProjectCard';
import EnhancementDemo from './EnhancementDemo';

const List = ({ items }: { items: string[] }) => <ul className="pj-list">{items.map((i) => <li key={i}>{i}</li>)}</ul>;

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) {
    return <section className="pj-page section-wrap section-pad"><h1 className="pj-title">Project not found</h1><p className="pj-subtitle">This project does not exist.</p><Link className="pj-btn pj-btn-primary" to="/projects">← All projects</Link></section>;
  }
  const { details } = project;

  return (
    <section className="pj-page section-wrap section-pad">
      <Link className="pj-back" to="/projects">← All projects</Link>
      <p className="section-kicker">{project.categories.join(' / ').toUpperCase()}</p>
      <h1 className="pj-title">{project.title}</h1>
      <div className="pj-meta-row"><StatusBadge status={project.status} />
        {project.githubUrl && <a className="pj-btn" href={project.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
        {project.demoUrl && <a className="pj-btn" href={project.demoUrl} target="_blank" rel="noreferrer">Live Demo ↗</a>}
      </div>

      <div className="pj-sections">
        <section><h2>Overview</h2><p>{project.description}</p></section>
        {details && <section><h2>Problem Statement</h2><p>{details.problem}</p></section>}
        {details && <section><h2>Proposed Solution</h2><p>{details.solution}</p></section>}
        {project.technologies.length > 0 && <section><h2>Technology Stack</h2><ul className="pj-tech">{project.technologies.map((t) => <li key={t}>{t}</li>)}</ul></section>}
        {project.features.length > 0 && <section><h2>{project.status === 'Completed' ? 'Features' : 'Planned Features'}</h2><List items={project.features} /></section>}
        {details && <section><h2>Architecture</h2><List items={details.architecture} /></section>}
        {!project.githubUrl && <section><h2>Repository</h2><p>The GitHub repository will be linked here once it is published.</p></section>}
        {project.slug === 'ai-image-enhancement'
          ? <section><h2>Live Demo</h2><EnhancementDemo /></section>
          : !project.demoUrl && <section><h2>Live Demo</h2><p>No demo is available yet. This project is marked “{project.status}”.</p></section>}
        {details && <section><h2>Future Improvements</h2><List items={details.futureImprovements} /></section>}
      </div>
    </section>
  );
}
