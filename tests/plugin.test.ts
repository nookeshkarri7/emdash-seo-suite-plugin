import { afterEach, describe, expect, it } from "vitest";

import { createPluginTestHost, type PluginTestHost } from "@emdash-cms/plugin-test";

import { buildHealthPage } from "../src/admin/health.js";
import { buildAnalysisPanel } from "../src/admin/panel.js";
import { buildRedirectsPage } from "../src/admin/redirects.js";
import { analyzeReadability } from "../src/analysis/readability.js";
import { analyzeSeo } from "../src/analysis/seo.js";
import { runFullAnalysis } from "../src/analysis/score.js";
import { extractContent, keyphraseDensity } from "../src/analysis/text.js";
import { buildPageMetadata } from "../src/schema/jsonld.js";

let host: PluginTestHost | undefined;

afterEach(async () => {
	await host?.dispose();
	host = undefined;
});

describe("analysis engine", () => {
	it("extracts portable text signals", () => {
		const extracted = extractContent({
			title: "EmDash SEO plugins",
			excerpt: "A guide to SEO Suite",
			slug: "emdash-seo-plugins",
			content: [
				{
					_type: "block",
					style: "normal",
					children: [{ _type: "span", text: "EmDash SEO plugins help editors." }],
					markDefs: [{ _type: "link", href: "/posts/other" }],
				},
				{
					_type: "block",
					style: "h2",
					children: [{ _type: "span", text: "Why EmDash SEO plugins matter" }],
					markDefs: [],
				},
				{
					_type: "image",
					alt: "Dashboard",
				},
			],
		});

		expect(extracted.wordCount).toBeGreaterThan(5);
		expect(extracted.headings).toContain("Why EmDash SEO plugins matter");
		expect(extracted.hasInternalLink).toBe(true);
		expect(extracted.imageCount).toBe(1);
		expect(keyphraseDensity(extracted.bodyText, "EmDash SEO")).toBeGreaterThan(0);
	});

	it("scores SEO and readability", () => {
		const content = extractContent({
			title: "EmDash SEO plugins for publishers",
			excerpt:
				"EmDash SEO plugins help publishers improve focus keyphrase coverage, meta descriptions, and readability across their content library with practical checklists.",
			slug: "emdash-seo-plugins",
			content:
				"EmDash SEO plugins are useful. However, editors still need clear introductions. Therefore write shorter sentences. Additionally use headings.\n\n" +
				"Next, add internal links. Then cite an external source at https://example.com/docs. Finally ship the checklist.",
		});

		const seo = analyzeSeo({
			content,
			seo: {
				title: "EmDash SEO plugins for publishers",
				description:
					"EmDash SEO plugins help publishers improve focus keyphrase coverage and meta descriptions with practical checklists for every entry.",
				image: "media_1",
				canonical: null,
				noIndex: false,
			},
			focusKeyphrase: "EmDash SEO plugins",
			hasFeaturedImage: true,
		});

		expect(seo.seoChecks.some((c) => c.id === "focus-keyphrase" && c.status === "good")).toBe(
			true,
		);
		expect(seo.seoChecks.length).toBeGreaterThan(5);
		expect(seo.suggestedSeoTitle.length).toBeGreaterThan(0);

		const readability = analyzeReadability(content);
		expect(readability.length).toBeGreaterThan(0);

		const full = runFullAnalysis({
			content,
			seo: {
				title: "EmDash SEO plugins for publishers",
				description:
					"EmDash SEO plugins help publishers improve focus keyphrase coverage and meta descriptions with practical checklists for every entry.",
				image: "media_1",
				canonical: null,
				noIndex: false,
			},
			focusKeyphrase: "EmDash SEO plugins",
		});
		expect(full.readabilityChecks.length).toBeGreaterThan(0);
	});
});

