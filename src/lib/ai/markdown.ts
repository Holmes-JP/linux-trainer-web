// AI 応答 (信頼できない外部テキスト) を Markdown → HTML にする。
// 記事用の renderMarkdown と違い **必ずサニタイズ** する:
// AI が誤って/注入されて危険な HTML を返しても、localStorage の API キー等を
// 盗まれないよう、生 HTML/スクリプトを除去し、許可タグと安全リンクだけ残す。
import { marked } from "marked";

const ALLOWED = new Set([
	"p", "br", "strong", "em", "b", "i", "del", "s", "code", "pre", "blockquote",
	"h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a",
	"table", "thead", "tbody", "tr", "th", "td", "hr", "span"
]);
// テキストごと消すタグ (中身も見せない)
const DROP = new Set([
	"script", "style", "iframe", "object", "embed", "link", "meta", "base",
	"form", "input", "button", "textarea", "select", "svg", "math", "img"
]);
const SAFE_HREF = /^(https?:|mailto:|#|\/)/i;

function walk(node: Node): void {
	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === 1) {
			const el = child as Element;
			const tag = el.tagName.toLowerCase();
			if (DROP.has(tag)) {
				el.remove();
				continue;
			}
			if (!ALLOWED.has(tag)) {
				// 未許可タグは中身 (テキスト) だけ残してタグを外す
				walk(el);
				el.replaceWith(...Array.from(el.childNodes));
				continue;
			}
			for (const attr of Array.from(el.attributes)) {
				const name = attr.name.toLowerCase();
				if (tag === "a" && name === "href" && SAFE_HREF.test(attr.value.trim())) continue;
				el.removeAttribute(attr.name);
			}
			if (tag === "a") {
				el.setAttribute("target", "_blank");
				el.setAttribute("rel", "noopener nofollow");
			}
			walk(el);
		} else if (child.nodeType === 8) {
			child.remove(); // コメント除去
		}
	}
}

export function renderAiMarkdown(md: string): string {
	const html = marked.parse(md ?? "", { async: false, gfm: true, breaks: true }) as string;
	if (typeof document === "undefined") return ""; // SSR では描画しない (チャットは client のみ)
	const tpl = document.createElement("template");
	tpl.innerHTML = html;
	walk(tpl.content);
	return tpl.innerHTML;
}
