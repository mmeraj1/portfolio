/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_FORMSPREE_ENDPOINT: string;
	readonly VITE_ENHANCE_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
