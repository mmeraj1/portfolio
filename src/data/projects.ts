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
    description: 'An in-browser old-photo restoration pipeline: photo boundary detection with perspective correction, AI colorization (DDColor) and Real-ESRGAN restoration, all running locally.',
    categories: ['Computer Vision', 'Deep Learning', 'Generative AI'],
    technologies: ['DDColor', 'Real-ESRGAN', 'DeblurGAN-v2', 'ONNX Runtime Web', 'WebGPU', 'WebAssembly', 'React', 'TypeScript', 'Python'],
    githubUrl: 'https://github.com/mmeraj1/ai-image-enhancement',
    area: 'practical',
    status: 'In Development',
    features: [
      'Upload a photo of a printed picture (processed locally, never uploaded)',
      'Automatic photo detection (edges, contours, quadrilateral fitting) with frame/border removal and perspective correction',
      'Four draggable corner handles with live preview, Auto detect, Reset and Skip cropping',
      'AI colorization with DDColor-tiny and an adjustable colour intensity',
      'Denoise, sharpen and detail recovery with Real-ESRGAN (general-x4v3), optional 2x output',
      'Optional extra deblur pass with DeblurGAN-v2',
      'Tiled inference, real download/processing progress, before-and-after slider and download',
    ],
    details: {
      problem: 'Old printed photographs are often photographed on a table or in a frame, and are faded, sepia-toned, noisy or blurred.',
      solution: 'A visitor uploads a phone photo of a print. The app finds the actual photograph, removes the surroundings, straightens it, optionally colorizes it, and restores it - all on their own device. Colorization estimates plausible colours and cannot recover the original ones; on already neutral or mostly white and dark scenes it may add little colour. GAN-based models can invent fine detail, so results are an enhancement rather than a recovery of the original scene.',
      architecture: [
        'React + TypeScript frontend hosted on GitHub Pages with no server; models run in the browser through ONNX Runtime Web (WebGPU where it is numerically reliable, otherwise WebAssembly).',
        'Boundary detection: border-colour segmentation, Otsu threshold, morphology, convex hull, quadrilateral fit with per-side line refinement, then a second pass that separates the paper border from the picture. The aspect ratio is estimated from the quad geometry and a homography warps the photo to a rectangle.',
        'Colorization: DDColor-tiny (Apache-2.0, a transformer-decoder model, not a GAN; ~135 MB fp16 ONNX fetched from Hugging Face on first use and cached). It predicts chroma at 512px; the photo keeps its own full-resolution luminance.',
        'Restoration: Real-ESRGAN general-x4v3 (BSD-3, trained adversarially, ~5 MB) on overlapping 128px tiles, blended with the original by a strength slider.',
        'Deblur: DeblurGAN-v2 (a GAN) converted from Keras to ONNX (~23 MB, fp16).',
        'Not implemented: scratch/dust detection and inpainting of damaged regions, and separate background segmentation. Restoration is global.',
      ],
      futureImprovements: ['Scratch and dust removal with an inpainting model', 'Face-specific restoration', 'A stronger colorization model if a small enough one becomes available'],
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
