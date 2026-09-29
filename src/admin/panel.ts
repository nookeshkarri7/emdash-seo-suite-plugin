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
	blocks.push({
		type: "stats",
		items: [
			{ label: "SEO", value: statusEmoji(a.overall) },
			{ label: "Readability", value: statusEmoji(a.readabilityOverall) },
		],
	});

	blocks.push({ type: "header", text: "Search snippet preview" });
	blocks.push({
		type: "section",
		text: `*${a.snippetTitle}*\n${a.snippetUrl}\n${a.snippetDescription || "—"}`,
	});

	blocks.push({ type: "header", text: "SEO checklist" });
	blocks.push(checkRows(a.seoChecks));

	blocks.push({ type: "header", text: "Readability" });
	blocks.push(checkRows(a.readabilityChecks));

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
		type: "section",
		text: `Indexability: ${opts.noIndex ? "noindex" : "indexable"}\nSaved SEO title: ${opts.seoTitle || "—"}\nSaved SEO description: ${opts.seoDescription || "—"}`,
	});

	return { blocks };
}
