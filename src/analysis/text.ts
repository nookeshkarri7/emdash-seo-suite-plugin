/** Extract plain text and structural signals from EmDash field values. */

export interface ExtractedContent {
	title: string;
	excerpt: string;
	bodyText: string;
	introText: string;
	headings: string[];
	slug: string;
	wordCount: number;
	sentences: string[];
	paragraphs: string[];
	hasInternalLink: boolean;
	hasOutboundLink: boolean;
	imageCount: number;
	imagesMissingAlt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function walkPortableText(
	blocks: unknown,
	acc: {
		text: string[];
		headings: string[];
		internalLinks: number;
		outboundLinks: number;
		imageCount: number;
		imagesMissingAlt: number;
	},
): void {
	if (!Array.isArray(blocks)) return;

	for (const block of blocks) {
		if (!isRecord(block)) continue;
		const type = asString(block._type);

		if (type === "block") {
			const style = asString(block.style);
			const children = Array.isArray(block.children) ? block.children : [];
			const parts: string[] = [];
			for (const child of children) {
				if (!isRecord(child)) continue;
				if (asString(child._type) === "span") {
					parts.push(asString(child.text));
				}
			}
			const line = parts.join("").trim();
			if (line) {
				acc.text.push(line);
				if (/^h[1-6]$/i.test(style)) acc.headings.push(line);
			}

			const markDefs = Array.isArray(block.markDefs) ? block.markDefs : [];
			for (const def of markDefs) {
				if (!isRecord(def)) continue;
				if (asString(def._type) !== "link") continue;
				const href = asString(def.href);
				if (!href) continue;
				if (href.startsWith("/") || href.startsWith("#")) acc.internalLinks += 1;
				else if (/^https?:\/\//i.test(href)) acc.outboundLinks += 1;
			}
			continue;
		}

		if (type === "image") {
			acc.imageCount += 1;
			const alt = asString(block.alt) || (isRecord(block.asset) ? asString(block.asset.alt) : "");
			if (!alt.trim()) acc.imagesMissingAlt += 1;
			continue;
		}

		// Nested portable text / unknown containers
		for (const value of Object.values(block)) {
			if (Array.isArray(value)) walkPortableText(value, acc);
		}
	}
}

function splitSentences(text: string): string[] {
	return text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function splitParagraphs(text: string): string[] {
	return text
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);
}

function wordCount(text: string): number {
	const words = text.match(/[A-Za-z0-9']+/g);
	return words?.length ?? 0;
}

export function extractContent(input: {
	title?: unknown;
	excerpt?: unknown;
	content?: unknown;
	slug?: unknown;
}): ExtractedContent {
	const title = asString(input.title).trim();
	const excerpt = asString(input.excerpt).trim();
	const slug = asString(input.slug).trim();

	const acc = {
		text: [] as string[],
		headings: [] as string[],
		internalLinks: 0,
		outboundLinks: 0,
		imageCount: 0,
		imagesMissingAlt: 0,
	};

	if (typeof input.content === "string") {
		acc.text.push(input.content);
	} else {
		walkPortableText(input.content, acc);
	}

	const bodyText = acc.text.join("\n\n").trim();
	const introText = acc.text.slice(0, 2).join(" ").trim() || bodyText.slice(0, 300);
	const paragraphs = splitParagraphs(bodyText);
	const sentences = splitSentences(bodyText);

	return {
		title,
		excerpt,
		bodyText,
		introText,
		headings: acc.headings,
		slug,
		wordCount: wordCount(bodyText),
		sentences,
		paragraphs,
		hasInternalLink: acc.internalLinks > 0,
		hasOutboundLink: acc.outboundLinks > 0,
		imageCount: acc.imageCount,
		imagesMissingAlt: acc.imagesMissingAlt,
	};
}

export function normalizeKeyphrase(keyphrase: string): string {
	return keyphrase.trim().toLowerCase().replace(/\s+/g, " ");
}

export function includesKeyphrase(haystack: string, keyphrase: string): boolean {
	const needle = normalizeKeyphrase(keyphrase);
	if (!needle) return false;
	return normalizeKeyphrase(haystack).includes(needle);
}

export function keyphraseDensity(bodyText: string, keyphrase: string): number {
	const needle = normalizeKeyphrase(keyphrase);
	if (!needle || !bodyText.trim()) return 0;
	const words = bodyText.toLowerCase().match(/[a-z0-9']+/g) ?? [];
	if (words.length === 0) return 0;
	const phraseWords = needle.split(" ").filter(Boolean);
	if (phraseWords.length === 0) return 0;

	let hits = 0;
	for (let i = 0; i <= words.length - phraseWords.length; i++) {
		let match = true;
		for (let j = 0; j < phraseWords.length; j++) {
			if (words[i + j] !== phraseWords[j]) {
				match = false;
				break;
			}
		}
		if (match) hits += 1;
	}
	return (hits * phraseWords.length * 100) / words.length;
}
