import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath } from 'node:url';

const crossOriginIsolationHeaders = {
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Embedder-Policy": "require-corp"
};

// dev/preview の全レスポンスに COOP/COEP を付与する (Spec.md §9 R3)
const crossOriginIsolationPlugin = {
	name: "cross-origin-isolation",
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			for (const [k, v] of Object.entries(crossOriginIsolationHeaders))
				res.setHeader(k, v);
			next();
		});
	},
	configurePreviewServer(server) {
		server.middlewares.use((req, res, next) => {
			for (const [k, v] of Object.entries(crossOriginIsolationHeaders))
				res.setHeader(k, v);
			next();
		});
	}
};

export default defineConfig({
	resolve: {
		alias: {
			// 相対 id のままだと vite dev の import-analysis が解決できないため絶対パスにする
			'/config_terminal': fileURLToPath(new URL(process.env.WEBVM_MODE == "github" ? './config_github_terminal.js' : './config_public_terminal.js', import.meta.url)),
			"@leaningtech/cheerpx": process.env.CX_URL ? process.env.CX_URL : "@leaningtech/cheerpx"
		}
	},
	build: {
		target: "es2022"
	},
	optimizeDeps: {
		// index.js が top-level await を使っており esbuild の事前バンドルが失敗するため除外
		exclude: ["@leaningtech/cheerpx"]
	},
	// CheerpX は SharedArrayBuffer に依存するため cross-origin isolation が必須 (Spec.md §9 R3)。
	// 本番 (GitHub Pages) は serviceWorker.js が同ヘッダを注入する。dev/preview はここで返す。
	// server.headers だけでは全レスポンスに乗らないため、ミドルウェアで明示的に付与する。
	server: {
		headers: crossOriginIsolationHeaders,
		fs: {
			// ルート直下の config_*_terminal.js を dev サーバーが配れるようにする
			allow: ['.']
		}
	},
	preview: {
		headers: crossOriginIsolationHeaders
	},
	plugins: [
		crossOriginIsolationPlugin,
		sveltekit(),
		viteStaticCopy({
			targets: [
				{ src: 'tower.ico', dest: '' },
				{ src: 'scrollbar.css', dest: '' },
				{ src: 'serviceWorker.js', dest: '' },
				{ src: 'login.html', dest: '' },
				{ src: 'assets/', dest: '' },
				{ src: 'documents/', dest: '' },
				// シナリオ manifest (scenarios/<id>/manifest.yaml) を静的配信する
				{ src: 'scenarios/', dest: '' }
			]
		})
	]
});
