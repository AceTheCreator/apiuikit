import { definePlugin } from "apiuikit/plugin";
import type { OpenAPIOperationPluginContext } from "apiuikit/plugin";

// Playground-local dev fixture, same spirit as operationSupplementaryDemoPlugin.tsx:
// not a published package, just something concrete to click through when
// working on the plugin architecture (packages/lib). This one fills
// `openapi.operation.tab` instead of `openapi.operation.reference.supplementary` — selecting
// its tab hands it the operation panel's *entire* body, rather than a sliver
// of it. The tinted background + thick dotted border exist purely to make
// that full-panel slot visible (e.g. for a screenshot); a real plugin
// wouldn't style itself this way.

const styles = {
  wrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    padding: "1rem",
    borderRadius: "0.75rem",
    border: "4px dotted rgba(99, 102, 241, 0.6)",
    background: "rgba(99, 102, 241, 0.08)",
  },
  label: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "rgba(79, 70, 229, 0.9)",
    fontFamily: "ui-monospace, monospace",
  },
};

function OperationTabDemo({ method, path }: OpenAPIOperationPluginContext) {
  return (
    <div style={styles.wrapper}>
      <p style={styles.label}>
        openapi.operation.tab — this whole panel is the plugin's slot ({method.toUpperCase()} {path})
      </p>
    </div>
  );
}

export default definePlugin({
  name: "playground-operation-tab-demo",
  slots: {
    "openapi.operation.tab": { label: "Demo", component: OperationTabDemo },
  },
});
