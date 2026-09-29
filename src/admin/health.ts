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
	const blocks: BlockResponse["blocks"] = [
		{ type: "header", text: "SEO health" },
		{
			type: "section",
			text: `Scanned ${opts.scanned} published entries. EmDash still owns sitemap generation — this dashboard surfaces content that may hurt discoverability.`,
		},
		{
			type: "stats",
			items: [
				{ label: "Scanned", value: String(opts.scanned) },
				{ label: "Issues", value: String(opts.issues.length) },
			],
		},
		{
			type: "actions",
			elements: [
				{ type: "button", action_id: "refresh_health", label: "Refresh", style: "primary" },
			],
		},
		{
			type: "section",
			text: "Sitemap remains at `/sitemap.xml` (EmDash core).",
		},
	];

	if (opts.issues.length === 0) {
		blocks.push({
			type: "empty",
			title: "Looking healthy",
			description: "No missing descriptions, focus keyphrases, images, or accidental noindex flags in the scanned set.",
		});
		return { blocks };
	}

	blocks.push({
		type: "table",
		block_id: "health_table",
		columns: [
			{ key: "title", label: "Entry" },
			{ key: "collection", label: "Collection" },
			{ key: "problems", label: "Problems" },
		],
		rows: opts.issues.map((issue) => ({
			title: issue.title || issue.id,
			collection: issue.collection,
			problems: issue.problems.join("; "),
		})),
	});

	blocks.push({ type: "header", text: "Open entries" });
	blocks.push({
		type: "actions",
		elements: opts.issues.slice(0, 8).map((issue) => ({
			type: "link" as const,
			label: issue.title || issue.id,
			target: {
				kind: "content" as const,
				collection: issue.collection,
				id: issue.id,
				locale: issue.locale ?? undefined,
			},
		})),
	});

	return { blocks };
}
