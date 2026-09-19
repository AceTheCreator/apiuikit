import { useMemo, useState } from "react";
import { ConfigInterface, defaultConfig } from "../config";
import type { MarkdownUrlResolver, SidePanelContainment } from "../config/config";
import { SpecType } from "../contexts";
import { buildThemeVars, resolveThemeMode } from "../utils/theme";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";
import { createDocumentDeref } from "../helpers/jsonPointer";
import type { ApiuikitPlugin } from "../plugins/types";
import { createPluginSlotRegistry } from "../plugins/registry";
import { useSystemColorScheme } from "./useSystemColorScheme";

const NO_PLUGINS: ApiuikitPlugin[] = [];

/**
 * Builds the shared DocumentContext value (deref resolver, portal/root refs,
 * theme-derived settings) plus the CSS custom properties for the theme,
 * used by both AsyncAPIDocumentProvider and OpenAPIDocumentProvider, which
 * differ only in the spec type they declare and the portal element's
 * className. Generic so the returned contextValue keeps the caller's literal
 * `specType` and document type, and thus lands as the right member of the
 * DocumentContextValue union.
 */
export function useDocumentProviderValue<S extends SpecType, D extends object>(
  specType: S,
  document: D,
  config: ConfigInterface = defaultConfig,
  plugins: ApiuikitPlugin[] = NO_PLUGINS,
) {
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

  // Fallback resolver for the few $refs that survive upfront resolution — see
  // resolveDocument's own doc for why cycle-forming refs are left in place.
  // The resolver and its cache are replaced atomically with the document, so
  // a render can never observe cached values belonging to the previous spec.
  const deref = useMemo(() => createDocumentDeref(document), [document]);

  const defaultSchemaExpanded = config.expand?.schemas === true;
  const depthColors = config.theme?.depthColors?.length
    ? config.theme.depthColors
    : DEFAULT_DEPTH_COLORS;
  const showExtensions = config.show?.extensions !== false;
  const showCodeSamples = config.show?.codeSamples !== false;
  // Opt-in, so the test is `=== true` rather than `!== false` like its
  // neighbours — see `ShowConfig.tryIt` for why this one defaults off.
  const showTryIt = config.show?.tryIt === true;
  const configuredTopOffset = config.topOffset;
  const topOffset =
    typeof configuredTopOffset === "number" && Number.isFinite(configuredTopOffset)
      ? Math.max(0, configuredTopOffset)
      : 0;
  const sidePanelContainment: SidePanelContainment =
    config.sidePanel?.containment ?? "viewport";
  const configuredSidePanelTopOffset = config.sidePanel?.topOffset;
  const sidePanelTopOffset =
    typeof configuredSidePanelTopOffset === "number" && Number.isFinite(configuredSidePanelTopOffset)
      ? Math.max(0, configuredSidePanelTopOffset)
      : topOffset;

  // Both accepted forms collapse to a resolver here so consumers have one
  // shape to call. A bare string applies to every target; a function decides
  // per target and can decline by returning null.
  const configuredMarkdownUrl = config.markdown?.url;
  const markdownUrl = useMemo<MarkdownUrlResolver | undefined>(() => {
    if (typeof configuredMarkdownUrl === "function") return configuredMarkdownUrl;
    if (typeof configuredMarkdownUrl === "string") return () => configuredMarkdownUrl;
    return undefined;
  }, [configuredMarkdownUrl]);
  const pluginSlotRegistry = useMemo(() => createPluginSlotRegistry(plugins), [plugins]);

  const systemPrefersDark = useSystemColorScheme(config.theme?.mode === "system");
  const resolvedMode = useMemo(
    () => resolveThemeMode(config.theme, systemPrefersDark),
    [config.theme, systemPrefersDark],
  );
  const themeVars = useMemo(
    () => (config.theme ? buildThemeVars(config.theme, resolvedMode) : {}),
    [config.theme, resolvedMode],
  );

  // resolvedMode rides along on contextValue (not just the two
  // *DocumentProvider root divs) so plugins can style themselves consistently
  // with the active mode instead of reimplementing light/dark precedence
  // against the raw, unresolved `config.theme` — see DocumentContextBase's
  // doc comment on `resolvedMode`.
  const contextValue = useMemo(
    () => ({
      specType,
      document,
      deref,
      portalHost,
      rootElement,
      topOffset,
      sidePanelContainment,
      sidePanelTopOffset,
      defaultSchemaExpanded,
      depthColors,
      showExtensions,
      showCodeSamples,
      showTryIt,
      markdownUrl,
      plugins,
      pluginSlotRegistry,
      config,
      resolvedMode,
    }),
    [
      specType,
      document,
      deref,
      portalHost,
      rootElement,
      topOffset,
      sidePanelContainment,
      sidePanelTopOffset,
      defaultSchemaExpanded,
      depthColors,
      showExtensions,
      showCodeSamples,
      showTryIt,
      markdownUrl,
      plugins,
      pluginSlotRegistry,
      config,
      resolvedMode,
    ],
  );

  return { contextValue, themeVars, resolvedMode, setPortalHost, setRootElement };
}
