import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const routes = ['about', 'expertise', 'work', 'experience', 'research', 'contact', 'projects'];

// Pre-render a fallback page for every project slug in the central data file.
const projectData = await readFile(join('src', 'data', 'projects.ts'), 'utf8');
for (const [, slug] of projectData.matchAll(/slug:\s*'([^']+)'/g)) routes.push(`projects/${slug}`);
const source = join('dist', 'index.html');

for (const route of routes) {
  const directory = join('dist', route);
  await mkdir(directory, { recursive: true });
  await copyFile(source, join(directory, 'index.html'));
}

// Keep the React application available as a fallback for unknown GitHub Pages paths.
await copyFile(source, join('dist', '404.html'));
