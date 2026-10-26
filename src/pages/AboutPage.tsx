import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { currentStudy, education, roles, skillGroups } from '../data/profile';

function Block({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="about-block" id={id} aria-labelledby={`${id}-heading`}>
      <header className="about-block-head">
        <h2 id={`${id}-heading`}>{title}</h2>
        {intro && <p>{intro}</p>}
      </header>
      <div className="about-block-body">{children}</div>
    </section>
  );
}

const sentenceCase = (value: string) => value.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export default function AboutPage() {
  return (
    <div className="section-wrap page">
      <header className="page-header">
        <p className="eyebrow">About</p>
        <h1 className="page-title">Building AI that earns its place.</h1>
        <p className="page-lead">Good technology isn’t a demo. It’s a dependable part of how people get meaningful work done.</p>
      </header>

      <Block id="introduction" title="Introduction">
        <div className="prose">
          <p>Over 12 years across analytics, data science and AI, I’ve taken ideas from messy data to deployed products in BFSI, insurance and cybersecurity. Today, I focus on agentic workflows, retrieval-augmented generation and the engineering practices that make AI useful beyond a prototype.</p>
          <p>I bring a hands-on builder’s mindset, thoughtful technical ownership and a steady focus on outcomes — working closely with teams and stakeholders from first question to production.</p>
          <p><Link className="text-link" to="/contact">Get in touch →</Link></p>
        </div>
        <dl className="facts">
          <div><dt>12+</dt><dd>Years in technology</dd></div>
          <div><dt>4%</dt><dd>Sales increase enabled</dd></div>
          <div><dt>3</dt><dd>Disciplines: AI, data and engineering</dd></div>
        </dl>
      </Block>

      <Block id="expertise" title="Technical expertise" intro="Models, systems and engineering discipline, selected for the problem rather than the trend.">
        <div className="skill-grid">
          {skillGroups.map((group) => (
            <article className="skill-group" key={group.label}>
              <h3>{group.label}</h3>
              <ul className="tag-list">{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </Block>

      <Block id="experience" title="Experience" intro="Different domains, one direction: data is most powerful when it leads to action.">
        <ol className="timeline">
          {roles.map((role) => (
            <li className="role" key={`${role.company}-${role.period}`}>
              <p className="role-period">{sentenceCase(role.period)}{role.current && <span className="role-current">Current</span>}</p>
              <div>
                <h3>{role.title}</h3>
                <p className="role-company">{role.company}</p>
                <p className="role-detail">{role.detail}</p>
                <ul className="tag-list">{role.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <Block id="education" title="Education & qualifications">
        <ul className="education-list">
          <li><p className="role-period">In progress</p><div><h3>{currentStudy.title}</h3><p className="role-company">{currentStudy.institution}</p></div></li>
          {education.map((item) => (
            <li key={item.title}><p className="role-period">{item.period}</p><div><h3>{item.title}</h3><p className="role-company">{item.institution}</p></div></li>
          ))}
        </ul>
      </Block>
    </div>
  );
}
