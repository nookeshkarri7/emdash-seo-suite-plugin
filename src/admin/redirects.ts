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
			text: "Create and maintain redirects. Pass host revisions carefully — stale edits return a conflict.",
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
		columns: [
			{ key: "source", label: "Source" },
			{ key: "destination", label: "Destination" },
			{ key: "type", label: "Type" },
			{ key: "enabled", label: "Enabled" },
		],
		rows: opts.redirects.map((row) => ({
			source: row.source,
			destination: row.destination,
			type: row.type,
			enabled: row.enabled ? "yes" : "no",
		})),
	});

	blocks.push({
		type: "form",
		block_id: "delete_redirect",
		fields: [
			{
				type: "text_input",
				action_id: "redirect_id",
				label: "Redirect ID to delete",
				placeholder: "Paste an ID from above listing helpers",
			},
			{
				type: "text_input",
				action_id: "_rev",
				label: "Revision (_rev)",
			},
		],
		submit: { action_id: "delete_redirect", label: "Delete redirect" },
	});

	blocks.push({
		type: "code",
		language: "json",
		code: JSON.stringify(
			opts.redirects.map((r) => ({
				id: r.id,
				source: r.source,
				_rev: r._rev,
			})),
			null,
			2,
		),
	});

	return { blocks };
}
