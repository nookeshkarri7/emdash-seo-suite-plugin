import type { BlockResponse } from "@emdash-cms/blocks";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";

import { buildHealthPage, type HealthIssue } from "../admin/health.js";
import { buildOverviewWidget } from "../admin/overview.js";
import { buildRedirectsPage } from "../admin/redirects.js";
import { buildSettingsPage } from "../admin/settings-page.js";
import { parseCollections, type SiteSeoSettings } from "../schema/jsonld.js";
import { getFocusKeyphrase, loadSettings, saveSettings } from "../settings.js";

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function interactionPage(input: unknown): string {
	if (!input || typeof input !== "object") return "/settings";
	const record = input as Record<string, unknown>;
	if (typeof record.page === "string") return record.page;
	return "/settings";
}

function interactionType(input: unknown): string {
	if (!input || typeof input !== "object") return "page_load";
	return asString((input as Record<string, unknown>).type) || "page_load";
}

function interactionAction(input: unknown): string {
	if (!input || typeof input !== "object") return "";
	return asString((input as Record<string, unknown>).action_id);
}

function interactionValues(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object") return {};
	const values = (input as Record<string, unknown>).values;
	return values && typeof values === "object" && !Array.isArray(values)
		? (values as Record<string, unknown>)
		: {};
}

function interactionValue(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== "object") return {};
	const value = (input as Record<string, unknown>).value;
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

async function listRedirectRows(ctx: PluginContext) {
	if (!ctx.redirects?.list || !ctx.redirects.get) return [];
	const listed = await ctx.redirects.list({ limit: 50 });
	const rows = [];
	for (const redirect of listed.items) {
		const versioned = await ctx.redirects.get(redirect.id);
		if (!versioned) continue;
		rows.push({
			id: versioned.redirect.id,
			source: versioned.redirect.source,
			destination: versioned.redirect.destination,
			type: String(versioned.redirect.type),
			enabled: versioned.redirect.enabled,
			_rev: versioned._rev,
		});
	}
	return rows;
}

async function scanHealth(ctx: PluginContext, settings: SiteSeoSettings) {
	const configured = parseCollections(settings.collectionsCsv);
	const issues: HealthIssue[] = [];
	let scanned = 0;

	let known = new Set<string>();
	try {
		if (ctx.schema?.listCollections) {
			const collections = await ctx.schema.listCollections();
			known = new Set(collections.map((c) => c.slug));
		}
	} catch {
		known = new Set();
	}

	const targets =
		known.size === 0 ? [] : configured.filter((slug) => known.has(slug));

	for (const collection of targets) {
		if (!ctx.content?.list) continue;
		try {
			const page = await ctx.content.list(collection, {
				limit: 40,
				where: { status: "published" },
			});
			for (const item of page.items) {
				scanned += 1;
				const problems: string[] = [];
				const title =
					typeof item.data.title === "string" ? item.data.title : item.slug ?? item.id;
				const description = item.seo?.description?.trim() || "";
				const excerpt = typeof item.data.excerpt === "string" ? item.data.excerpt.trim() : "";
				if (!description && !excerpt) problems.push("missing description");
				if (item.seo?.noIndex) problems.push("noindex");
				if (!item.seo?.image) problems.push("missing OG image");
				const focus = await getFocusKeyphrase(ctx, collection, item.id);
				if (!focus) problems.push("missing focus keyphrase");
				if (problems.length > 0) {
					issues.push({
						collection,
						id: item.id,
						title,
						locale: item.locale,
						problems,
					});
				}
			}
		} catch (error) {
			ctx.log.warn("SEO health scan skipped collection", {
				collection,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return { issues, scanned };
}

export async function handleAdminRoute(
	routeCtx: SandboxedRouteContext,
	ctx: PluginContext,
): Promise<BlockResponse> {
	const surface = routeCtx.ui?.surface;
	const settings = await loadSettings(ctx);
	const type = interactionType(routeCtx.input);
	const action = interactionAction(routeCtx.input);
	const values = interactionValues(routeCtx.input);
	const value = interactionValue(routeCtx.input);
	const page = interactionPage(routeCtx.input);

	if (surface === "dashboard-widget") {
		const { issues, scanned } = await scanHealth(ctx, settings);
		return buildOverviewWidget({
			organizationName: settings.organizationName,
			publishPolicy: settings.publishPolicy,
			issues,
			scanned,
		});
	}

	if (type === "form_submit" && action === "save_settings") {
		const next = await saveSettings(ctx, {
			organizationName: asString(values.organizationName),
			schemaType: asString(values.schemaType) === "Article" ? "Article" : "BlogPosting",
			publishPolicy:
				asString(values.publishPolicy) === "off" ||
				asString(values.publishPolicy) === "block"
					? (asString(values.publishPolicy) as "off" | "block")
					: "warn",
			twitterHandle: asString(values.twitterHandle),
			collectionsCsv: asString(values.collectionsCsv),
		});
		return {
			...buildSettingsPage(next),
			toast: { type: "success", message: "SEO settings saved" },
		};
	}

	if (page.includes("redirects") || page.endsWith("/redirects")) {
		let message: string | undefined;

		if (type === "form_submit" && action === "create_redirect") {
			try {
				if (!ctx.redirects || !("create" in ctx.redirects) || !ctx.redirects.create) {
					throw new Error("redirects:write is unavailable");
				}
				const typeValue = Number(asString(values.type) || "301") as 301 | 302 | 307 | 308;
				await ctx.redirects.create({
					source: asString(values.source),
					destination: asString(values.destination),
					type: typeValue,
					enabled: true,
				});
				message = "Redirect created";
			} catch (error) {
				message = error instanceof Error ? error.message : "Failed to create redirect";
			}
		}

		if (
			(type === "form_submit" || type === "block_action") &&
			action === "delete_redirect"
		) {
			try {
				if (!ctx.redirects || !("delete" in ctx.redirects) || !ctx.redirects.delete) {
					throw new Error("redirects:write is unavailable");
				}
				await ctx.redirects.delete(asString(value.id) || asString(values.redirect_id), {
					_rev: asString(value._rev) || asString(values._rev),
				});
				message = "Redirect deleted";
			} catch (error) {
				message = error instanceof Error ? error.message : "Failed to delete redirect";
			}
		}

		const redirects = await listRedirectRows(ctx);
		return {
			...buildRedirectsPage({ redirects, message }),
			toast: message
				? {
						type: message.toLowerCase().includes("fail") ? "error" : "success",
						message,
					}
				: undefined,
		};
	}

	if (page.includes("health") || page.endsWith("/health") || action === "refresh_health") {
		const { issues, scanned } = await scanHealth(ctx, settings);
		return buildHealthPage({ issues, scanned });
	}

	return buildSettingsPage(settings);
}
