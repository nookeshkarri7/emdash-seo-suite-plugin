import type { BlockResponse } from "@emdash-cms/blocks";

export interface RedirectRow {
	id: string;
	source: string;
	destination: string;
	type: string;
	enabled: boolean;
	_rev: string;
}

export function buildRedirectsPage(opts: {
	redirects: RedirectRow[];
	message?: string;
}): BlockResponse {
	const blocks: BlockResponse["blocks"] = [
		{ type: "header", text: "Redirect manager" },
		{
			type: "section",
			text: "Preserve traffic and backlinks when URLs move. Use permanent redirects for lasting moves and temporary redirects for short-lived changes.",
		},
		{
			type: "stats",
			items: [
				{ label: "Total", value: opts.redirects.length },
				{
					label: "Active",
					value: opts.redirects.filter((redirect) => redirect.enabled).length,
				},
				{
					label: "Permanent",
					value: opts.redirects.filter((redirect) =>
						["301", "308"].includes(redirect.type),
					).length,
				},
			],
		},
	];

	if (opts.message) {
		blocks.push({
			type: "banner",
			variant: "default",
			title: opts.message,
		});
	}

	blocks.push({
		type: "form",
		block_id: "create_redirect",
		fields: [
			{
				type: "text_input",
				action_id: "source",
				label: "Source path",
				placeholder: "/old-path",
			},
			{
				type: "text_input",
				action_id: "destination",
				label: "Destination",
				placeholder: "/new-path",
			},
			{
				type: "select",
				action_id: "type",
				label: "Status",
				options: [
					{ label: "301 Permanent", value: "301" },
					{ label: "302 Temporary", value: "302" },
					{ label: "307 Temporary (preserve method)", value: "307" },
					{ label: "308 Permanent (preserve method)", value: "308" },
				],
				initial_value: "301",
			},
		],
		submit: { action_id: "create_redirect", label: "Create redirect" },
	});

	if (opts.redirects.length === 0) {
		blocks.push({
			type: "empty",
			title: "No redirects yet",
			description: "Add a source and destination above.",
		});
		return { blocks };
	}

	blocks.push({
		type: "table",
		block_id: "redirects_table",
		page_action_id: "redirects_page",
		columns: [
			{ key: "source", label: "Source" },
			{ key: "destination", label: "Destination" },
			{ key: "type", label: "Type", format: "badge" },
			{ key: "enabled", label: "Status", format: "badge" },
			{ key: "remove", label: "", format: "element" },
		],
		rows: opts.redirects.map((row) => ({
			source: row.source,
			destination: row.destination,
			type: row.type,
			enabled: row.enabled ? "Active" : "Disabled",
			remove: {
				type: "button",
				action_id: "delete_redirect",
				label: "Delete",
				style: "danger",
				value: { id: row.id, _rev: row._rev },
				confirm: {
					title: "Delete redirect?",
					text: `${row.source} will stop redirecting to ${row.destination}.`,
					confirm: "Delete",
					deny: "Cancel",
					style: "danger",
				},
			},
		})),
	});

	return { blocks };
}
