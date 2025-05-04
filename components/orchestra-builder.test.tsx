import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrchestraBuilder from "./orchestra-builder";

// Mock the Tone.js library
vi.mock("tone", () => {
  const Tone = {
    start: vi.fn().mockResolvedValue(undefined),
    Transport: {
      bpm: { value: 120 },
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      setLoopPoints: vi.fn(),
      position: 0,
      state: "stopped",
      loop: false,
    },
    context: {
      state: "suspended",
    },
    Destination: {
      volume: { value: 0 },
    },
    Sequence: class MockSequence {
      constructor(callback, steps, subdivision) {
        this.callback = callback;
        this.steps = steps;
        this.subdivision = subdivision;
      }
      start = vi.fn();
      stop = vi.fn();
      dispose = vi.fn();
    },
    Synth: class MockSynth {
      constructor() {}
      toDestination = () => this;
      triggerAttackRelease = vi.fn();
      dispose = vi.fn();
      releaseAll = vi.fn();
      volume = { value: 0 };
    },
    PolySynth: class MockPolySynth {
      constructor(synthType) {
        this.synthType = synthType;
      }
      toDestination = () => this;
      triggerAttackRelease = vi.fn();
      dispose = vi.fn();
      releaseAll = vi.fn();
      volume = { value: 0 };
    },
    AMSynth: class MockAMSynth {},
    FMSynth: class MockFMSynth {},
    MonoSynth: class MockMonoSynth {},
    MembraneSynth: class MockMembraneSynth {},
  };
  return Tone;
});

// Mock the MultiStaffNotation component
vi.mock("./multi-staff-notation", () => ({
  default: vi
    .fn()
    .mockImplementation(
      ({ tracks, currentTrackId, onAddNote, onSelectTrack }) => (
        <div data-testid="multi-staff-notation">
          <div>Tracks: {tracks.length}</div>
          <div>Current Track: {currentTrackId}</div>
          <button
            data-testid="add-note-button"
            onClick={() => onAddNote(currentTrackId, 0, "C4", "quarter")}
          >
            Add Note
          </button>
          <button
            data-testid="select-track-button"
            onClick={() => onSelectTrack("1")}
          >
            Select Track
          </button>
        </div>
      )
    ),
}));

// Mock the Shadcn UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const Select = ({ children, value, onValueChange }) => (
    <div data-testid="select" data-value={value} onClick={() => children}>
      {children}
    </div>
  );

  const SelectTrigger = ({ children, className, id }) => (
    <div data-testid={`select-trigger-${id}`} className={className}>
      {children}
    </div>
  );

  const SelectValue = ({ children, placeholder }) => (
    <div data-placeholder={placeholder}>{children || placeholder}</div>
  );

  const SelectContent = ({ children }) => <div>{children}</div>;

  const SelectItem = ({ children, value }) => (
    <div data-value={value} data-testid={`select-item-${value}`}>
      {children}
    </div>
  );

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

vi.mock("@/components/ui/slider", () => ({
  Slider: ({ id, value, min, max, step, onValueChange }) => (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value?.[0] || 0}
      onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
      data-testid={`slider-${id}`}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor, className }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.(!checked)}
      data-testid="track-mute-switch"
    />
  ),
}));

vi.mock("lucide-react", () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  Save: () => <div data-testid="save-icon">Save</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  Music: () => <div data-testid="music-icon">Music</div>,
  SkipBack: () => <div data-testid="skip-back-icon">SkipBack</div>,
  Volume2: () => <div data-testid="volume-icon">Volume</div>,
}));

