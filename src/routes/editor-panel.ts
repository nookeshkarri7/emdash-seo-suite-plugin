import type { BlockResponse, EditorDraftSnapshot } from "@emdash-cms/blocks";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";

import { buildAnalysisPanel } from "../admin/panel.js";
import { runFullAnalysis } from "../analysis/score.js";
import { extractContent } from "../analysis/text.js";
import { getFocusKeyphrase, setFocusKeyphrase } from "../settings.js";

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function getDraft(input: unknown): EditorDraftSnapshot | undefined {
	const record = asRecord(input);
	const draft = record?.draft;
	if (!draft || typeof draft !== "object") return undefined;
	return draft as EditorDraftSnapshot;
}

async function loadPanelState(
	ctx: PluginContext,
	collection: string,
	entryId: string,
	draft?: EditorDraftSnapshot,
) {
	const saved = ctx.content ? await ctx.content.get(collection, entryId) : null;
	const fields = draft?.fields ?? {};
	const title = asString(fields.title) || asString(saved?.data.title);
	const excerpt = asString(fields.excerpt) || asString(saved?.data.excerpt);
	const content = fields.content ?? saved?.data.content;
	const extracted = extractContent({
		title,
		excerpt,
		content,
		slug: saved?.slug,
	});
	const focusKeyphrase = await getFocusKeyphrase(ctx, collection, entryId);
	const seo = {
		title: saved?.seo?.title ?? null,
		description: saved?.seo?.description ?? null,
		image: saved?.seo?.image ?? null,
		canonical: saved?.seo?.canonical ?? null,
		noIndex: saved?.seo?.noIndex ?? false,
	};
	const hasFeaturedImage = Boolean(
		saved?.data.featured_image &&
			typeof saved.data.featured_image === "object" &&
			asString((saved.data.featured_image as Record<string, unknown>).src),
	);

	const analysis = runFullAnalysis({
		content: extracted,
		seo,
		focusKeyphrase,
		hasFeaturedImage,
	});

	return {
		focusKeyphrase,
		analysis,
		seo,
		extracted,
	};
}

export async function handleEditorAnalysisRoute(
	routeCtx: SandboxedRouteContext,
	ctx: PluginContext,
): Promise<BlockResponse> {
	const entry = routeCtx.ui && "entry" in routeCtx.ui ? routeCtx.ui.entry : null;
	if (!entry) {
		return {
			blocks: [
				{ type: "banner", variant: "error", title: "Missing entry context" },
			],
		};
	}

	const input = asRecord(routeCtx.input) ?? { type: "panel_load" };
	const type = asString(input.type) || "panel_load";
	const action = asString(input.action_id);
	const values = asRecord(input.values) ?? {};
	const draft = getDraft(input);

	if (type === "panel_load") {
		const focusKeyphrase = await getFocusKeyphrase(ctx, entry.collection, entry.id);
		const saved = ctx.content ? await ctx.content.get(entry.collection, entry.id) : null;
		return buildAnalysisPanel({
			focusKeyphrase,
			analysis: null,
			seoTitle: saved?.seo?.title ?? "",
			seoDescription: saved?.seo?.description ?? "",
			noIndex: saved?.seo?.noIndex ?? false,
		});
	}

	if (type === "form_submit" && action === "save_focus") {
		await setFocusKeyphrase(
			ctx,
			entry.collection,
			entry.id,
			asString(values.focus_keyphrase),
		);
		const state = await loadPanelState(ctx, entry.collection, entry.id, draft);
		return {
			...buildAnalysisPanel({
				focusKeyphrase: state.focusKeyphrase,
				analysis: state.analysis,
				seoTitle: state.seo.title ?? "",
				seoDescription: state.seo.description ?? "",
				noIndex: state.seo.noIndex,
			}),
			toast: { type: "success", message: "Focus keyphrase saved" },
		};
	}

	if (type === "form_submit" && action === "apply_seo") {
		if (!ctx.content || !("update" in ctx.content) || !ctx.content.update) {
			return {
				blocks: [{ type: "banner", variant: "error", title: "content:write unavailable" }],
			};
		}
		const seoTitle = asString(values.seo_title);
		const seoDescription = asString(values.seo_description);
		await ctx.content.update(entry.collection, entry.id, {
			seo: {
				title: seoTitle || null,
				description: seoDescription || null,
			},
		});
		const state = await loadPanelState(ctx, entry.collection, entry.id, draft);
		return {
			...buildAnalysisPanel({
				focusKeyphrase: state.focusKeyphrase,
				analysis: state.analysis,
				seoTitle: state.seo.title ?? "",
				seoDescription: state.seo.description ?? "",
				noIndex: state.seo.noIndex,
			}),
			toast: { type: "success", message: "Saved SEO fields updated" },
		};
	}

	if (type === "block_action" && action === "suggest_title_draft") {
		const state = await loadPanelState(ctx, entry.collection, entry.id, draft);
		return {
			...buildAnalysisPanel({
				focusKeyphrase: state.focusKeyphrase,
				analysis: state.analysis,
				seoTitle: state.seo.title ?? "",
				seoDescription: state.seo.description ?? "",
				noIndex: state.seo.noIndex,
			}),
			toast: { type: "info", message: "Draft title suggestion ready for preview" },
			patch: {
				type: "editor-draft-patch",
				operations: [
					{
						op: "set",
						field: "title",
						value: state.analysis.suggestedSeoTitle,
					},
				],
			},
		};
	}

	// analyze button or any other explicit interaction
	const state = await loadPanelState(ctx, entry.collection, entry.id, draft);
	return buildAnalysisPanel({
		focusKeyphrase: state.focusKeyphrase,
		analysis: state.analysis,
		seoTitle: state.seo.title ?? "",
		seoDescription: state.seo.description ?? "",
		noIndex: state.seo.noIndex,
	});
}
