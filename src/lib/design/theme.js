// Refined デザインのデザイントークン。
//
// 実際の色は theme.css が CSS 変数 (--bg 等) として定義し、<html data-theme> で
// dark/light を切り替える。ここの `t` は各トークンを var(--x) 参照する文字列なので、
// コンポーネントが `style="background:{t.bg}"` と書くだけでテーマ追従する。
// (xterm など CSS var を解決できない箇所は下の themes[] の実 hex を使うこと)
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// CSS var 参照 (インライン style / style 文字列に埋める用)
const TOKENS = [
	'bg', 'surface', 'surfaceHover', 'border', 'track', 'text', 'dim',
	'accent', 'accentText', 'accentBorder', 'accentDim',
	'amber', 'red', 'redDim',
	'termBg', 'termBorder', 'termText', 'termDim'
];
export const t = Object.fromEntries(TOKENS.map((k) => [k, `var(--${k})`]));

export const FONT_SANS = "'IBM Plex Sans JP', sans-serif";
export const FONT_MONO = "'JetBrains Mono', monospace";

// 実 hex (CSS var を解決できない箇所: xterm のターミナルテーマ等)
export const themes = {
	dark: {
		bg: '#0b0f0d', surface: '#121816', surfaceHover: '#161e1a', border: '#232e28', track: '#1c2621',
		text: '#e4ede7', dim: '#87988e',
		accent: '#4ade80', accentText: '#08130c', accentBorder: 'rgba(74,222,128,0.4)', accentDim: 'rgba(74,222,128,0.08)',
		amber: '#d9b44a', red: '#e57368', redDim: 'rgba(229,115,104,0.1)',
		termBg: '#060907', termBorder: '#17201b', termText: '#c8d6cd', termDim: '#5d6f64'
	},
	light: {
		bg: '#f3f6f4', surface: '#ffffff', surfaceHover: '#f6faf7', border: '#d9e2db', track: '#e7ede8',
		text: '#182019', dim: '#5f6f65',
		accent: '#1a9d54', accentText: '#ffffff', accentBorder: 'rgba(26,157,84,0.45)', accentDim: 'rgba(26,157,84,0.07)',
		amber: '#a8801e', red: '#c8503f', redDim: 'rgba(200,80,63,0.08)',
		termBg: '#0d120f', termBorder: '#1d2721', termText: '#c8d6cd', termDim: '#5d6f64'
	}
};

// --- テーマ切り替え (localStorage 永続 + <html data-theme>) ---
const THEME_KEY = 'linux-trainer:theme';
function initialTheme() {
	if (!browser) return 'dark';
	return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}
export const themeMode = writable(initialTheme());
if (browser) {
	themeMode.subscribe((m) => {
		localStorage.setItem(THEME_KEY, m);
		document.documentElement.dataset.theme = m;
	});
}
export function toggleTheme() {
	themeMode.update((m) => (m === 'dark' ? 'light' : 'dark'));
}