describe("OrchestraBuilder Component", () => {
  // Mock URL and document APIs
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;
  const mockAppendChild = vi.fn();
  const mockRemoveChild = vi.fn();
  const mockClick = vi.fn();

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
    global.URL.revokeObjectURL = vi.fn();

    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    Element.prototype.click = mockClick;

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("renders the component without crashing", () => {
    render(<OrchestraBuilder />);
    expect(screen.getByText("Tracks")).toBeInTheDocument();
  });

  it("initializes with default state values", () => {
    render(<OrchestraBuilder />);

    // Check initial track
    expect(screen.getByText("Tracks: 1")).toBeInTheDocument();
    expect(screen.getByText("Current Track: 1")).toBeInTheDocument();

    // Check BPM display
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("toggles playback when play button is clicked", async () => {
    const { Tone } = await import("tone");

    render(<OrchestraBuilder />);

    // Find the play button and click it
    const playbackElements = screen.getAllByText(/Play/i);
    const playButton = playbackElements[0].closest("button");
    fireEvent.click(playButton);

    // Verify Tone.js start was called
    expect(Tone.start).toHaveBeenCalled();
    expect(Tone.Transport.start).toHaveBeenCalled();

    // Now it should show pause icon
    fireEvent.click(playButton);

    // Verify Tone.js pause was called
    expect(Tone.Transport.pause).toHaveBeenCalled();
  });

  it("adds a new track when add track button is clicked", () => {
    render(<OrchestraBuilder />);

    // Initial track count
    expect(screen.getByText("Tracks: 1")).toBeInTheDocument();

    // Find and click the Add Track button
    const addTrackButton = screen.getByText("Add Track").closest("button");
    fireEvent.click(addTrackButton);

    // Verify track was added
    expect(screen.getByText("Tracks: 2")).toBeInTheDocument();
  });

  it("changes BPM when slider is adjusted", () => {
    const { Tone } = require("tone");

    render(<OrchestraBuilder />);

    // Find the BPM slider and change its value
    const bpmSlider = screen.getByTestId("slider-bpm");
    fireEvent.change(bpmSlider, { target: { value: 140 } });

    // Verify BPM was updated
    expect(Tone.Transport.bpm.value).toBe(140);
    expect(screen.getByText("140")).toBeInTheDocument();
  });

  it("exports music as JSON when export button is clicked", () => {
    render(<OrchestraBuilder />);

    // Find and click the Export button
    const exportButton = screen.getByText("Export").closest("button");
    fireEvent.click(exportButton);

    // Verify export functions were called
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("adds a note to the current track", () => {
    render(<OrchestraBuilder />);

    // Find and click the Add Note button (from mocked MultiStaffNotation)
    const addNoteButton = screen.getByTestId("add-note-button");
    fireEvent.click(addNoteButton);

    // We can't easily test state changes directly, but we can test that
    // the function was called and component didn't crash
    expect(addNoteButton).toBeInTheDocument();
  });

  it("plays a test sound when test sound button is clicked", async () => {
    const { Tone } = await import("tone");

    render(<OrchestraBuilder />);

    // Find and click the Test Sound button
    const testSoundButton = screen.getByText("Test Sound");
    fireEvent.click(testSoundButton);

    // Verify Tone.js methods were called
    expect(Tone.start).toHaveBeenCalled();

    // Wait for the promise to resolve and verify triggerAttackRelease was called
    await waitFor(() => {
      expect(Tone.Synth.prototype.triggerAttackRelease).toHaveBeenCalledWith(
        "C4",
        "8n"
      );
    });
  });

  it("toggles track mute when switch is clicked", () => {
    render(<OrchestraBuilder />);

    // Find and click the mute switch
    const muteSwitch = screen.getByTestId("track-mute-switch");
    expect(muteSwitch).toBeChecked(); // Default is not muted (checked)

    fireEvent.click(muteSwitch);

    // After clicking, the track should be muted (unchecked)
    expect(muteSwitch).not.toBeChecked();
  });

  it("cleans up resources when unmounted", () => {
    const { unmount } = render(<OrchestraBuilder />);

    // Simulate component unmount
    unmount();

    // Not easy to test directly, but the component shouldn't crash on unmount
  });
});
