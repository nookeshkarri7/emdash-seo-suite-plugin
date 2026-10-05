import type { BlockResponse } from "@emdash-cms/blocks";

import type { HealthIssue } from "./health.js";

export function buildOverviewWidget(opts: {
	organizationName: string;
	publishPolicy: string;
	issues: HealthIssue[];
	scanned: number;
}): BlockResponse {
	const healthy = Math.max(0, opts.scanned - opts.issues.length);
	const score = opts.scanned === 0 ? 0 : Math.round((healthy / opts.scanned) * 100);
	const critical = opts.issues.filter((issue) =>
		issue.problems.some((problem) =>
			["missing description", "noindex"].includes(problem),
		),
	).length;

	return {
		blocks: [
			{ type: "header", text: "SEO Suite" },
			{
				type: "meter",
				label: "Published content health",
				value: score,
				max: 100,
				custom_value: opts.scanned === 0 ? "No entries scanned" : `${score}% healthy`,
			},
			{
				type: "stats",
				items: [
					{ label: "Scanned", value: opts.scanned },
					{ label: "Need attention", value: opts.issues.length },
					{ label: "Critical", value: critical },
				],
			},
			{
				type: "fields",
				fields: [
					{ label: "Organization", value: opts.organizationName || "Not set" },
					{
						label: "Publish policy",
						value:
							opts.publishPolicy === "block"
								? "Block missing descriptions"
								: opts.publishPolicy === "warn"
									? "Warn only"
									: "Off",
					},
				],
			},
			{
				type: "actions",
				elements: [
					{
						type: "link",
						label: "Review SEO health",
						appearance: "primary",
						target: { kind: "plugin-page", path: "/health" },
					},
					{
						type: "link",
						label: "Settings",
						target: { kind: "plugin-page", path: "/settings" },
					},
				],
			},
		],
	};
}
