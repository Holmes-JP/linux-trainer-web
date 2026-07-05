// BYOK ページ内チャット: ユーザー自身の API キーで各社 API をブラウザから直接叩く。
// キーはこの端末から各社 API へ送るだけで、当サイトのサーバには一切送信しない。
import type { AiSettings } from "./settings";

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

const SYSTEM_PROMPT =
	"あなたは Linux を学ぶ人を助けるアシスタントです。日本語で、初心者にもわかるように簡潔に説明してください。" +
	"コマンドの説明には短い具体例を添えてください。トラブルシューティング演習の質問には、いきなり答えを出さず、" +
	"まず考え方のヒントを段階的に示し、最後に必要なら解法をまとめてください。";

/** 選択中プロバイダにチャット送信し、アシスタントの応答テキストを返す。 */
export async function askAI(settings: AiSettings, messages: ChatMessage[]): Promise<string> {
	return settings.provider === "anthropic"
		? askAnthropic(settings, messages)
		: askOpenAI(settings, messages);
}

async function askAnthropic(s: AiSettings, messages: ChatMessage[]): Promise<string> {
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
			system: SYSTEM_PROMPT,
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

async function askOpenAI(s: AiSettings, messages: ChatMessage[]): Promise<string> {
	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${s.openaiKey}`
		},
		body: JSON.stringify({
			model: s.openaiModel || "gpt-4o-mini",
			messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
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
