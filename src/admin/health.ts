import type { BlockResponse } from "@emdash-cms/blocks";

export interface HealthIssue {
	collection: string;
	id: string;
	title: string;
	locale: string | null;
	problems: string[];
}

export function buildHealthPage(opts: {
	issues: HealthIssue[];
	scanned: number;
}): BlockResponse {
	const healthy = Math.max(0, opts.scanned - opts.issues.length);
	const score = opts.scanned === 0 ? 0 : Math.round((healthy / opts.scanned) * 100);
	const problemCounts = new Map<string, number>();
	for (const issue of opts.issues) {
		for (const problem of issue.problems) {
			problemCounts.set(problem, (problemCounts.get(problem) ?? 0) + 1);
		}
	}
	const recommendations = [
		["missing description", "Write unique meta descriptions"],
		["noindex", "Review accidental noindex flags"],
		["missing OG image", "Add social sharing images"],
		["missing focus keyphrase", "Set focus keyphrases in the editor"],
	] as const;

	const blocks: BlockResponse["blocks"] = [
		{ type: "header", text: "SEO health" },
		{
			type: "section",
			text: "A prioritized view of published content that may reduce search visibility or click-through rate.",
		},
		{
			type: "meter",
			label: "Content health score",
			value: score,
			max: 100,
			custom_value: opts.scanned === 0 ? "No entries scanned" : `${score}% healthy`,
		},
		{
			type: "stats",
			items: [
				{ label: "Scanned", value: String(opts.scanned) },
				{ label: "Healthy", value: String(healthy) },
				{ label: "Need attention", value: String(opts.issues.length) },
				{
					label: "Critical",
					value: String(
						(problemCounts.get("missing description") ?? 0) +
							(problemCounts.get("noindex") ?? 0),
					),
					description: "Missing description or noindex",
				},
			],
		},
		{
			type: "actions",
			elements: [
				{ type: "button", action_id: "refresh_health", label: "Refresh", style: "primary" },
			],
		},
		{ type: "context", text: "Scans up to 40 published entries per tracked collection." },
	];

	if (opts.scanned === 0) {
		blocks.push({
			type: "banner",
			variant: "alert",
			title: "Nothing was scanned",
			description:
				"Check that tracked collection slugs match existing collections and contain published entries.",
		});
	}

	if (opts.issues.length === 0) {
		blocks.push({
			type: "empty",
			title: "Looking healthy",
			description: "No missing descriptions, focus keyphrases, images, or accidental noindex flags in the scanned set.",
			actions: [
				{
					type: "link",
					label: "Review settings",
					target: { kind: "plugin-page", path: "/settings" },
				},
			],
		});
		return { blocks };
	}

	blocks.push({ type: "header", text: "Recommended next steps" });
	blocks.push({
		type: "fields",
		fields: recommendations
			.filter(([problem]) => problemCounts.has(problem))
			.map(([problem, label]) => ({
				label,
				value: `${problemCounts.get(problem)} ${problemCounts.get(problem) === 1 ? "entry" : "entries"}`,
			})),
	});

	blocks.push({ type: "header", text: "Entries needing attention" });
	blocks.push({
		type: "table",
		block_id: "health_table",
		page_action_id: "health_page",
		columns: [
			{ key: "title", label: "Entry" },
			{ key: "collection", label: "Collection" },
			{ key: "problems", label: "Problems" },
			{ key: "open", label: "", format: "element" },
		],
		rows: opts.issues.map((issue) => ({
			title: issue.title || issue.id,
			collection: issue.collection,
			problems: issue.problems.join("; "),
			open: {
				type: "link",
				label: "Open",
				target: {
					kind: "content",
					collection: issue.collection,
					id: issue.id,
					locale: issue.locale ?? undefined,
				},
			},
		})),
	});

	return { blocks };
}
