import { Link } from 'react-router-dom';
import { currentStudy, roles } from '../data/profile';

const focusAreas = ['Agentic AI', 'Retrieval-augmented generation', 'Machine learning', 'Computer vision research'];

const sections = [
  { to: '/about', title: 'About', text: 'Background, technical expertise, career timeline and education.' },
  { to: '/projects', title: 'Projects', text: 'Professional case studies alongside personal and research projects.' },
  { to: '/research', title: 'Research', text: 'PhD research overview and presentations. Access is restricted.' },
];

export default function HomePage() {
  const current = roles.find((role) => role.current);

  return (
    <>
      <section className="hero section-wrap">
        <div className="hero-copy">
          <p className="eyebrow">Bangalore, India</p>
          <h1>Generative AI Engineer and Lead Data Scientist.</h1>
          <p className="hero-intro">
            I’m Mohammad Meraj. With over 12 years across analytics, data science and AI, I build production-ready systems — agentic workflows, retrieval-augmented generation and machine learning — and I’m pursuing a PhD in Data Science &amp; AI.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/projects">View projects</Link>
            <Link className="button button-quiet" to="/contact">Get in touch</Link>
          </div>
        </div>

        <aside className="glance" aria-label="Profile summary">
          <dl>
            {current && <div><dt>Current role</dt><dd>{current.title}<span>{current.company}</span></dd></div>}
            <div><dt>Focus</dt><dd><ul>{focusAreas.map((area) => <li key={area}>{area}</li>)}</ul></dd></div>
            <div><dt>Research</dt><dd>{currentStudy.title}<span>{currentStudy.institution}</span></dd></div>
            <div><dt>Experience</dt><dd>12+ years<span>BFSI, insurance and cybersecurity</span></dd></div>
          </dl>
        </aside>
      </section>

      <section className="section-wrap explore" aria-labelledby="explore-heading">
        <h2 id="explore-heading" className="eyebrow">Explore</h2>
        <div className="explore-grid">
          {sections.map((item) => (
            <Link className="explore-card" key={item.to} to={item.to}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="card-link" aria-hidden="true">View →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
