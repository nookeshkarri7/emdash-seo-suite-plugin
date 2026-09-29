import type { BlockResponse } from "@emdash-cms/blocks";

export function buildOverviewWidget(opts: {
	organizationName: string;
	publishPolicy: string;
}): BlockResponse {
	return {
		blocks: [
			{ type: "header", text: "SEO Suite" },
			{
				type: "fields",
				fields: [
					{ label: "Organization", value: opts.organizationName || "Not set" },
					{ label: "Publish policy", value: opts.publishPolicy },
				],
			},
			{
				type: "actions",
				elements: [
					{
						type: "link",
						label: "Settings",
						target: { kind: "plugin-page", path: "/settings" },
					},
					{
						type: "link",
						label: "Health",
						target: { kind: "plugin-page", path: "/health" },
					},
				],
			},
		],
	};
}