describe("json-ld builder", () => {
	it("emits website, article, and breadcrumb graphs", () => {
		const contributions = buildPageMetadata({
			settings: {
				organizationName: "Example Org",
				schemaType: "BlogPosting",
				publishPolicy: "warn",
				twitterHandle: "example",
				collectionsCsv: "posts,pages",
			},
			page: {
				kind: "content",
				url: "https://example.com/posts/hello",
				path: "/posts/hello",
				title: "Hello | Example",
				pageTitle: "Hello",
				description: "A post",
				canonical: "https://example.com/posts/hello",
				image: "https://example.com/og.png",
				siteName: "Example",
				content: { collection: "posts", id: "01ABC", slug: "hello" },
				breadcrumbs: [
					{ name: "Home", url: "https://example.com/" },
					{ name: "Hello", url: "https://example.com/posts/hello" },
				],
				articleMeta: {
					publishedTime: "2026-01-01T00:00:00.000Z",
					modifiedTime: "2026-01-02T00:00:00.000Z",
					author: "Ada",
				},
			},
		});

		expect(contributions.some((c) => c.kind === "jsonld" && c.id === "seo-suite:website")).toBe(
			true,
		);
		expect(
			contributions.some(
				(c) => c.kind === "jsonld" && c.id === "seo-suite:article:posts:01ABC",
			),
		).toBe(true);
		expect(
			contributions.some((c) => c.kind === "jsonld" && c.id === "seo-suite:breadcrumbs"),
		).toBe(true);
		expect(contributions.some((c) => c.kind === "meta" && c.name === "twitter:site")).toBe(true);
	});
});

describe("admin UI", () => {
	it("prioritizes health issues and links directly to affected entries", () => {
		const page = buildHealthPage({
			scanned: 4,
			issues: [
				{
					collection: "posts",
					id: "post-1",
					title: "Needs SEO",
					locale: "en",
					problems: ["missing description", "missing OG image"],
				},
			],
		});

		expect(page.blocks.some((block) => block.type === "meter")).toBe(true);
		const table = page.blocks.find((block) => block.type === "table");
		expect(table?.rows[0]?.open).toMatchObject({
			type: "link",
			target: { kind: "content", collection: "posts", id: "post-1" },
		});
	});

	it("provides safe inline redirect deletion", () => {
		const page = buildRedirectsPage({
			redirects: [
				{
					id: "redirect-1",
					source: "/old",
					destination: "/new",
					type: "301",
					enabled: true,
					_rev: "rev-1",
				},
			],
		});

		const table = page.blocks.find((block) => block.type === "table");
		expect(table?.rows[0]?.remove).toMatchObject({
			type: "button",
			action_id: "delete_redirect",
			value: { id: "redirect-1", _rev: "rev-1" },
			confirm: { style: "danger" },
		});
		expect(page.blocks.some((block) => block.type === "code")).toBe(false);
	});

	it("shows actionable numeric editor scores", () => {
		const analysis = runFullAnalysis({
			content: extractContent({
				title: "Useful SEO guide",
				excerpt: "A concise SEO guide for editors.",
				slug: "useful-seo-guide",
				content: "Useful SEO guide content with practical advice.",
			}),
			seo: {
				title: "Useful SEO guide",
				description: "A concise SEO guide for editors.",
				image: null,
				canonical: null,
				noIndex: false,
			},
			focusKeyphrase: "SEO guide",
		});
		const panel = buildAnalysisPanel({
			focusKeyphrase: "SEO guide",
			analysis,
			seoTitle: "Useful SEO guide",
			seoDescription: "A concise SEO guide for editors.",
			noIndex: false,
		});

		expect(panel.blocks.filter((block) => block.type === "meter")).toHaveLength(0);
		expect(panel.blocks.some((block) => block.type === "columns")).toBe(true);
		expect(panel.blocks.some((block) => block.type === "tab")).toBe(true);
		expect(panel.blocks.some((block) => block.type === "banner")).toBe(true);
	});
});

