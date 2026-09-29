import type { PluginContext } from "emdash/plugin";

import { buildPageMetadata, type PageMetadataContribution } from "../schema/jsonld.js";
import { loadSettings } from "../settings.js";

export async function handlePageMetadata(
	event: {
		page: {
			kind: "content" | "custom";
			url: string;
			path: string;
			title: string | null;
			pageTitle?: string | null;
			description: string | null;
			canonical: string | null;
			image: string | null;
			siteName?: string;
			breadcrumbs?: Array<{ name: string; url: string }>;
			content?: { collection: string; id: string; slug: string | null };
			articleMeta?: {
				publishedTime?: string | null;
				modifiedTime?: string | null;
				author?: string | null;
			};
		};
	},
	ctx: PluginContext,
): Promise<PageMetadataContribution[] | null> {
	const settings = await loadSettings(ctx);
	return buildPageMetadata({ settings, page: event.page });
}
