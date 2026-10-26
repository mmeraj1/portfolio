export interface WorkItem { number: string; label: string; title: string; description: string; stack: string[]; outcome?: string }

export const professionalWork: WorkItem[] = [
  {
    number: '01',
    label: 'Multi-agent systems · Product engineering',
    title: 'Requirements to Jira, thoughtfully automated.',
    description:
      'A human-in-the-loop agent platform that turns product requirement documents into reviewable, traceable Epics and Stories—then connects the approved work to Jira.',
    stack: ['LangGraph', 'LangChain', 'FastAPI', 'Pinecone', 'Jira API'],
  },
  {
    number: '02',
    label: 'Retrieval-augmented generation · Fintech',
    title: 'A better way to ask questions of market data.',
    description:
      'An agentic RAG application that combines Text-to-SQL over PostgreSQL with semantic retrieval, bringing structured and unstructured stock context into explainable recommendations.',
    stack: ['Python', 'LangChain', 'PostgreSQL', 'ChromaDB', 'GPT-4'],
  },
  {
    number: '03',
    label: 'Generative AI · Financial services',
    title: 'Audit answers grounded in the source.',
    description:
      'A document Q&A experience for an audit team, with retrieval-grounded answers and a secure, serverless AWS foundation built around Bedrock, S3, Lambda and IAM.',
    stack: ['RAG', 'AWS Bedrock', 'S3', 'Lambda', 'Streamlit'],
  },
  {
    number: '04',
    label: 'Machine learning · Customer intelligence',
    title: 'Segmentation that moved business outcomes.',
    description:
      'Customer segments and predictive models built from payment and behavioural data to enable more relevant product targeting—contributing to a 4% sales increase.',
    stack: ['Python', 'PySpark', 'XGBoost', 'Random Forest', 'AWS'],
    outcome: 'Contributed to a 4% sales increase.',
  },
];

export const roles = [
  {
    period: 'APR 2025 — PRESENT',
    title: 'AI Engineer Advisor',
    company: 'NTT DATA',
    detail: 'Building production-oriented GenAI and agentic AI systems, including a multi-agent PRD-to-Jira platform and a stock recommendation assistant.',
    tags: ['Agentic AI', 'LangGraph', 'RAG', 'LLMOps'],
    current: true,
  },
  {
    period: 'MAY 2024 — MAR 2025',
    title: 'Assistant Manager 2',
    company: 'Grant Thornton (GT) Bharat',
    detail: 'Delivered document-grounded audit Q&A on AWS and a call transcription, summarisation and sentiment workflow for an insurance client.',
    tags: ['AWS Bedrock', 'RAG', 'Whisper', 'Gemma'],
  },
  {
    period: 'MAR 2021 — APR 2024',
    title: 'Senior Consultant · Lead Data Scientist',
    company: 'Capgemini',
    detail: 'Led data science delivery across Generative AI, customer segmentation and cybersecurity anomaly detection for global clients.',
    tags: ['Generative AI', 'XGBoost', 'Azure ML', 'PySpark'],
  },
  {
    period: 'SEP 2019 — MAR 2021',
    title: 'Freelance Data Scientist',
    company: 'Independent',
    detail: 'Built propensity-to-pay models, customer segments and campaign insights to support more relevant customer engagement.',
    tags: ['Predictive modelling', 'Clustering', 'Decision Trees'],
  },
  {
    period: 'SEP 2013 — NOV 2017',
    title: 'Advanced Analyst',
    company: 'EY · Deutsche Bank engagement',
    detail: 'Delivered financial analysis and data-quality reporting for global operations, while leading task planning and stakeholder updates.',
    tags: ['Financial analytics', 'Reporting', 'Team leadership'],
  },
];

export const skillGroups = [
  { label: 'Generative & agentic AI', items: ['Agentic AI', 'Multi-agent systems', 'RAG', 'LangGraph', 'LangChain', 'CrewAI', 'MCP', 'Prompt engineering'] },
  { label: 'Machine learning & data', items: ['Predictive modelling', 'NLP', 'XGBoost', 'Random Forest', 'Clustering', 'Anomaly detection', 'Computer vision', 'PySpark'] },
  { label: 'Engineering & cloud', items: ['Python', 'FastAPI', 'AWS Bedrock', 'SageMaker', 'Azure ML', 'PostgreSQL', 'Pinecone', 'ChromaDB', 'Docker', 'GitHub Actions'] },
  { label: 'LLMOps & delivery', items: ['Langfuse', 'Grafana', 'CI/CD', 'Observability', 'Human-in-the-loop', 'Technical ownership', 'Client engagement'] },
];

export const education = [
  { period: '2021 — 2023', title: 'MSc, Data Science', institution: 'Chandigarh University' },
  { period: '2003 — 2006', title: 'BSc', institution: 'IGNOU · Government of India' },
  { period: 'Professional development', title: 'Azure AI Fundamentals (AI-900)', institution: 'Microsoft · MLOps Workshop, Capgemini' },
];

export const currentStudy = { title: 'PhD · Data Science & AI', institution: 'CMR University' };