describe("plugin routes and hooks", () => {
	it("serves settings via admin route", async () => {
		host = await createPluginTestHost();
		const result = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/settings",
		})) as { blocks: Array<{ type: string }> };

		expect(Array.isArray(result.blocks)).toBe(true);
		expect(result.blocks.some((b) => b.type === "header")).toBe(true);
	});

	it("saves settings from form submit", async () => {
		host = await createPluginTestHost();
		const saved = (await host.invokeRoute("admin", {
			type: "form_submit",
			action_id: "save_settings",
			page: "/settings",
			values: {
				organizationName: "Acme",
				schemaType: "Article",
				publishPolicy: "block",
				twitterHandle: "acme",
				collectionsCsv: "posts",
			},
		})) as { toast?: { type: string }; blocks: Array<{ type: string; fields?: unknown[] }> };

		expect(saved.toast?.type).toBe("success");

		const reloaded = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/settings",
		})) as {
			blocks: Array<{
				type: string;
				fields?: Array<{ action_id?: string; initial_value?: string }>;
			}>;
		};
		const form = reloaded.blocks.find((b) => b.type === "form");
		const org = form?.fields?.find((f) => f.action_id === "organizationName");
		expect(org?.initial_value).toBe("Acme");
	});

	it("reports missing entry context on editor panel without ui.entry", async () => {
		host = await createPluginTestHost();
		const result = (await host.invokeRoute("editor/analysis", {
			type: "panel_load",
		})) as { blocks: Array<{ type: string; title?: string }> };

		expect(result.blocks.some((b) => b.type === "banner")).toBe(true);
	});

	it("emits page metadata contributions", async () => {
		host = await createPluginTestHost();
		await host.invokeRoute("admin", {
			type: "form_submit",
			action_id: "save_settings",
			page: "/settings",
			values: {
				organizationName: "Org",
				schemaType: "BlogPosting",
				publishPolicy: "warn",
				twitterHandle: "",
				collectionsCsv: "posts,pages",
			},
		});

		const result = await host.invokeHook("page:metadata", {
			page: {
				kind: "content",
				url: "https://example.com/posts/a",
				path: "/posts/a",
				title: "A",
				pageTitle: "A",
				description: "Desc",
				canonical: "https://example.com/posts/a",
				image: null,
				siteName: "Example",
				content: { collection: "posts", id: "1", slug: "a" },
			},
		});

		expect(Array.isArray(result)).toBe(true);
		expect(
			(result as Array<{ kind: string; id?: string }>).some(
				(c) => c.kind === "jsonld" && c.id === "seo-suite:organization",
			),
		).toBe(true);
	});

	it("blocks publish when policy is block and description is missing", async () => {
		host = await createPluginTestHost();
		await host.invokeRoute("admin", {
			type: "form_submit",
			action_id: "save_settings",
			page: "/settings",
			values: {
				organizationName: "",
				schemaType: "BlogPosting",
				publishPolicy: "block",
				twitterHandle: "",
				collectionsCsv: "posts",
			},
		});

		const decision = await host.invokeHook("content:beforePublish", {
			collection: "posts",
			content: { id: "1", title: "Hello", excerpt: "", seo: { description: null } },
			origin: { source: "api" },
		});

		expect(decision).toEqual({
			cancel: true,
			reason: expect.stringContaining("missing SEO/meta description"),
		});
	});

	it("serves health and redirects admin pages", async () => {
		host = await createPluginTestHost();
		await host.invokeRoute("admin", {
			type: "form_submit",
			action_id: "save_settings",
			page: "/settings",
			values: {
				organizationName: "",
				schemaType: "BlogPosting",
				publishPolicy: "warn",
				twitterHandle: "",
				collectionsCsv: "",
			},
		});

		const health = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/health",
		})) as { blocks: Array<{ type: string }> };
		expect(health.blocks.some((b) => b.type === "header")).toBe(true);

		const redirects = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/redirects",
		})) as { blocks: Array<{ type: string }> };
		expect(redirects.blocks.some((b) => b.type === "form")).toBe(true);
	});
});
