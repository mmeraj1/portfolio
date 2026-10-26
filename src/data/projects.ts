export type ProjectCategory = 'Computer Vision' | 'Deep Learning' | 'Generative AI' | 'Research';
export type ProjectStatus = 'In Development' | 'Coming Soon' | 'Research In Progress' | 'Completed';

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  categories: ProjectCategory[];
  technologies: string[];
  /** Thumbnail path relative to /public (e.g. "projects/foo.png"). Omit to show a placeholder. */
  image?: string;
  /** Add only once the repository exists. */
  githubUrl?: string;
  /** Add only once a working demo is deployed. */
  demoUrl?: string;
  /** 'practical' projects appear under Projects; 'research' projects appear under Research. */
  area: 'practical' | 'research';
  status: ProjectStatus;
  features: string[];
  /** Optional long-form content for the detail page. */
  details?: {
    problem: string;
    solution: string;
    architecture: string[];
    futureImprovements: string[];
  };
}

export const projectCategories: ProjectCategory[] = ['Computer Vision', 'Deep Learning', 'Generative AI', 'Research'];

export const projects: Project[] = [
  {
    id: 'p1',
    slug: 'ai-image-enhancement',
    title: 'AI Image Enhancement',
    description: 'An interactive image enhancement application that improves image visibility, brightness, contrast and sharpness using computer vision techniques.',
    categories: ['Computer Vision'],
    technologies: ['Python', 'OpenCV', 'FastAPI', 'React', 'TypeScript'],
    githubUrl: 'https://github.com/mmeraj1/ai-image-enhancement',
    area: 'practical',
    status: 'In Development',
    features: ['Upload an image', 'Four enhancement methods: Auto, CLAHE contrast, Gamma brightness, Sharpen', 'Before-and-after comparison slider', 'Download enhanced image'],
    details: {
      problem: 'Photographs captured in poor lighting, haze or with limited sensor quality often lose visibility, contrast and detail, which hurts both human viewing and downstream vision systems.',
      solution: 'A web application where a user uploads an image, chooses an enhancement method, and compares the original with the enhanced result side by side before downloading it. Enhancement is performed by a separate FastAPI + OpenCV service.',
      architecture: [
        'React + TypeScript frontend (this portfolio) for upload, method selection, comparison and download.',
        'Python FastAPI service exposing POST /enhance, with validation of file type, size and dimensions, built on OpenCV.',
        'The service is containerised (Dockerfile) and can run on any container host.',
        'Frontend and backend are decoupled; the frontend reads the service URL from configuration.',
      ],
      futureImprovements: ['Host the enhancement service and enable the live demo', 'Add tunable parameters and more methods', 'Batch processing', 'Optional Gradio interface'],
    },
  },
  {
    id: 'p2',
    slug: 'road-image-dehazing',
    title: 'Road Image Dehazing',
    description: 'Fog removal and visibility enhancement for road scenes, supporting research into robust object detection under adverse weather conditions.',
    categories: ['Computer Vision', 'Research'],
    technologies: [],
    area: 'research',
    status: 'Coming Soon',
    features: [],
  },
  {
    id: 'p3',
    slug: 'low-light-driving-scene-enhancement',
    title: 'Low-Light Driving Scene Enhancement',
    description: 'Enhancing nighttime driving scenes to improve visibility and support robust perception systems.',
    categories: ['Deep Learning', 'Research'],
    technologies: [],
    area: 'research',
    status: 'Coming Soon',
    features: [],
  },
  {
    id: 'p4',
    slug: 'lightweight-road-object-detection',
    title: 'Lightweight Road Object Detection',
    description: 'An efficient object detection application for identifying vehicles, pedestrians and other road users, designed for practical deployment.',
    categories: ['Computer Vision', 'Deep Learning'],
    technologies: [],
    area: 'research',
    status: 'Coming Soon',
    features: [],
  },
  {
    id: 'p5',
    slug: 'domain-adaptation-object-detection',
    title: 'Domain Adaptation for Object Detection',
    description: 'Experimental comparison of source-only and domain-adaptive object detection methods for clear-to-foggy driving scenarios.',
    categories: ['Research'],
    technologies: [],
    area: 'research',
    status: 'Research In Progress',
    features: [],
  },
];

export const getProjectBySlug = (slug: string) => projects.find((project) => project.slug === slug);
