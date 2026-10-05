import type { BlockResponse } from "@emdash-cms/blocks";

import type { SiteSeoSettings } from "../schema/jsonld.js";

export function buildSettingsPage(settings: SiteSeoSettings): BlockResponse {
	const trackedCollections = settings.collectionsCsv
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	const configured = [
		Boolean(settings.organizationName),
		trackedCollections.length > 0,
		Boolean(settings.schemaType),
		Boolean(settings.publishPolicy),
	].filter(Boolean).length;

	return {
		blocks: [
			{ type: "header", text: "SEO Suite settings" },
			{
				type: "section",
				text: "Configure structured data, publishing safeguards, and the collections included in site-wide health scans.",
			},
			{
				type: "meter",
				label: "Essential setup",
				value: configured,
				max: 4,
				custom_value: `${configured} of 4 configured`,
			},
			{
				type: "stats",
				items: [
					{
						label: "Tracked collections",
						value: trackedCollections.length,
						description: trackedCollections.join(", ") || "None",
					},
					{ label: "Schema", value: settings.schemaType },
					{
						label: "Publish guard",
						value:
							settings.publishPolicy === "block"
								? "Blocking"
								: settings.publishPolicy === "warn"
									? "Warning"
									: "Off",
					},
				],
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
						placeholder: "Your public brand or company name",
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
						label: "Collections to scan (comma-separated slugs)",
						initial_value: settings.collectionsCsv,
						placeholder: "posts,pages",
					},
				],
				submit: { action_id: "save_settings", label: "Save settings" },
			},
			{
				type: "context",
				text: "EmDash core serves sitemap.xml and robots.txt. Configure the site URL in EmDash so canonical and structured-data URLs are absolute.",
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
						label: "Manage redirects",
						target: { kind: "plugin-page", path: "/redirects" },
					},
				],
			},
		],
	};
}
