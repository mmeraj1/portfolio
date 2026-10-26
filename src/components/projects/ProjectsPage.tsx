import { useMemo, useState } from 'react';
import { professionalWork } from '../../data/profile';
import { projects } from '../../data/projects';
import ProjectCard from './ProjectCard';
import ProjectFilter, { type ProjectFilterValue } from './ProjectFilter';

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectFilterValue>('All Projects');
  const visible = useMemo(() => filter === 'All Projects' ? projects : projects.filter((p) => p.categories.includes(filter)), [filter]);

  return (
    <div className="section-wrap page">
      <header className="page-header">
        <p className="eyebrow">Projects</p>
        <h1 className="page-title">AI &amp; Research Projects</h1>
        <p className="page-lead">Building practical AI applications and advancing robust computer vision.</p>
      </header>

      <section className="pj-section" id="professional-work" aria-labelledby="professional-work-heading">
        <header className="pj-section-head">
          <h2 id="professional-work-heading">Professional work</h2>
          <p>Industry solutions delivered for clients and employers.</p>
        </header>
        <div className="pw-grid">
          {professionalWork.map((item) => (
            <article className="pw-card" key={item.number}>
              <p className="pw-label">{item.label}</p>
              <h3>{item.title}</h3>
              <p className="pw-desc">{item.description}</p>
              {item.outcome && <p className="pw-outcome"><span>Outcome</span>{item.outcome}</p>}
              <ul className="tag-list" aria-label="Technologies used">{item.stack.map((tech) => <li key={tech}>{tech}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="pj-section" id="personal-research" aria-labelledby="personal-research-heading">
        <header className="pj-section-head">
          <h2 id="personal-research-heading">Personal &amp; research projects</h2>
          <p>Independent applications and research experiments. Each project will have its own repository.</p>
        </header>
        <ProjectFilter value={filter} onChange={setFilter} />
        {visible.length > 0
          ? <div className="pj-grid">{visible.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
          : <p className="pj-empty" role="status">No projects in this category yet.</p>}
      </section>
    </div>
  );
}
