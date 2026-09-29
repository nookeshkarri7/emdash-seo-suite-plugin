# SEO Suite

Sandboxed EmDash plugin that adds Yoast-style SEO coaching on top of EmDash’s built-in SEO panel, sitemap, and robots.txt.

## Features

- **Editor panel** — focus keyphrase, SEO + readability checklist, search snippet preview, apply SEO suggestions
- **JSON-LD** — `WebSite`, `Organization`, `BlogPosting`/`Article`, and `BreadcrumbList` via `page:metadata`
- **Redirect manager** — create/list/delete redirects in the admin UI
- **SEO health** — scan published entries for missing descriptions, images, focus keyphrases, and noindex
- **Publish policy** — `off` | `warn` | `block` when critical SEO fields are missing

EmDash still owns `/sitemap.xml`, `/sitemap-{collection}.xml`, and `/robots.txt`.

## Develop

```sh
pnpm install
pnpm run validate
pnpm run test
pnpm run build
pnpm run dev
```

## Configure before publishing

1. Replace `publisher` in `emdash-plugin.jsonc` with your Atmosphere DID/handle (remove the placeholder).
2. Set a real public GitHub `repo` URL, author, and security contact.
3. Log in and publish:

```sh
pnpm exec emdash-plugin login your.handle
pnpm run validate
pnpm run publish
```

For GitHub Actions delegated releases:

```sh
pnpm run release:setup
```

Then push tags like `seo-suite@0.1.0` from a **public** repository.

## Install on a site

Install from the EmDash plugin registry after publishing, or link a local build during development. Approving the install grants the declared capabilities (content read/write, editor draft read/patch, redirects, media read, taxonomies read, content-policy hooks).

## License

MIT
