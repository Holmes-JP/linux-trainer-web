// シナリオ ⇔ 解説の連動。search-index.json の逆引きマップを引く薄い層。
// manifest.yaml 側には一切データを持たない (Spec: 解説側メタデータ + カテゴリ自動対応)。
import { loadSearchIndex } from "./loader";
import type { ContentIndex, RelatedRef } from "./types";

let cached: Promise<ContentIndex> | null = null;

/** search-index.json をキャッシュ付きで取得する */
export function loadContentIndex(): Promise<ContentIndex> {
	if (!cached) {
		cached = loadSearchIndex().catch((e) => {
			cached = null; // 失敗はキャッシュしない (リロードで再試行できるように)
			throw e;
		});
	}
	return cached;
}

/** シナリオ id に関連する解説 (記事 + コマンド) を返す。無ければ空配列 */
export async function relatedForScenario(scenarioId: string): Promise<RelatedRef[]> {
	const index = await loadContentIndex();
	return index.byScenario[scenarioId] ?? [];
}
