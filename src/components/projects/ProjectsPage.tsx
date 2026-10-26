import { useMemo, useState } from 'react';
import { projects } from '../../data/projects';
import ProjectCard from './ProjectCard';
import ProjectFilter, { type ProjectFilterValue } from './ProjectFilter';

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectFilterValue>('All Projects');
  const visible = useMemo(() => filter === 'All Projects' ? projects : projects.filter((p) => p.categories.includes(filter)), [filter]);

  return (
    <section className="pj-page section-wrap section-pad">
      <p className="section-kicker">PROJECTS</p>
      <h1 className="pj-title">AI &amp; Research Projects</h1>
      <p className="pj-subtitle">Building practical AI applications and advancing robust computer vision.</p>
      <ProjectFilter value={filter} onChange={setFilter} />
      {visible.length > 0
        ? <div className="pj-grid">{visible.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
        : <p className="pj-empty" role="status">No projects in this category yet. Check back soon.</p>}
    </section>
  );
}
