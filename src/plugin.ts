import type { SandboxedPlugin } from "emdash/plugin";

import { handlePageMetadata } from "./hooks/page-metadata.js";
import { handleBeforePublish } from "./hooks/publish-policy.js";
import { handleAdminRoute } from "./routes/admin.js";
import { handleEditorAnalysisRoute } from "./routes/editor-panel.js";

const plugin: SandboxedPlugin = {
	hooks: {
		"page:metadata": handlePageMetadata,
		"content:beforePublish": handleBeforePublish,
	},
	routes: {
		admin: {
			permission: "plugins:manage",
			handler: handleAdminRoute,
		},
		"editor/analysis": {
			permission: "content:read",
			handler: handleEditorAnalysisRoute,
		},
	},
};

export default plugin;
