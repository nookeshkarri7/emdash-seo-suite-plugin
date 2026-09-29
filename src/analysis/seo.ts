import type { AnalysisCheck } from "./readability.js";
import {
	type ExtractedContent,
	includesKeyphrase,
	keyphraseDensity,
	normalizeKeyphrase,
} from "./text.js";

export interface SeoFieldSnapshot {
	title: string | null;
	description: string | null;
	image: string | null;
	canonical: string | null;
	noIndex: boolean;
}

export interface AnalyzeInput {
	content: ExtractedContent;
	seo: SeoFieldSnapshot;
	focusKeyphrase: string;
	hasFeaturedImage?: boolean;
}

export interface AnalysisResult {
	seoChecks: AnalysisCheck[];
	overall: "good" | "ok" | "bad";
	suggestedSeoTitle: string;
	suggestedSeoDescription: string;
	snippetTitle: string;
	snippetDescription: string;
	snippetUrl: string;
}

function worst(statuses: Array<AnalysisCheck["status"]>): AnalysisResult["overall"] {
	if (statuses.includes("bad")) return "bad";
	if (statuses.includes("ok")) return "ok";
	return "good";
}

function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function analyzeSeo(input: AnalyzeInput): AnalysisResult {
	const { content, seo, focusKeyphrase } = input;
	const key = normalizeKeyphrase(focusKeyphrase);
	const seoTitle = (seo.title ?? "").trim() || content.title;
	const seoDescription = (seo.description ?? "").trim() || content.excerpt;
	const checks: AnalysisCheck[] = [];

	checks.push({
		id: "focus-keyphrase",
		label: "Focus keyphrase set",
		status: key ? "good" : "bad",
		detail: key ? `Focus keyphrase: “${key}”.` : "Set a focus keyphrase to unlock keyphrase checks.",
	});

	if (key) {
		checks.push({
			id: "keyphrase-in-title",
			label: "Keyphrase in SEO title",
			status: includesKeyphrase(seoTitle, key) ? "good" : "bad",
			detail: includesKeyphrase(seoTitle, key)
				? "Keyphrase appears in the SEO title."
				: "Add the keyphrase to the SEO title.",
		});

		checks.push({
			id: "keyphrase-in-intro",
			label: "Keyphrase in introduction",
			status: includesKeyphrase(content.introText, key) ? "good" : "ok",
			detail: includesKeyphrase(content.introText, key)
				? "Keyphrase appears near the start."
				: "Mention the keyphrase in the first paragraph.",
		});

		checks.push({
			id: "keyphrase-in-headings",
			label: "Keyphrase in subheading",
			status: content.headings.some((h) => includesKeyphrase(h, key)) ? "good" : "ok",
			detail: content.headings.some((h) => includesKeyphrase(h, key))
				? "Keyphrase found in a heading."
				: "Consider using the keyphrase in a subheading.",
		});

		checks.push({
			id: "keyphrase-in-meta",
			label: "Keyphrase in meta description",
			status: includesKeyphrase(seoDescription, key) ? "good" : "bad",
			detail: includesKeyphrase(seoDescription, key)
				? "Keyphrase appears in the meta description."
				: "Include the keyphrase in the meta description.",
		});

		checks.push({
			id: "keyphrase-in-slug",
			label: "Keyphrase in slug",
			status: includesKeyphrase(content.slug.replace(/-/g, " "), key) ? "good" : "ok",
			detail: includesKeyphrase(content.slug.replace(/-/g, " "), key)
				? "Slug reflects the keyphrase."
				: "Slug does not clearly include the keyphrase.",
		});

		const density = keyphraseDensity(content.bodyText, key);
		checks.push({
			id: "keyphrase-density",
			label: "Keyphrase density",
			status: density >= 0.5 && density <= 2.5 ? "good" : density > 0 && density < 3.5 ? "ok" : "bad",
			detail: `Density ${density.toFixed(2)}% (aim 0.5–2.5%).`,
		});
	}

	const titleLen = seoTitle.length;
	checks.push({
		id: "title-length",
		label: "SEO title length",
		status: titleLen === 0 ? "bad" : titleLen >= 30 && titleLen <= 60 ? "good" : titleLen < 70 ? "ok" : "bad",
		detail: titleLen === 0 ? "SEO title is empty." : `${titleLen} characters (aim 30–60).`,
	});

	const descLen = seoDescription.length;
	checks.push({
		id: "meta-length",
		label: "Meta description length",
		status: descLen === 0 ? "bad" : descLen >= 120 && descLen <= 160 ? "good" : descLen < 180 ? "ok" : "bad",
		detail: descLen === 0 ? "Meta description is empty." : `${descLen} characters (aim 120–160).`,
	});

	checks.push({
		id: "internal-links",
		label: "Internal links",
		status: content.hasInternalLink ? "good" : "ok",
		detail: content.hasInternalLink ? "At least one internal link found." : "Add internal links to related content.",
	});

	checks.push({
		id: "outbound-links",
		label: "Outbound links",
		status: content.hasOutboundLink ? "good" : "ok",
		detail: content.hasOutboundLink ? "At least one outbound link found." : "Consider citing an authoritative external source.",
	});

	const hasImage = Boolean(seo.image) || Boolean(input.hasFeaturedImage) || content.imageCount > 0;
	checks.push({
		id: "image",
		label: "Image present",
		status: hasImage ? "good" : "ok",
		detail: hasImage ? "An image is available for social/SEO." : "Add a featured or SEO image.",
	});

	checks.push({
		id: "image-alt",
		label: "Image alt text",
		status:
			content.imageCount === 0
				? "ok"
				: content.imagesMissingAlt === 0
					? "good"
					: "bad",
		detail:
			content.imageCount === 0
				? "No inline images to check."
				: content.imagesMissingAlt === 0
					? "Inline images have alt text."
					: `${content.imagesMissingAlt} image(s) missing alt text.`,
	});

	checks.push({
		id: "noindex",
		label: "Indexability",
		status: seo.noIndex ? "ok" : "good",
		detail: seo.noIndex ? "This entry is marked noindex." : "Entry is indexable.",
	});

	const suggestedSeoTitle = clip(
		key && !includesKeyphrase(content.title, key) ? `${content.title} — ${focusKeyphrase.trim()}` : content.title,
		60,
	);
	const suggestedSeoDescription = clip(
		content.excerpt ||
			(key
				? `Learn about ${focusKeyphrase.trim()}. ${content.introText}`.trim()
				: content.introText),
		160,
	);

	return {
		seoChecks: checks,
		overall: worst(checks.map((c) => c.status)),
		suggestedSeoTitle: suggestedSeoTitle || "Untitled",
		suggestedSeoDescription,
		snippetTitle: clip(seoTitle || suggestedSeoTitle || "Untitled", 60),
		snippetDescription: clip(seoDescription || suggestedSeoDescription || "", 160),
		snippetUrl: content.slug ? `https://example.com/${content.slug}` : "https://example.com/…",
	};
}
