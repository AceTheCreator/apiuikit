import { definePlugin } from "apiuikit/plugin";
import type { OpenAPIOperationActionsContext } from "apiuikit/plugin";

// Playground-local dev fixture, same spirit as operationTabDemoPlugin.tsx:
// not a published package, just something concrete to click through when
// working on the plugin architecture (packages/lib). This one fills
// `openapi.operation.actions` instead of `openapi.operation.tab` — it
// renders inline, amid the operation's own documentation, rather than
// taking over the whole panel body. The tinted background + thick dotted
// border exist purely to make that inline slot's boundaries visible (e.g.
// for a screenshot); a real plugin wouldn't style itself this way.

const styles = {
  wrapper: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    border: "4px dotted rgba(217, 119, 6, 0.6)",
    background: "rgba(217, 119, 6, 0.08)",
  },
  label: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "rgba(180, 83, 9, 0.95)",
    fontFamily: "ui-monospace, monospace",
  },
};

function OperationActionsDemo({ method, path }: OpenAPIOperationActionsContext) {
  return (
    <div style={styles.wrapper}>
      <span style={styles.label}>
        openapi.operation.actions — inline slot ({method.toUpperCase()} {path})
      </span>
    </div>
  );
}

export default definePlugin({
  name: "playground-operation-actions-demo",
  slots: {
    "openapi.operation.actions": OperationActionsDemo,
  },
});
