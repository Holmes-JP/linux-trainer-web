// BYOK ページ内チャット: ユーザー自身の API キーで各社 API をブラウザから直接叩く。
// キーはこの端末から各社 API へ送るだけで、当サイトのサーバには一切送信しない。
import type { AiSettings } from "./settings";

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

const SYSTEM_PROMPT =
	"あなたは Linux を学ぶ人を助けるアシスタントです。日本語で、初心者にもわかるように簡潔に答えてください。\n" +
	"これはブラウザ内の『実際の Linux 端末』で行うトラブルシューティング演習です。ユーザーは目の前の端末を操作しながら質問しています。\n" +
	"一般的な学習ステップの列挙 (『まず ls を学び、次に…』のような教科書的な内容) は避け、いま目の前の状況で『次に何をすべきか』を具体的に答えてください。\n" +
	"『まず何をすればいい?』のような質問には、まず現在の状態を調べるコマンドを 1〜3 個、短い理由とともに勧めてください " +
	"(例: pwd で現在地、id/whoami で自分の権限、ls -la で対象の権限・所有者、ps aux でプロセス、cat/less で設定やログの中身)。\n" +
	"答えを一気に全部与えず、次の一手を短く示してください。与えられた『現在の課題』と『端末の最近の出力』を必ず踏まえ、その状況に即して答えてください。" +
	"端末の出力がまだほとんど無い (起動直後) 場合は、まず今回のミッションを一言で伝え、状態把握のコマンド (pwd/id/ls -la 等) から勧めてください。\n" +
	"あなたには参考として『この課題のヒント』と『模範解法 (答え)』が渡されることがあります。" +
	"これは背景理解のためであり、答えやそのままの修復コマンドを安易に提示してはいけません。" +
	"まずユーザー自身が原因に気づけるよう、調べるコマンドや着眼点を促してください。" +
	"ユーザーが明らかに行き詰まっている、または『答えを教えて』と強く求めたときだけ、ヒントを 1 つずつ小出しにし、最後の手段として解法を段階的に示してください。" +
	"コマンドを勧めるときは必ず『なぜそれを使うのか』を一言添えて、学習につながるようにしてください。";

/** 選択中プロバイダにチャット送信し、アシスタントの応答テキストを返す。
 *  systemExtra には「現在の課題」「端末の最近の出力」など、その時点の状況を渡す。 */
export async function askAI(
	settings: AiSettings,
	messages: ChatMessage[],
	systemExtra?: string
): Promise<string> {
	return settings.provider === "anthropic"
		? askAnthropic(settings, messages, systemExtra)
		: askOpenAI(settings, messages, systemExtra);
}

function systemFor(extra?: string): string {
	return extra && extra.trim() ? `${SYSTEM_PROMPT}\n\n${extra}` : SYSTEM_PROMPT;
}

async function askAnthropic(
	s: AiSettings,
	messages: ChatMessage[],
	systemExtra?: string
): Promise<string> {
	const res = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-api-key": s.anthropicKey,
			"anthropic-version": "2023-06-01",
			// ブラウザから直接叩くための明示的オプトイン
			"anthropic-dangerous-direct-browser-access": "true"
		},
		body: JSON.stringify({
			model: s.anthropicModel || "claude-opus-4-8",
			max_tokens: 2048,
			system: systemFor(systemExtra),
			messages: messages.map((m) => ({ role: m.role, content: m.content }))
		})
	});
	if (!res.ok) throw new Error(await errText(res));
	const data = await res.json();
	const text = (data.content ?? [])
		.filter((b: { type: string }) => b.type === "text")
		.map((b: { text: string }) => b.text)
		.join("");
	return text || "(空の応答が返りました)";
}

async function askOpenAI(
	s: AiSettings,
	messages: ChatMessage[],
	systemExtra?: string
): Promise<string> {
	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${s.openaiKey}`
		},
		body: JSON.stringify({
			model: s.openaiModel || "gpt-4o-mini",
			messages: [{ role: "system", content: systemFor(systemExtra) }, ...messages]
		})
	});
	if (!res.ok) throw new Error(await errText(res));
	const data = await res.json();
	return data.choices?.[0]?.message?.content ?? "(空の応答が返りました)";
}

async function errText(res: Response): Promise<string> {
	let detail = `HTTP ${res.status}`;
	try {
		const j = await res.json();
		if (j?.error?.message) detail = j.error.message;
	} catch {
		/* JSON でないエラーはステータスのみ */
	}
	if (res.status === 401) return `認証エラー: API キーが正しいか確認してください (${detail})`;
	if (res.status === 429) return `レート制限/残高不足の可能性があります (${detail})`;
	return detail;
}
