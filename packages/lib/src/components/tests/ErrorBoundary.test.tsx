import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../ErrorBoundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div>safe content</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("catches a render error and shows the default fallback instead of crashing", () => {
    // React logs the error to console.error even when caught — silence it for this assertion.
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    expect(screen.queryByText("safe content")).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("calls onError with the error and component stack", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("boom");

    vi.restoreAllMocks();
  });

  it("renders a custom static fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("custom fallback")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("renders a custom fallback render function and lets it reset the boundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Wrapper() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          fallback={(error: Error, reset: () => void) => (
            <button
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}
            >
              recover from: {error.message}
            </button>
          )}
        >
          <Bomb shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Wrapper />);

    const recoverButton = screen.getByText("recover from: boom");
    fireEvent.click(recoverButton);

    expect(screen.getByText("safe content")).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
