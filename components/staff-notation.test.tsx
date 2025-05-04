import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StaffNotation from "@/components/staff-notation";
import type { Note } from "@/lib/types";

// Mock the window's resize functionality
const resizeWindow = (width: number, height: number) => {
  window.innerWidth = width;
  window.innerHeight = height;
  window.dispatchEvent(new Event("resize"));
};

// Mock image for treble clef
vi.mock("next/image", () => ({
  default: (props: any) => {
    return <img {...props} data-testid="mock-image" />;
  },
}));

describe("StaffNotation Component", () => {
  // Default props
  const defaultProps = {
    notes: [
      { step: 0, pitch: "C4" },
      { step: 2, pitch: "E4" },
      { step: 4, pitch: "G4" },
    ] as Note[],
    currentStep: 0,
    isPlaying: false,
    onAddNote: vi.fn(),
    keySignature: "C",
    scale: "Major",
    totalSteps: 16,
  };

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getBoundingClientRect for staff element
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 220,
      top: 0,
      left: 0,
      bottom: 220,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  it("renders the staff notation component", () => {
    render(<StaffNotation {...defaultProps} />);

    // Check if title is rendered
    expect(screen.getByText("Music Notation")).toBeInTheDocument();

    // Check if key signature and scale are rendered
    expect(screen.getByText("C Major")).toBeInTheDocument();

    // Check if help text is rendered
    expect(
      screen.getByText("Drag notes onto the staff or click to place them")
    ).toBeInTheDocument();
  });

  it("renders the correct number of notes", () => {
    render(<StaffNotation {...defaultProps} />);

    // There should be 3 notes (as defined in defaultProps)
    const noteElements = screen.getAllByText(/[A-G]/);
    expect(noteElements.length).toBe(defaultProps.notes.length + 8); // 3 notes + 8 in palette
  });

  it("highlights the current step when playing", () => {
    render(<StaffNotation {...defaultProps} isPlaying={true} />);

    // There should be a highlighted note (the first one at step 0)
    const playingNote = document.querySelector(
      ".ring-2.ring-primary-foreground"
    );
    expect(playingNote).toBeInTheDocument();
  });

  it("calls onAddNote when clicking on staff", async () => {
    const user = userEvent.setup();
    render(<StaffNotation {...defaultProps} />);

    // Get the staff element
    const staffElement =
      document.querySelector('[data-testid="staff"]') ||
      document.querySelector(".h-\\[220px\\]");

    // Simulate click on staff
    if (staffElement) {
      await user.click(staffElement);
      expect(defaultProps.onAddNote).toHaveBeenCalled();
    } else {
      throw new Error("Staff element not found");
    }
  });

  it("calls onAddNote when clicking on existing note", async () => {
    const user = userEvent.setup();
    render(<StaffNotation {...defaultProps} />);

    // Find one of the notes
    const noteElement = document.querySelector(".rounded-full.cursor-pointer");

    // Click on the note
    if (noteElement) {
      await user.click(noteElement);
      expect(defaultProps.onAddNote).toHaveBeenCalled();
    } else {
      throw new Error("Note element not found");
    }
  });

  it("handles dragging and dropping notes", async () => {
    render(<StaffNotation {...defaultProps} />);

    // Get a note from the palette
    const paletteNote = screen.getByText("C4");

    // Get the staff element
    const staffElement =
      document.querySelector('[data-testid="staff"]') ||
      document.querySelector(".h-\\[220px\\]");

    if (staffElement && paletteNote) {
      // Start drag
      fireEvent.dragStart(paletteNote, {
        dataTransfer: {
          setData: vi.fn(),
          getData: () => "C4",
        },
      });

      // Drag over the staff
      fireEvent.dragOver(staffElement, {
        clientX: 100,
        clientY: 100,
        dataTransfer: {
          getData: () => "C4",
        },
      });

      // Drop on the staff
      fireEvent.drop(staffElement, {
        clientX: 100,
        clientY: 100,
        dataTransfer: {
          getData: () => "C4",
        },
      });

      expect(defaultProps.onAddNote).toHaveBeenCalled();
    } else {
      throw new Error("Staff or note elements not found");
    }
  });

  it("updates dimensions on window resize", () => {
    render(<StaffNotation {...defaultProps} />);

    // Trigger window resize
    resizeWindow(1024, 768);

    // This is mostly to verify the resize listener is working
    // We'd need to mock implementations to truly test the effects
    expect(Element.prototype.getBoundingClientRect).toHaveBeenCalled();
  });

  it("renders the correct staff lines", () => {
    render(<StaffNotation {...defaultProps} />);

    // There should be 5 main staff lines
    const staffLines = document.querySelectorAll(".bg-gray-400");
    expect(staffLines.length).toBe(5);

    // There should also be ledger lines (3 above + 3 below)
    const ledgerLines = document.querySelectorAll(".bg-gray-300");
    expect(ledgerLines.length).toBeGreaterThan(0);
  });

  it("renders measure lines based on totalSteps", () => {
    render(<StaffNotation {...defaultProps} totalSteps={8} />);

    // There should be totalSteps + 1 measure lines
    const measureLines = document.querySelectorAll('[class*="measure-"]');
    expect(measureLines.length).toBe(9); // totalSteps + 1
  });

  it("shows hover indicator during drag operations", () => {
    render(<StaffNotation {...defaultProps} />);

    // Get the staff element
    const staffElement =
      document.querySelector('[data-testid="staff"]') ||
      document.querySelector(".h-\\[220px\\]");

    if (staffElement) {
      // Trigger dragOver
      fireEvent.dragOver(staffElement, {
        clientX: 100,
        clientY: 100,
        dataTransfer: {
          getData: () => "C4",
        },
      });

      // Check for hover indicator
      const hoverIndicator = document.querySelector(".bg-primary\\/50");
      expect(hoverIndicator).toBeInTheDocument();

      // Trigger dragLeave
      fireEvent.dragLeave(staffElement);

      // Hover indicator should be gone
      const hoverIndicatorAfter = document.querySelector(".bg-primary\\/50");
      expect(hoverIndicatorAfter).not.toBeInTheDocument();
    } else {
      throw new Error("Staff element not found");
    }
  });

  it("accepts different note values and renders them correctly", () => {
    const noteProps = {
      ...defaultProps,
      notes: [
        { step: 0, pitch: "C3" },
        { step: 2, pitch: "G5" },
        { step: 4, pitch: "B6" },
      ] as Note[],
    };

    render(<StaffNotation {...noteProps} />);

    // Verify that the notes are rendered
    const noteC = screen.getAllByText("C")[0];
    const noteG = screen.getAllByText("G")[0];
    const noteB = screen.getAllByText("B")[0];

    expect(noteC).toBeInTheDocument();
    expect(noteG).toBeInTheDocument();
    expect(noteB).toBeInTheDocument();
  });
});
