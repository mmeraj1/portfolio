# Mohammad Meraj — Portfolio

A responsive portfolio built with React, TypeScript and Vite. The visual direction takes inspiration from the supplied AI-engineer portfolio reference while presenting original content based on Mohammad Meraj's résumé.

## Run locally

1. Install Node.js (LTS).
2. Run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` to create the production site in `dist/`.

## Publish with GitHub Pages

The repository is configured for a project site named `portfolio` (`/portfolio/`):

1. Create a GitHub repository named **portfolio** under the GitHub account where the site should live.
2. Push this project to the repository's `main` branch.
3. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source.
4. The workflow in `.github/workflows/deploy.yml` builds the Vite app and publishes it. The site will be available at `https://<your-github-username>.github.io/portfolio/` after the workflow completes.

If the repository uses a different name, update `base` in `vite.config.ts` to `/<repository-name>/` before deployment. For a user/organization site repository named `<username>.github.io`, change it to `/`.
