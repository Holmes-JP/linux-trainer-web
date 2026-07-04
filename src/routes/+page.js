import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export const prerender = true;

// トップは学習トレーナーの入口 (/play のシナリオ一覧) にリダイレクトする。
// adapter-static は prerender 時にこれを meta refresh 付き HTML として書き出す。
export function load() {
	redirect(308, `${base}/play`);
}
