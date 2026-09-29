export type PageMetadataContribution =
	| { kind: "meta"; name: string; content: string; key?: string }
	| { kind: "property"; property: string; content: string; key?: string }
	| {
			kind: "link";
			rel: "canonical" | "alternate";
			href: string;
			hreflang?: string;
			key?: string;
	  }
	| { kind: "jsonld"; id?: string; graph: object | object[] };

export interface SiteSeoSettings {
	organizationName: string;
	schemaType: "BlogPosting" | "Article";
	publishPolicy: "off" | "warn" | "block";
	twitterHandle: string;
	collectionsCsv: string;
}

export const DEFAULT_SETTINGS: SiteSeoSettings = {
	organizationName: "",
	schemaType: "BlogPosting",
	publishPolicy: "warn",
	twitterHandle: "",
	collectionsCsv: "posts,pages",
};

export function parseCollections(csv: string): string[] {
	return csv
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

export interface JsonLdPageInput {
	settings: SiteSeoSettings;
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
}

export function buildPageMetadata(input: JsonLdPageInput): PageMetadataContribution[] {
	const { settings, page } = input;
	const contributions: PageMetadataContribution[] = [];
	const siteName = settings.organizationName || page.siteName || "Site";

	contributions.push({
		kind: "jsonld",
		id: "seo-suite:website",
		graph: {
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: siteName,
			url: page.url ? new URL("/", page.url).origin : undefined,
		},
	});

	if (settings.organizationName) {
		contributions.push({
			kind: "jsonld",
			id: "seo-suite:organization",
			graph: {
				"@context": "https://schema.org",
				"@type": "Organization",
				name: settings.organizationName,
				url: page.url ? new URL("/", page.url).origin : undefined,
			},
		});
	}

	if (settings.twitterHandle) {
		const handle = settings.twitterHandle.replace(/^@/, "");
		contributions.push({
			kind: "meta",
			name: "twitter:site",
			content: `@${handle}`,
			key: "seo-suite:twitter:site",
		});
		contributions.push({
			kind: "meta",
			name: "twitter:card",
			content: "summary_large_image",
			key: "seo-suite:twitter:card",
		});
	}

	if (page.kind === "content" && page.content) {
		const headline = page.pageTitle ?? page.title;
		contributions.push({
			kind: "jsonld",
			id: `seo-suite:article:${page.content.collection}:${page.content.id}`,
			graph: {
				"@context": "https://schema.org",
				"@type": settings.schemaType,
				headline: headline ?? undefined,
				description: page.description ?? undefined,
				image: page.image ?? undefined,
				url: page.canonical ?? page.url,
				datePublished: page.articleMeta?.publishedTime ?? undefined,
				dateModified: page.articleMeta?.modifiedTime ?? undefined,
				author: page.articleMeta?.author
					? { "@type": "Person", name: page.articleMeta.author }
					: undefined,
				mainEntityOfPage: page.canonical ?? page.url,
			},
		});
	}

	if (page.breadcrumbs && page.breadcrumbs.length > 0) {
		contributions.push({
			kind: "jsonld",
			id: "seo-suite:breadcrumbs",
			graph: {
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				itemListElement: page.breadcrumbs.map((crumb, index) => ({
					"@type": "ListItem",
					position: index + 1,
					name: crumb.name,
					item: crumb.url,
				})),
			},
		});
	}

	return contributions;
}
