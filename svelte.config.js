import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		paths: {
			// github.io/<repo>/ のサブパス配信用。root 配信 (独自ドメイン/ローカル) では未設定のまま。
			base: process.env.BASE_PATH || ''
		}
	},
	preprocess: vitePreprocess()
};

export default config;
