import type { ContentPolicyDecision, ContentPolicyEvent, PluginContext } from "emdash/plugin";

import { parseCollections } from "../schema/jsonld.js";
import { getFocusKeyphrase, loadSettings } from "../settings.js";

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

export async function handleBeforePublish(
	event: ContentPolicyEvent,
	ctx: PluginContext,
): Promise<ContentPolicyDecision> {
	const settings = await loadSettings(ctx);
	if (settings.publishPolicy === "off") return;

	const collections = parseCollections(settings.collectionsCsv);
	if (!collections.includes(event.collection)) return;

	const content = event.content;
	const id = asString(content.id);
	const seo =
		content.seo && typeof content.seo === "object"
			? (content.seo as Record<string, unknown>)
			: null;
	const description = asString(seo?.description).trim();
	const excerpt = asString(content.excerpt).trim();
	const hasDescription = Boolean(description || excerpt);
	const focus = id ? await getFocusKeyphrase(ctx, event.collection, id) : "";

	const problems: string[] = [];
	if (!hasDescription) problems.push("missing SEO/meta description");
	if (!focus) problems.push("missing focus keyphrase");

	if (problems.length === 0) return;

	const reason = `SEO Suite: ${problems.join("; ")}`;
	if (settings.publishPolicy === "warn") {
		ctx.log.warn(reason, { collection: event.collection, id });
		return;
	}

	if (!hasDescription) {
		return { cancel: true, reason };
	}

	ctx.log.warn(reason, { collection: event.collection, id });
}
