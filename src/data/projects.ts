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
    description: 'An interactive image enhancement demo that runs the DeblurGAN-v2 GAN directly in your browser, with automatic photo cropping and manual crop adjustment.',
    categories: ['Computer Vision', 'Deep Learning', 'Generative AI'],
    technologies: ['DeblurGAN-v2', 'ONNX Runtime Web', 'WebGPU', 'WebAssembly', 'React', 'TypeScript', 'Python', 'TensorFlow'],
    githubUrl: 'https://github.com/mmeraj1/ai-image-enhancement',
    area: 'practical',
    status: 'In Development',
    features: ['Upload an image (processed locally, never uploaded)', 'Deblur with DeblurGAN-v2 running in the browser (WebGPU, WASM fallback)', 'Automatic photo-border detection with manual crop sliders', 'Tiled inference with live download and processing progress', 'Before-and-after comparison slider', 'Download enhanced image'],
    details: {
      problem: 'Old or motion-blurred photographs can lose sharpness, making people and important visual details harder to see.',
      solution: 'A web application where a visitor uploads a photo, optionally crops it to the photograph, and runs DeblurGAN-v2 on their own device, then compares the result before downloading it. GANs can invent plausible detail, so results are an enhancement rather than a recovery of the original scene. Colorization (DeOldify) and background cleanup exist in the Python backend but are not available in the browser demo.',
      architecture: [
        'React + TypeScript frontend (this portfolio) for upload, cropping, comparison and download; hosted on GitHub Pages with no server.',
        'The pretrained DeblurGAN-v2 generator (a Keras model) was converted to ONNX, with weights stored as float16 for a ~23 MB download, and verified against the original model.',
        'ONNX Runtime Web runs the model in a lazy-loaded chunk using WebGPU when available and WebAssembly (CPU) otherwise.',
        'Images are split into overlapping 256px tiles, enhanced one by one, and blended with a Hann window to limit memory use. Large images are scaled down (2048px on WebGPU, 1024px on WASM).',
        'Photo-border detection estimates the background colour from the image edge and crops to the foreground bounding box; sliders allow manual adjustment.',
        'An optional FastAPI backend (ai-image-enhancement/) provides DeOldify colorization and OpenCV filters and is only used if a service URL is configured.',
      ],
      futureImprovements: ['Browser-based colorization with a compact model', 'Background cleanup and inpainting', 'Perspective correction for skewed photographs', 'Tunable deblurring strength'],
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
