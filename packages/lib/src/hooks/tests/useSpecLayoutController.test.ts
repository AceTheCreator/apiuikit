import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpecLayoutController } from "../useSpecLayoutController";
import type { ContentTabItem } from "../../components/ContentTab";

type TabKey = "endpoints" | "schemas";

const isTabKey = (value: string): value is TabKey => value === "endpoints" || value === "schemas";

const tabs: ContentTabItem[] = [
  { id: "endpoints", name: "Endpoints", icon: () => null },
  { id: "schemas", name: "Schemas", icon: () => null },
];

const getTargetId = (section: TabKey | "servers", key: string) =>
  section === "servers" ? `server-${key}` : `${section}-${key}`;

function setup(overrides: Partial<Parameters<typeof useSpecLayoutController<TabKey>>[0]> = {}) {
  return renderHook(() =>
    useSpecLayoutController<TabKey>({
      tabs,
      defaultTab: "endpoints",
      isTabKey,
      sections: [
        { id: "endpoints", visible: true },
        { id: "schemas", visible: true },
        { id: "servers", visible: true },
      ],
      searchQuery: "",
      ...overrides,
    }),
  );
}

describe("useSpecLayoutController", () => {
  describe("initialLocation seeding", () => {
    it("seeds the active tab and selection from a valid initialLocation", () => {
      const { result } = setup({ initialLocation: { tab: "schemas", key: "Pet" } });

      expect(result.current.effectiveTab).toBe("schemas");
      expect(result.current.navActiveSection).toBe("schemas");
      expect(result.current.selected.schemas).toBe("Pet");
      expect(result.current.selectedNavItem).toEqual({ tab: "schemas", key: "Pet" });
    });

    it("seeds a servers selection without changing the content tab", () => {
      const { result } = setup({ initialLocation: { tab: "servers", key: "prod" } });

      expect(result.current.effectiveTab).toBe("endpoints");
      expect(result.current.navActiveSection).toBe("servers");
      expect(result.current.selected.servers).toBe("prod");
    });

    it("falls back to the default tab for an unrecognized tab name, without crashing", () => {
      const { result } = setup({
        initialLocation: { tab: "bogus" as unknown as TabKey, key: "whatever" },
      });

      expect(result.current.effectiveTab).toBe("endpoints");
      expect(result.current.selected.endpoints).toBeNull();
      expect(result.current.selected.schemas).toBeNull();
      expect(result.current.selectedNavItem).toBeNull();
    });

    it("does nothing extra when initialLocation is omitted", () => {
      const { result } = setup();

      expect(result.current.effectiveTab).toBe("endpoints");
      expect(result.current.selectedNavItem).toBeNull();
    });
  });

  describe("onLocationChange", () => {
    it("fires once on mount with the seeded location", () => {
      const onLocationChange = vi.fn();
      setup({ initialLocation: { tab: "schemas", key: "Pet" }, onLocationChange });

      expect(onLocationChange).toHaveBeenCalledTimes(1);
      expect(onLocationChange).toHaveBeenCalledWith({ tab: "schemas", key: "Pet" });
    });

    it("fires with a null key when mounted with no selection", () => {
      const onLocationChange = vi.fn();
      setup({ onLocationChange });

      expect(onLocationChange).toHaveBeenCalledWith({ tab: "endpoints", key: null });
    });

    it("fires again on a nav item selection, and not on unrelated re-renders", () => {
      const onLocationChange = vi.fn();
      const { result, rerender } = setup({ onLocationChange });
      onLocationChange.mockClear();

      act(() => result.current.handleNavItemSelect("schemas", "Pet"));
      expect(onLocationChange).toHaveBeenCalledTimes(1);
      expect(onLocationChange).toHaveBeenLastCalledWith({ tab: "schemas", key: "Pet" });

      onLocationChange.mockClear();
      rerender();
      expect(onLocationChange).not.toHaveBeenCalled();
    });

    it("fires on a nav server selection", () => {
      const onLocationChange = vi.fn();
      const { result } = setup({ onLocationChange });
      onLocationChange.mockClear();

      act(() => result.current.handleNavServerSelect("prod"));
      expect(onLocationChange).toHaveBeenLastCalledWith({ tab: "servers", key: "prod" });
    });

    it("fires on a content tab change even without a selection", () => {
      const onLocationChange = vi.fn();
      const { result } = setup({ onLocationChange });
      onLocationChange.mockClear();

      act(() => result.current.handleContentTabChange("schemas"));
      expect(onLocationChange).toHaveBeenLastCalledWith({ tab: "schemas", key: null });
    });
  });

  describe("initial scroll", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      Element.prototype.scrollIntoView = vi.fn();
    });
    afterEach(() => {
      vi.useRealTimers();
      document.body.innerHTML = "";
    });

    it("scrolls the initialLocation's target into view once it's found", () => {
      const target = document.createElement("div");
      target.id = "endpoints-get /pets";
      document.body.appendChild(target);

      setup({ initialLocation: { tab: "endpoints", key: "get /pets" }, getTargetId });

      act(() => vi.advanceTimersByTime(200));
      expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it("does not scroll when getTargetId is omitted", () => {
      const target = document.createElement("div");
      target.id = "endpoints-get /pets";
      document.body.appendChild(target);

      setup({ initialLocation: { tab: "endpoints", key: "get /pets" } });

      act(() => vi.advanceTimersByTime(200));
      expect(target.scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
