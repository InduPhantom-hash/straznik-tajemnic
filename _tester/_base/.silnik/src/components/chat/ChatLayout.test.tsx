import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatLayout } from "./ChatLayout";

function BuggySidebar(): React.ReactElement {
  throw new Error("Awaria paska bocznego");
}

describe("ChatLayout with SubtreeErrorBoundary", () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renderuje czat i panel boczny gdy brak błędów", () => {
    render(
      <ChatLayout
        sidebar={<div>Pasek boczny</div>}
        modals={<div>Modale</div>}
      >
        <div>Okno czatu</div>
      </ChatLayout>
    );

    expect(screen.getByText("Okno czatu")).toBeInTheDocument();
    expect(screen.getByText("Pasek boczny")).toBeInTheDocument();
    expect(screen.getByText("Modale")).toBeInTheDocument();
  });

  it("izoluje awarię paska bocznego bez niszczenia okna czatu (ochrona przed White Screen)", () => {
    render(
      <ChatLayout
        sidebar={<BuggySidebar />}
        modals={<div>Modale</div>}
      >
        <div>Okno czatu działa bez przeszkód</div>
      </ChatLayout>
    );

    expect(screen.getByText("Okno czatu działa bez przeszkód")).toBeInTheDocument();
    expect(screen.getByText("Błąd panelu bocznego")).toBeInTheDocument();
    expect(screen.getByText("Awaria paska bocznego")).toBeInTheDocument();
  });
});
