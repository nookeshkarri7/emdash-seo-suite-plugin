# Automated EmDash plugin releases

This repository is prepared for delegated releases via `@emdash-cms/plugin-cli`.

After you set a real `publisher` and public `repo` in `emdash-plugin.jsonc`:

```sh
pnpm exec emdash-plugin login <your-handle>
pnpm exec emdash-plugin release setup
```

That command writes `.github/workflows/emdash-release.yml` at the repository root. Commit it, push, and release with:

```sh
git tag seo-suite@0.1.0
git push origin seo-suite@0.1.0
```

The first Actions run requires approving the repository connection and (when capabilities expand) the release in the EmDash release dashboard.

Do not commit Atmosphere credentials. GitHub OIDC + the release service handle publishing.
