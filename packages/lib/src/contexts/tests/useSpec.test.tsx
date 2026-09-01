import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_DEPTH_COLORS } from "../../components/schema/depthColors";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { OpenAPIDocumentData } from "../../types/openapi";
import {
  DocumentContext,
  useAsyncAPIDocumentContext,
  useOpenAPIDocumentContext,
} from "../useSpec";
import type {
  AsyncAPIDocumentContextValue,
  DocumentContextValue,
  OpenAPIDocumentContextValue,
} from "../useSpec";

const baseContext = {
  deref: () => undefined,
  portalHost: null,
  rootElement: null,
  sidePanelContainment: "component" as const,
  depthColors: DEFAULT_DEPTH_COLORS,
  showExtensions: true,
  showCodeSamples: true,
};

const asyncContext: AsyncAPIDocumentContextValue = {
  ...baseContext,
  specType: "asyncapi",
  document: {} as AsyncAPIDocumentData,
};

const openContext: OpenAPIDocumentContextValue = {
  ...baseContext,
  specType: "openapi",
  document: {} as OpenAPIDocumentData,
};

const wrapperFor = (value: DocumentContextValue) =>
  function ContextWrapper({ children }: { children: ReactNode }) {
    return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
  };

describe("spec-specific document context hooks", () => {
  it("return their correctly narrowed context", () => {
    const asyncResult = renderHook(() => useAsyncAPIDocumentContext(), {
      wrapper: wrapperFor(asyncContext),
    });
    const openResult = renderHook(() => useOpenAPIDocumentContext(), {
      wrapper: wrapperFor(openContext),
    });

    expect(asyncResult.result.current).toBe(asyncContext);
    expect(openResult.result.current).toBe(openContext);
  });

  it("throws a useful error for a mismatched provider", () => {
    expect(() =>
      renderHook(() => useAsyncAPIDocumentContext(), { wrapper: wrapperFor(openContext) }),
    ).toThrow(/expected an AsyncAPI document provider.*"openapi"/);

    expect(() =>
      renderHook(() => useOpenAPIDocumentContext(), { wrapper: wrapperFor(asyncContext) }),
    ).toThrow(/expected an OpenAPI document provider.*"asyncapi"/);
  });
});
