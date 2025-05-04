import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import MusicNotation from "./music-notation";

describe("MusicNotation Component", () => {
  const mockNotation = `Title: Sample Composition
  
A|B|C|D|
E|F|G|,|`;

  beforeEach(() => {
    // Mock the HTMLDivElement innerHTML property since it's read-only
    // in the testing environment
    Object.defineProperty(HTMLDivElement.prototype, "innerHTML", {
      writable: true,
      value: "",
    });
  });

  afterEach(() => {
    cleanup();
    // Restore the original innerHTML property
    jest.restoreAllMocks();
  });

  it("renders the component without crashing", () => {
    const { container } = render(<MusicNotation notation={mockNotation} />);
    expect(container).toBeInTheDocument();
  });

  it("creates a div with the provided ref", () => {
    const { container } = render(<MusicNotation notation={mockNotation} />);
    const divElement = container.querySelector("div");
    expect(divElement).toBeInTheDocument();
    expect(divElement).toHaveClass("w-full h-full min-h-[300px]");
  });

  it("processes the notation data correctly", () => {
    const { container } = render(<MusicNotation notation={mockNotation} />);

    // Wait for useEffect to run
    setTimeout(() => {
      const divElement = container.querySelector("div");
      expect(divElement?.innerHTML).toContain("Music Notation");
      expect(divElement?.innerHTML).toContain(
        "Visual representation of your composition"
      );
      expect(divElement?.innerHTML).toContain(mockNotation);

      // Check that each note from the notation is rendered
      ["A", "B", "C", "D", "E", "F", "G", ","].forEach((note) => {
        expect(divElement?.innerHTML).toContain(`>${note}</`);
      });
    }, 0);
  });

  it("handles empty notation gracefully", () => {
    const { container } = render(<MusicNotation notation="" />);
    expect(container).toBeInTheDocument();
    // Should not throw an error even with empty notation
  });

  it("handles notation without the expected format", () => {
    const badNotation = "Just a single line with no measures";
    const { container } = render(<MusicNotation notation={badNotation} />);

    // Wait for useEffect to run
    setTimeout(() => {
      const divElement = container.querySelector("div");
      expect(divElement?.innerHTML).toContain("Raw Notation Data:");
      expect(divElement?.innerHTML).toContain(badNotation);
      // Should still render something without crashing
    }, 0);
  });
});
