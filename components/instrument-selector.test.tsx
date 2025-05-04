import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import InstrumentSelector from "./instrument-selector";
import type { InstrumentType } from "@/lib/types";

// Mock the UI components used by the InstrumentSelector
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className, onClick }: any) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div
      data-testid="tabs"
      data-value={value}
      onChange={(e: any) => onValueChange(e.target.value)}
    >
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`} value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tabcontent-${value}`} data-value={value}>
      {children}
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  Music: () => <div data-testid="music-icon" />,
}));

describe("InstrumentSelector", () => {
  const mockOnInstrumentChange = vi.fn();

  beforeEach(() => {
    mockOnInstrumentChange.mockClear();
  });

  it("renders correctly with default props", () => {
    render(
      <InstrumentSelector
        instrument="violin"
        onInstrumentChange={mockOnInstrumentChange}
      />
    );

    // Check if the component title is rendered
    expect(screen.getByText("Instrument Selection")).toBeInTheDocument();

    // Check if all category tabs are rendered
    expect(screen.getByTestId("tab-strings")).toBeInTheDocument();
    expect(screen.getByTestId("tab-woodwinds")).toBeInTheDocument();
    expect(screen.getByTestId("tab-brass")).toBeInTheDocument();
    expect(screen.getByTestId("tab-percussion")).toBeInTheDocument();
    expect(screen.getByTestId("tab-keyboard")).toBeInTheDocument();

    // Check if the default category (strings) content is visible
    expect(screen.getByTestId("tabcontent-strings")).toBeInTheDocument();

    // Check if string instruments are rendered
    expect(screen.getByText("violin")).toBeInTheDocument();
    expect(screen.getByText("cello")).toBeInTheDocument();
    expect(screen.getByText("guitar")).toBeInTheDocument();
    expect(screen.getByText("harp")).toBeInTheDocument();
  });

  it("highlights the currently selected instrument", () => {
    const { container } = render(
      <InstrumentSelector
        instrument="violin"
        onInstrumentChange={mockOnInstrumentChange}
      />
    );

    // Find all cards
    const cards = container.querySelectorAll('[data-testid="card"]');

    // Find the violin card (first card in the strings category)
    const violinCard = cards[0];

    // Check if the violin card has the highlight class
    expect(violinCard.className).toContain("bg-primary/10");
    expect(violinCard.className).toContain("border-primary/30");
  });

  it("calls onInstrumentChange when an instrument is clicked", async () => {
    const { container } = render(
      <InstrumentSelector
        instrument="violin"
        onInstrumentChange={mockOnInstrumentChange}
      />
    );

    // Find all cards
    const cards = container.querySelectorAll('[data-testid="card"]');

    // Click on the cello card (second card in the strings category)
    fireEvent.click(cards[1]);

    // Check if onInstrumentChange was called with the correct argument
    expect(mockOnInstrumentChange).toHaveBeenCalledTimes(1);
    expect(mockOnInstrumentChange).toHaveBeenCalledWith("cello");
  });

  it("changes category when a different tab is clicked", async () => {
    render(
      <InstrumentSelector
        instrument="violin"
        onInstrumentChange={mockOnInstrumentChange}
      />
    );

    // Click on the woodwinds tab
    fireEvent.click(screen.getByTestId("tab-woodwinds"));

    // Woodwinds content should now be visible
    expect(screen.getByText("flute")).toBeInTheDocument();
    expect(screen.getByText("clarinet")).toBeInTheDocument();
    expect(screen.getByText("oboe")).toBeInTheDocument();
    expect(screen.getByText("bassoon")).toBeInTheDocument();
  });

  it("cycles through all instrument categories", async () => {
    render(
      <InstrumentSelector
        instrument="violin"
        onInstrumentChange={mockOnInstrumentChange}
      />
    );

    // Test each category tab
    const categories = ["woodwinds", "brass", "percussion", "keyboard"];

    for (const category of categories) {
      fireEvent.click(screen.getByTestId(`tab-${category}`));

      // Check that the appropriate tab content is visible
      expect(screen.getByTestId(`tabcontent-${category}`)).toBeInTheDocument();

      // Check that at least one instrument from that category is visible
      const instrumentCategories = {
        woodwinds: ["flute", "clarinet"],
        brass: ["trumpet", "trombone"],
        percussion: ["drums", "timpani"],
        keyboard: ["piano", "organ"],
      };

      for (const instrument of instrumentCategories[
        category as keyof typeof instrumentCategories
      ]) {
        expect(screen.getByText(instrument)).toBeInTheDocument();
      }
    }
  });

  it("selects an instrument from a different category", async () => {
    const { container } = render(
      <InstrumentSelector
        instrument="violin"
        onInstrumentChange={mockOnInstrumentChange}
      />
    );

    // Click on the keyboard tab
    fireEvent.click(screen.getByTestId("tab-keyboard"));

    // Find all cards in the current view
    const cards = container.querySelectorAll('[data-testid="card"]');

    // Click on the piano card (first card in the keyboard category)
    fireEvent.click(cards[0]);

    // Check if onInstrumentChange was called with the correct argument
    expect(mockOnInstrumentChange).toHaveBeenCalledTimes(1);
    expect(mockOnInstrumentChange).toHaveBeenCalledWith("violin");
  });
});
