import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubtreeErrorBoundary } from "./subtree-error-boundary";

function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Symulowana awaria poddrzewa");
  }
  return <div>Poprawna zawartość komponentu</div>;
}

describe("SubtreeErrorBoundary", () => {
  // Wyciszamy console.error dla kontrolowanego błędu
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renderuje dzieci gdy brak błędu", () => {
    render(
      <SubtreeErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </SubtreeErrorBoundary>
    );

    expect(screen.getByText("Poprawna zawartość komponentu")).toBeInTheDocument();
  });

  it("przechwytuje błąd i renderuje widok fallback bez wywalania całej aplikacji", () => {
    render(
      <SubtreeErrorBoundary componentName="TestModule" fallbackTitle="Błąd modułu testowego">
        <BuggyComponent shouldThrow={true} />
      </SubtreeErrorBoundary>
    );

    expect(screen.getByText("Błąd modułu testowego")).toBeInTheDocument();
    expect(screen.getByText("Symulowana awaria poddrzewa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
  });

  it("pozwala na zresetowanie stanu błędu przyciskiem", () => {
    const handleReset = jest.fn();
    const { rerender } = render(
      <SubtreeErrorBoundary onReset={handleReset}>
        <BuggyComponent shouldThrow={true} />
      </SubtreeErrorBoundary>
    );

    expect(screen.getByText("Symulowana awaria poddrzewa")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /spróbuj ponownie/i });
    fireEvent.click(retryBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
