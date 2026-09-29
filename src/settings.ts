import type { PluginContext } from "emdash/plugin";

import { DEFAULT_SETTINGS, type SiteSeoSettings } from "./schema/jsonld.js";

export async function loadSettings(ctx: PluginContext): Promise<SiteSeoSettings> {
	const [
		organizationName,
		schemaType,
		publishPolicy,
		twitterHandle,
		collectionsCsv,
	] = await Promise.all([
		ctx.settings.get<string>("organizationName"),
		ctx.settings.get<string>("schemaType"),
		ctx.settings.get<string>("publishPolicy"),
		ctx.settings.get<string>("twitterHandle"),
		ctx.settings.get<string>("collectionsCsv"),
	]);

	const schema =
		schemaType === "Article" || schemaType === "BlogPosting"
			? schemaType
			: DEFAULT_SETTINGS.schemaType;
	const policy =
		publishPolicy === "off" || publishPolicy === "warn" || publishPolicy === "block"
			? publishPolicy
			: DEFAULT_SETTINGS.publishPolicy;

	return {
		organizationName: organizationName?.trim() || DEFAULT_SETTINGS.organizationName,
		schemaType: schema,
		publishPolicy: policy,
		twitterHandle: twitterHandle?.trim() || DEFAULT_SETTINGS.twitterHandle,
		collectionsCsv: collectionsCsv?.trim() || DEFAULT_SETTINGS.collectionsCsv,
	};
}

export async function saveSettings(
	ctx: PluginContext,
	next: Partial<SiteSeoSettings>,
): Promise<SiteSeoSettings> {
	const current = await loadSettings(ctx);
	const merged: SiteSeoSettings = { ...current, ...next };
	await Promise.all([
		ctx.settings.set("organizationName", merged.organizationName),
		ctx.settings.set("schemaType", merged.schemaType),
		ctx.settings.set("publishPolicy", merged.publishPolicy),
		ctx.settings.set("twitterHandle", merged.twitterHandle),
		ctx.settings.set("collectionsCsv", merged.collectionsCsv),
	]);
	return merged;
}

export function focusKey(collection: string, entryId: string): string {
	return `focus:${collection}:${entryId}`;
}

export async function getFocusKeyphrase(
	ctx: PluginContext,
	collection: string,
	entryId: string,
): Promise<string> {
	return (await ctx.kv.get<string>(focusKey(collection, entryId)))?.trim() ?? "";
}

export async function setFocusKeyphrase(
	ctx: PluginContext,
	collection: string,
	entryId: string,
	keyphrase: string,
): Promise<void> {
	const value = keyphrase.trim();
	if (!value) {
		await ctx.kv.delete(focusKey(collection, entryId));
		return;
	}
	await ctx.kv.set(focusKey(collection, entryId), value);
}
