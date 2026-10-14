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

## Contact form setup

The contact form sends directly from the page using Formspree; visitors do not need to open an email app, and your email address is not shown on the Contact page.

1. Create a form in your Formspree account, set its recipient to your email, and copy the form endpoint (`https://formspree.io/f/...`). Verify the recipient if Formspree requests it.
2. For local testing, replace the placeholder in `.env` with your endpoint and restart `npm run dev`.
3. For GitHub Pages, open the repository's **Settings → Secrets and variables → Actions → Variables**, add a repository variable named `VITE_FORMSPREE_ENDPOINT`, and set its value to the form endpoint. Push a commit or rerun the Pages workflow.

The endpoint is a public form identifier, not a secret. Keep recipient email configuration inside Formspree, not in this repository. Until the endpoint is configured in GitHub Actions, the live form will display a setup message instead of attempting to send.

The Research page's RAC presentation downloads are AES-GCM encrypted and are only offered after the Research access code unlocks the page.
