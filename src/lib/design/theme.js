// Refined デザイン (Claude Design: デザイン洗練のご依頼) のデザイントークン。
// Refined - Challenge / Refined - Scenario List の themes() と同一の値。
// コンポーネントは `import { t } from '$lib/design/theme'` して inline style で参照する
// (デザイン原本の {{ t.xxx }} をそのまま移植する形)。
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

// 既定はダーク (デザインの default、現行アプリと一致)。light は将来のトグル用に保持。
export const t = themes.dark;

// フォントスタック
export const FONT_SANS = "'IBM Plex Sans JP', sans-serif";
export const FONT_MONO = "'JetBrains Mono', monospace";
