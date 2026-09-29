import type { PageMetadataEvent, PluginContext } from "emdash/plugin";

import { buildPageMetadata } from "../schema/jsonld.js";
import { loadSettings } from "../settings.js";

export async function handlePageMetadata(event: PageMetadataEvent, ctx: PluginContext) {
	const settings = await loadSettings(ctx);
	return buildPageMetadata({ settings, page: event.page });
}
