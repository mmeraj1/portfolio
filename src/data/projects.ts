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
    description: 'An interactive image enhancement application with GAN-based deblurring and black-and-white colorization, alongside classic OpenCV filters.',
    categories: ['Computer Vision', 'Deep Learning', 'Generative AI'],
    technologies: ['Python', 'OpenCV', 'FastAPI', 'DeblurGAN-v2', 'DeOldify', 'TensorFlow', 'PyTorch', 'React', 'TypeScript'],
    githubUrl: 'https://github.com/mmeraj1/ai-image-enhancement',
    area: 'practical',
    status: 'In Development',
    features: ['Upload an image', 'Deblur motion blur with DeblurGAN-v2', 'Colorize black-and-white images with DeOldify', 'Classic OpenCV enhancement filters', 'Before-and-after comparison slider', 'Download enhanced image'],
    details: {
      problem: 'Old or motion-blurred photographs can lose sharpness and color, making people and important visual details harder to see.',
      solution: 'A web application where a user uploads an image, chooses DeblurGAN-v2 for motion deblurring or DeOldify for plausible colorization, and compares the result before downloading it. The separate FastAPI backend also retains lightweight OpenCV filters. Colorization is an estimate, not a recovery of original colors.',
      architecture: [
        'React + TypeScript frontend (this portfolio) for upload, method selection, comparison and download.',
        'The Python FastAPI backend in ai-image-enhancement/ exposes POST /enhance and validates file type, size and dimensions.',
        'DeblurGAN-v2 runs on 256px overlapping tiles; DeOldify Stable colorizes grayscale input using local model weights.',
        'The backend runs GAN models locally rather than forwarding uploaded images to a third-party inference API.',
        'Classic OpenCV filters remain available when GAN dependencies are not installed.',
        'Frontend and backend are decoupled; the frontend reads the service URL from configuration.',
      ],
      futureImprovements: ['Host a model-enabled backend and enable the live demo', 'Add tunable deblurring and colorization parameters', 'Batch processing', 'Optional Gradio interface'],
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
