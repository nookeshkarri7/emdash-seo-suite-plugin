import type { Block, BlockResponse } from "@emdash-cms/blocks";

import { statusEmoji, type FullAnalysis } from "../analysis/score.js";
import type { AnalysisCheck } from "../analysis/readability.js";

function checkRows(checks: AnalysisCheck[]): Block {
	return {
		type: "fields",
		fields: checks.map((check) => ({
			label: `${statusEmoji(check.status)} ${check.label}`,
			value: check.detail,
		})),
	};
}

function scoreChecks(checks: AnalysisCheck[]): number {
	if (checks.length === 0) return 0;
	const points = checks.reduce(
		(total, check) => total + (check.status === "good" ? 100 : check.status === "ok" ? 60 : 0),
		0,
	);
	return Math.round(points / checks.length);
}

export function buildAnalysisPanel(opts: {
	focusKeyphrase: string;
	analysis: FullAnalysis | null;
	seoTitle: string;
	seoDescription: string;
	noIndex: boolean;
}): BlockResponse {
	const blocks: Block[] = [
		{ type: "header", text: "SEO Suite" },
		{
			type: "section",
			text: "EmDash owns the SEO panel, sitemap.xml, and robots.txt. This panel analyzes draft content and suggests improvements.",
		},
		{
			type: "form",
			block_id: "focus",
			fields: [
				{
					type: "text_input",
					action_id: "focus_keyphrase",
					label: "Focus keyphrase",
					initial_value: opts.focusKeyphrase,
					placeholder: "e.g. emdash seo plugin",
				},
			],
			submit: { action_id: "save_focus", label: "Save & analyze" },
		},
		{
			type: "actions",
			elements: [{ type: "button", action_id: "analyze", label: "Analyze", style: "primary" }],
		},
	];

	if (!opts.analysis) {
		blocks.push({
			type: "banner",
			variant: "default",
			title: "Ready to analyze",
			description: "Click Analyze (or save a focus keyphrase) to score this entry.",
		});
		return { blocks };
	}

	const a = opts.analysis;
	const seoScore = scoreChecks(a.seoChecks);
	const readabilityScore = scoreChecks(a.readabilityChecks);
	const priorities = [...a.seoChecks, ...a.readabilityChecks]
		.filter((check) => check.status !== "good")
		.sort(
			(left, right) =>
				(left.status === "bad" ? 0 : 1) - (right.status === "bad" ? 0 : 1),
		)
		.slice(0, 3);

	blocks.push({
		type: "stats",
		items: [
			{ label: "SEO score", value: `${seoScore}%`, description: statusEmoji(a.overall) },
			{
				label: "Readability",
				value: `${readabilityScore}%`,
				description: statusEmoji(a.readabilityOverall),
			},
			{
				label: "Indexability",
				value: opts.noIndex ? "Noindex" : "Indexable",
				description: opts.noIndex ? "Excluded from search" : "Eligible for search",
			},
		],
	});
	blocks.push({
		type: "columns",
		columns: [
			[
				{
					type: "meter",
					label: "SEO",
					value: seoScore,
					max: 100,
					custom_value: `${seoScore}%`,
				},
			],
			[
				{
					type: "meter",
					label: "Readability",
					value: readabilityScore,
					max: 100,
					custom_value: `${readabilityScore}%`,
				},
			],
		],
	});

	if (priorities.length > 0) {
		blocks.push({
			type: "banner",
			variant: priorities.some((check) => check.status === "bad") ? "alert" : "default",
			title: "Top improvements",
			description: priorities.map((check) => `• ${check.label}: ${check.detail}`).join("\n"),
		});
	} else {
		blocks.push({
			type: "banner",
			title: "Ready for search",
			description: "All SEO and readability checks passed.",
		});
	}

	blocks.push({ type: "header", text: "Search snippet preview" });
	blocks.push({
		type: "section",
		text: `*${a.snippetTitle}*\n${a.snippetUrl}\n${a.snippetDescription || "—"}`,
	});

	blocks.push({
		type: "tab",
		panels: [
			{ label: "SEO checklist", blocks: [checkRows(a.seoChecks)] },
			{ label: "Readability", blocks: [checkRows(a.readabilityChecks)] },
		],
	});

	blocks.push({ type: "header", text: "Apply recommendations" });
	blocks.push({
		type: "form",
		block_id: "suggestions",
		fields: [
			{
				type: "text_input",
				action_id: "seo_title",
				label: "Suggested SEO title",
				initial_value: a.suggestedSeoTitle,
			},
			{
				type: "text_input",
				action_id: "seo_description",
				label: "Suggested meta description",
				multiline: true,
				initial_value: a.suggestedSeoDescription,
			},
		],
		submit: { action_id: "apply_seo", label: "Apply to saved SEO" },
	});

	blocks.push({
		type: "actions",
		elements: [
			{ type: "button", action_id: "suggest_title_draft", label: "Patch draft title" },
		],
	});

	blocks.push({
		type: "accordion",
		label: "Saved SEO values",
		blocks: [
			{
				type: "fields",
				fields: [
					{ label: "SEO title", value: opts.seoTitle || "Not set" },
					{ label: "Meta description", value: opts.seoDescription || "Not set" },
					{ label: "Robots", value: opts.noIndex ? "noindex" : "index, follow" },
				],
			},
		],
	});

	return { blocks };
}
