// 表示用フォーマッタ

/** ミリ秒を "M:SS" / "H:MM:SS" に整形する (クリア時間表示用) */
export function fmtDuration(ms) {
	if (ms == null || !isFinite(ms) || ms < 0) return '';
	const totalSec = Math.round(ms / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const pad = (n) => String(n).padStart(2, '0');
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
