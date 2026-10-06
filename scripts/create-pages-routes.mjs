import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const routes = ['about', 'expertise', 'work', 'experience', 'research', 'contact'];
const source = join('dist', 'index.html');

for (const route of routes) {
  const directory = join('dist', route);
  await mkdir(directory, { recursive: true });
  await copyFile(source, join(directory, 'index.html'));
}

// Keep the React application available as a fallback for unknown GitHub Pages paths.
await copyFile(source, join('dist', '404.html'));
