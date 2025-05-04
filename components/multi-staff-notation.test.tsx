import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import MultiStaffNotation from "./multi-staff-notation";
import type { Track, NoteDuration } from "@/lib/types";
import { getInstrumentClef } from "@/lib/music-utils";

// Mock the music-utils module
vi.mock("@/lib/music-utils", () => ({
  getInstrumentClef: vi.fn((instrument) => {
    // Return treble clef for most instruments, bass for specific bass instruments
    const bassInstruments = ["cello", "bass", "tuba", "piano"];
    return bassInstruments.includes(instrument) ? "bass" : "treble";
  }),
}));

describe("MultiStaffNotation", () => {
  // Mock props for testing
  const mockTracks: Track[] = [
    {
      id: "track1",
      instrument: "violin",
      volume: 0.8,
      muted: false,
      notes: [
        { step: 0, pitch: "G4", duration: "quarter" },
        { step: 4, pitch: "A4", duration: "half" },
      ],
    },
    {
      id: "track2",
      instrument: "cello",
      volume: 0.7,
      muted: true,
      notes: [
        { step: 0, pitch: "C3", duration: "whole" },
        { step: 8, pitch: "G2", duration: "quarter" },
      ],
    },
  ];

  const mockProps = {
    tracks: mockTracks,
    currentTrackId: "track1",
    currentStep: 0,
    isPlaying: false,
    onAddNote: vi.fn(),
    keySignature: "C",
    scale: "major",
    totalSteps: 16,
    onSelectTrack: vi.fn(),
    noteDuration: 4,
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset the mock implementation of Element.getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 180,
      top: 0,
      right: 800,
      bottom: 180,
      left: 0,
      toJSON: () => {},
    }));

    // Reset the mock implementation of HTMLElement.clientWidth and clientHeight
    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: {
        configurable: true,
        value: 800,
      },
      clientHeight: {
        configurable: true,
        value: 180,
      },
    });
  });

  it("renders the component with tracks", () => {
    render(<MultiStaffNotation {...mockProps} />);

    // Check title is rendered
    expect(screen.getByText("Orchestra Score")).toBeInTheDocument();

    // Check key signature and scale is displayed
    expect(screen.getByText("C major")).toBeInTheDocument();

    // Check instrument names are rendered
    expect(screen.getByText("violin")).toBeInTheDocument();
    expect(screen.getByText("cello")).toBeInTheDocument();

    // Check clef types are displayed
    expect(screen.getByText("treble clef")).toBeInTheDocument();
    expect(screen.getByText("bass clef")).toBeInTheDocument();

    // Check muted status is displayed
    expect(screen.getByText("Muted")).toBeInTheDocument();
  });

  it("highlights the current track", () => {
    const { container } = render(<MultiStaffNotation {...mockProps} />);

    // Get all track containers
    const trackDivs = container.querySelectorAll(
      'div[class*="p-4 rounded-md border"]'
    );

    // First track should have the highlight class
    expect(trackDivs[0].className).toContain("border-primary/50");
    expect(trackDivs[0].className).toContain("bg-primary/5");

    // Second track should not have highlight classes
    expect(trackDivs[1].className).not.toContain("border-primary/50");
    expect(trackDivs[1].className).not.toContain("bg-primary/5");
  });

  it("calls onSelectTrack when a track is clicked", () => {
    render(<MultiStaffNotation {...mockProps} />);

    // Find and click the second track container
    const celloDivs = screen.getAllByText("cello");
    const celloContainer = celloDivs[0].closest(
      'div[class*="p-4 rounded-md border"]'
    );
    fireEvent.click(celloContainer!);

    // Check if onSelectTrack was called with correct trackId
    expect(mockProps.onSelectTrack).toHaveBeenCalledWith("track2");
  });

  it("renders notes for each track", () => {
    const { container } = render(<MultiStaffNotation {...mockProps} />);

    // There should be 2 notes in the first track and 2 in the second = 4 total
    const noteDivs = container.querySelectorAll(
      'div[class*="absolute w-[24px] h-[24px]"]'
    );
    expect(noteDivs.length).toBe(4);
  });

  it("adds a note when a valid drop occurs on the staff", () => {
    // Mock getBoundingClientRect for a specific position
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 800,
      height: 180,
      top: 0,
      right: 800,
      bottom: 180,
      left: 0,
      toJSON: () => {},
    }));

    const { container } = render(<MultiStaffNotation {...mockProps} />);

    // Find the staff element for the first track
    const staffElements = container.querySelectorAll(
      'div[class*="relative w-full h-[180px]"]'
    );
    const violinStaff = staffElements[0];

    // Create mock drag event with clientX and clientY for G4 position at step 2
    const mockDragEvent = {
      preventDefault: vi.fn(),
      clientX: 100, // This should be step 2 based on our 800px width with 16 steps
      clientY: 45, // This should be around G4 position
      dataTransfer: {
        getData: vi.fn(() => "quarter"),
      },
    };

    // Trigger dragOver and drop events
    fireEvent.dragOver(violinStaff, mockDragEvent);
    fireEvent.drop(violinStaff, mockDragEvent);

    // Check if onAddNote was called with expected parameters
    // The exact parameters depend on the calculations in the component,
    // but we expect trackId to be 'track1' and duration to be 'quarter'
    expect(mockProps.onAddNote).toHaveBeenCalled();
    const callArgs = mockProps.onAddNote.mock.calls[0];
    expect(callArgs[0]).toBe("track1"); // trackId
    expect(callArgs[3]).toBe("quarter"); // duration
  });

  it("shows current step indicator when playing", () => {
    const playingProps = {
      ...mockProps,
      isPlaying: true,
      currentStep: 4,
    };

    const { container } = render(<MultiStaffNotation {...playingProps} />);

    // Find current step indicator
    const indicators = container.querySelectorAll(
      'div[class*="absolute h-[90px] w-[2px] bg-primary"]'
    );
    expect(indicators.length).toBe(2); // One for each track

    // INSERT_YOUR_REWRITE_HERE

    // Find the first note in the first track (G4 at step 0)
    const noteDivs = container.querySelectorAll(
      'div[class*="absolute w-[24px] h-[24px]"]'
    );
    const firstNote = noteDivs[0];

    // Click on the note
    fireEvent.click(firstNote);

    // Check if onAddNote was called with the correct parameters to toggle/remove the note
    expect(mockProps.onAddNote).toHaveBeenCalledWith("track1", 0, "G4", 4);
  });

  it("handles changing key signatures", () => {
    // Test with a different key signature
    const gMajorProps = {
      ...mockProps,
      keySignature: "G",
    };

    render(<MultiStaffNotation {...gMajorProps} />);

    // Check if the new key signature is displayed
    expect(screen.getByText("G major")).toBeInTheDocument();
  });
});
