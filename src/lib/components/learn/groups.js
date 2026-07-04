// コマンドの表示グルーピング (learn/types.ts の CommandGroup) の日本語ラベルと表示順。
export const GROUP_LABELS = {
	files: 'ファイル操作',
	text: 'テキスト処理',
	permissions: '権限・ユーザー',
	processes: 'プロセス',
	disk: 'ディスク',
	services: 'サービス',
	logs: 'ログ',
	system: 'システム'
};
export const GROUP_ORDER = Object.keys(GROUP_LABELS);
