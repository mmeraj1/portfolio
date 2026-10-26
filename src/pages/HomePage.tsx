import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import WaveBackground from '../components/WaveBackground';
import ProjectCard from '../components/projects/ProjectCard';
import { projects } from '../data/projects';
import { currentStudy, roles } from '../data/profile';

const resumeUrl = `${import.meta.env.BASE_URL}Mohammad_Meraj_Resume.pdf`;

const expertise = [
  { title: 'Generative AI', text: 'Agentic workflows, multi-agent systems and retrieval-augmented generation for enterprise use.' },
  { title: 'Machine learning & data science', text: 'Predictive modelling, customer segmentation, NLP and anomaly detection.' },
  { title: 'Computer vision', text: 'Applied computer vision, including image enhancement and robust object detection.' },
  { title: 'Research & applied AI', text: 'PhD research alongside hands-on engineering, from first question to production.' },
];

const featuredSlugs = ['ai-image-enhancement', 'road-image-dehazing', 'domain-adaptation-object-detection'];
const titleCase = (value: string) => value.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export default function HomePage() {
  const featured = featuredSlugs.flatMap((slug) => projects.filter((project) => project.slug === slug));
  const recentRoles = roles.slice(0, 3);

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <WaveBackground />
        <div className="hero-inner section-wrap">
          <p className="hero-role">Senior Generative AI Engineer <span aria-hidden="true">|</span><span className="visually-hidden">,</span> Lead Data Scientist</p>
          <h1 id="hero-heading">Building AI solutions for real-world impact.</h1>
          <p className="hero-intro">
            Over 12 years across analytics, data science and AI. I build production-ready enterprise systems — agentic workflows, retrieval-augmented generation and machine learning — and pursue computer vision research as a PhD candidate.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/projects">View projects</Link>
            <Link className="button button-secondary" to="/contact">Get in touch</Link>
            <a className="hero-resume" href={resumeUrl} target="_blank" rel="noreferrer">Resume ↗<span className="visually-hidden"> (PDF, opens in a new tab)</span></a>
          </div>
        </div>
      </section>

      <section className="home-section section-wrap" aria-labelledby="expertise-heading">
        <Reveal as="header" className="home-head">
          <p className="eyebrow">Core expertise</p>
          <h2 id="expertise-heading">What I bring to a team</h2>
        </Reveal>
        <ul className="expertise-grid">
          {expertise.map((item, index) => (
            <Reveal as="li" className="expertise-card" key={item.title} index={index}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="home-section section-wrap" aria-labelledby="featured-heading">
        <Reveal as="header" className="home-head home-head-row">
          <div>
            <p className="eyebrow">Featured projects</p>
            <h2 id="featured-heading">Selected personal and research work</h2>
          </div>
          <Link className="text-link" to="/projects">All projects →</Link>
        </Reveal>
        <div className="pj-grid">
          {featured.map((project, index) => (
            <Reveal key={project.id} index={index} className="reveal-card"><ProjectCard project={project} /></Reveal>
          ))}
        </div>
      </section>

      <section className="home-section section-wrap" aria-labelledby="research-heading">
        <Reveal className="highlight">
          <div>
            <p className="eyebrow">Research</p>
            <h2 id="research-heading">{currentStudy.title}</h2>
            <p className="highlight-sub">{currentStudy.institution}</p>
            <p className="highlight-text">Ongoing doctoral research in computer vision and AI. The detailed overview and presentations are access-restricted.</p>
          </div>
          <Link className="button button-secondary" to="/research">Open research</Link>
        </Reveal>
      </section>

      <section className="home-section section-wrap" aria-labelledby="experience-heading">
        <Reveal as="header" className="home-head home-head-row">
          <div>
            <p className="eyebrow">Professional experience</p>
            <h2 id="experience-heading">Recent roles</h2>
          </div>
          <Link className="text-link" to="/about#experience">Full timeline →</Link>
        </Reveal>
        <ol className="summary-roles">
          {recentRoles.map((role, index) => (
            <Reveal as="li" key={`${role.company}-${role.period}`} index={index} className="summary-role">
              <p className="role-period">{titleCase(role.period)}{role.current && <span className="role-current">Current</span>}</p>
              <h3>{role.title}</h3>
              <p className="role-company">{role.company}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="home-section section-wrap" aria-labelledby="cta-heading">
        <Reveal className="cta-band">
          <h2 id="cta-heading">Working on something meaningful in AI?</h2>
          <p>I’d like to hear about it.</p>
          <Link className="button button-primary" to="/contact">Get in touch</Link>
        </Reveal>
      </section>
    </>
  );
}
