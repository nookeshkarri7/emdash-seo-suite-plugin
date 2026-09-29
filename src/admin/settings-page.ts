import type { BlockResponse } from "@emdash-cms/blocks";

import type { SiteSeoSettings } from "../schema/jsonld.js";

export function buildSettingsPage(settings: SiteSeoSettings): BlockResponse {
	return {
		blocks: [
			{ type: "header", text: "SEO Suite settings" },
			{
				type: "section",
				text: "Site-wide defaults for JSON-LD, publish policy, and which collections show the editor panel declaration (restart/reinstall may be required for panel collection changes — remount panels via plugin updates).",
			},
			{
				type: "section",
				text: "Core EmDash already generates `/sitemap.xml` and `robots.txt`. Configure `siteUrl` in the site for absolute URLs.",
			},
			{
				type: "form",
				block_id: "seo_settings",
				fields: [
					{
						type: "text_input",
						action_id: "organizationName",
						label: "Organization name",
						initial_value: settings.organizationName,
					},
					{
						type: "select",
						action_id: "schemaType",
						label: "Default content schema",
						options: [
							{ label: "BlogPosting", value: "BlogPosting" },
							{ label: "Article", value: "Article" },
						],
						initial_value: settings.schemaType,
					},
					{
						type: "select",
						action_id: "publishPolicy",
						label: "Publish policy",
						options: [
							{ label: "Off", value: "off" },
							{ label: "Warn (log only)", value: "warn" },
							{ label: "Block missing meta description", value: "block" },
						],
						initial_value: settings.publishPolicy,
					},
					{
						type: "text_input",
						action_id: "twitterHandle",
						label: "Twitter / X handle",
						initial_value: settings.twitterHandle,
						placeholder: "without @",
					},
					{
						type: "text_input",
						action_id: "collectionsCsv",
						label: "Tracked collections (comma-separated)",
						initial_value: settings.collectionsCsv,
						placeholder: "posts,pages",
					},
				],
				submit: { action_id: "save_settings", label: "Save settings" },
			},
			{
				type: "section",
				text: "Core endpoints (owned by EmDash): `/sitemap.xml`, `/sitemap-{collection}.xml`, `/robots.txt`.",
			},
		],
	};
}
