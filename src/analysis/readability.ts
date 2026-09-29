import type { ExtractedContent } from "./text.js";

export type CheckStatus = "good" | "ok" | "bad";

export interface AnalysisCheck {
	id: string;
	label: string;
	status: CheckStatus;
	detail: string;
}

const TRANSITION_WORDS = [
	"however",
	"therefore",
	"moreover",
	"furthermore",
	"meanwhile",
	"consequently",
	"additionally",
	"likewise",
	"instead",
	"although",
	"because",
	"finally",
	"next",
	"then",
	"also",
	"besides",
	"indeed",
	"similarly",
	"otherwise",
	"hence",
];

function average(nums: number[]): number {
	if (nums.length === 0) return 0;
	return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function wordsIn(text: string): number {
	return text.match(/[A-Za-z0-9']+/g)?.length ?? 0;
}

export function analyzeReadability(content: ExtractedContent): AnalysisCheck[] {
	const checks: AnalysisCheck[] = [];
	const sentenceLens = content.sentences.map(wordsIn);
	const avgSentence = average(sentenceLens);

	checks.push({
		id: "sentence-length",
		label: "Sentence length",
		status: avgSentence === 0 ? "bad" : avgSentence <= 20 ? "good" : avgSentence <= 25 ? "ok" : "bad",
		detail:
			avgSentence === 0
				? "No sentences detected in the body."
				: `Average ${avgSentence.toFixed(1)} words per sentence (aim ≤ 20).`,
	});

	const paraLens = content.paragraphs.map(wordsIn);
	const longParas = paraLens.filter((n) => n > 150).length;
	checks.push({
		id: "paragraph-length",
		label: "Paragraph length",
		status: content.paragraphs.length === 0 ? "bad" : longParas === 0 ? "good" : longParas <= 1 ? "ok" : "bad",
		detail:
			content.paragraphs.length === 0
				? "No paragraphs detected."
				: longParas === 0
					? "Paragraphs look scannable."
					: `${longParas} paragraph(s) exceed 150 words.`,
	});

	checks.push({
		id: "subheading-distribution",
		label: "Subheading distribution",
		status:
			content.wordCount < 300
				? "ok"
				: content.headings.length >= Math.max(1, Math.floor(content.wordCount / 300))
					? "good"
					: "bad",
		detail:
			content.wordCount < 300
				? "Short content — subheadings optional."
				: `${content.headings.length} heading(s) for ${content.wordCount} words.`,
	});

	const lower = content.bodyText.toLowerCase();
	const transitionHits = TRANSITION_WORDS.filter((w) => lower.includes(w)).length;
	const transitionRatio =
		content.sentences.length === 0 ? 0 : transitionHits / content.sentences.length;
	checks.push({
		id: "transition-words",
		label: "Transition words",
		status: content.sentences.length === 0 ? "bad" : transitionRatio >= 0.3 ? "good" : transitionRatio >= 0.15 ? "ok" : "bad",
		detail: `Found ${transitionHits} transition word type(s) across ${content.sentences.length} sentences.`,
	});

	return checks;
}
