"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Note, Track, NoteDuration } from "@/lib/types";
import { getInstrumentClef } from "@/lib/music-utils";

interface MultiStaffNotationProps {
  tracks: Track[];
  currentTrackId: string;
  currentStep: number;
  isPlaying: boolean;
  onAddNote: (
    trackId: string,
    step: number,
    pitch: string,
    duration: NoteDuration
  ) => void;
  keySignature: string;
  scale: string;
  totalSteps: number;
  onSelectTrack: (trackId: string) => void;
  noteDuration: number;
}

// Map of note names to staff positions (0 = middle C, positive = above, negative = below)
const NOTE_POSITIONS: Record<string, number> = {
  C2: -21,
  D2: -20,
  E2: -19,
  F2: -18,
  G2: -17,
  A2: -16,
  B2: -15,
  C3: -14,
  D3: -13,
  E3: -12,
  F3: -11,
  G3: -10,
  A3: -9,
  B3: -8,
  C4: -7,
  D4: -6,
  E4: -5,
  F4: -4,
  G4: -3,
  A4: -2,
  B4: -1,
  C5: 0,
  D5: 1,
  E5: 2,
  F5: 3,
  G5: 4,
  A5: 5,
  B5: 6,
  C6: 7,
  D6: 8,
  E6: 9,
  F6: 10,
  G6: 11,
  A6: 12,
  B6: 13,
};

// Available pitches for treble clef
const TREBLE_CLEF_PITCHES = [
  "C6",
  "B5",
  "A5",
  "G5",
  "F5",
  "E5",
  "D5",
  "C5",
  "B4",
  "A4",
  "G4",
  "F4",
  "E4",
  "D4",
  "C4",
  "B3",
  "A3",
  "G3",
  "F3",
  "E3",
  "D3",
  "C3",
];

// Available pitches for bass clef
const BASS_CLEF_PITCHES = [
  "E4",
  "D4",
  "C4",
  "B3",
  "A3",
  "G3",
  "F3",
  "E3",
  "D3",
  "C3",
  "B2",
  "A2",
  "G2",
  "F2",
  "E2",
  "D2",
  "C2",
];

// Key signature accidentals
const KEY_SIGNATURES: Record<string, { sharps: string[]; flats: string[] }> = {
  C: { sharps: [], flats: [] },
  G: { sharps: ["F"], flats: [] },
  D: { sharps: ["F", "C"], flats: [] },
  A: { sharps: ["F", "C", "G"], flats: [] },
  E: { sharps: ["F", "C", "G", "D"], flats: [] },
  B: { sharps: ["F", "C", "G", "D", "A"], flats: [] },
  "F#": { sharps: ["F", "C", "G", "D", "A", "E"], flats: [] },
  "C#": { sharps: ["F", "C", "G", "D", "A", "E", "B"], flats: [] },
  F: { sharps: [], flats: ["B"] },
  Bb: { sharps: [], flats: ["B", "E"] },
  Eb: { sharps: [], flats: ["B", "E", "A"] },
  Ab: { sharps: [], flats: ["B", "E", "A", "D"] },
  Db: { sharps: [], flats: ["B", "E", "A", "D", "G"] },
  Gb: { sharps: [], flats: ["B", "E", "A", "D", "G", "C"] },
  Cb: { sharps: [], flats: ["B", "E", "A", "D", "G", "C", "F"] },
};

export default function MultiStaffNotation({
  tracks,
  currentTrackId,
  currentStep,
  isPlaying,
  onAddNote,
  keySignature,
  scale,
  totalSteps,
  onSelectTrack,
  noteDuration,
}: MultiStaffNotationProps) {
  const staffRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hoveredPosition, setHoveredPosition] = useState<{
    trackId: string;
    step: number;
    pitch: string;
  } | null>(null);
  const [staffDimensions, setStaffDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [activeDuration, setActiveDuration] = useState<NoteDuration>("quarter");
  const [timeSignature, setTimeSignature] = useState({
    numerator: 4,
    denominator: 4,
  });

  // Calculate staff dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions: Record<string, { width: number; height: number }> =
        {};

      tracks.forEach((track) => {
        const staffElement = staffRefs.current[track.id];
        if (staffElement) {
          newDimensions[track.id] = {
            width: staffElement.clientWidth,
            height: staffElement.clientHeight,
          };
        }
      });

      setStaffDimensions(newDimensions);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, [tracks]);

  // Handle dropping a note on the staff
  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();

    const staffElement = staffRefs.current[trackId];
    if (!staffElement) return;

    // Get the dropped note duration
    const duration =
      (e.dataTransfer.getData("noteDuration") as NoteDuration) ||
      activeDuration;
    if (!duration) return;

    // Calculate the step and pitch based on drop position
    const rect = staffElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate step (x position)
    const stepWidth = staffDimensions[trackId]?.width / totalSteps || 0;
    const step = Math.floor(x / stepWidth);

    // Get the appropriate pitch list based on clef
    const track = tracks.find((t) => t.id === trackId);
    const clef = track ? getInstrumentClef(track.instrument) : "treble";

    // Calculate pitch based on y position
    // Staff lines are at 30, 45, 60, 75, 90 px
    // Each pitch is 7.5px apart
    const pitchPosition = Math.round((y - 30) / 7.5);

    let pitch: string;
    if (clef === "treble") {
      // In treble clef, the lines from bottom to top are E4, G4, B4, D5, F5
      // The spaces are F4, A4, C5, E5
      const pitchIndex = Math.min(
        Math.max(0, pitchPosition),
        TREBLE_CLEF_PITCHES.length - 1
      );
      pitch = TREBLE_CLEF_PITCHES[pitchIndex];
    } else {
      // In bass clef, the lines from bottom to top are G2, B2, D3, F3, A3
      // The spaces are A2, C3, E3, G3
      const pitchIndex = Math.min(
        Math.max(0, pitchPosition),
        BASS_CLEF_PITCHES.length - 1
      );
      pitch = BASS_CLEF_PITCHES[pitchIndex];
    }

    // Add the note
    if (step >= 0 && step < totalSteps && pitch) {
      onAddNote(trackId, step, pitch, duration);
    }

    setHoveredPosition(null);
  };

  // Handle dragging over the staff
  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();

    const staffElement = staffRefs.current[trackId];
    if (!staffElement) return;

    // Calculate the step and pitch based on current position
    const rect = staffElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate step (x position)
    const stepWidth = staffDimensions[trackId]?.width / totalSteps || 0;
    const step = Math.floor(x / stepWidth);

    // Get the appropriate pitch list based on clef
    const track = tracks.find((t) => t.id === trackId);
    const clef = track ? getInstrumentClef(track.instrument) : "treble";

    // Calculate pitch based on y position
    // Staff lines are at 30, 45, 60, 75, 90 px
    // Each pitch is 7.5px apart
    const pitchPosition = Math.round((y - 30) / 7.5);

    let pitch: string;
    if (clef === "treble") {
      // In treble clef, the lines from bottom to top are E4, G4, B4, D5, F5
      // The spaces are F4, A4, C5, E5
      const pitchIndex = Math.min(
        Math.max(0, pitchPosition),
        TREBLE_CLEF_PITCHES.length - 1
      );
      pitch = TREBLE_CLEF_PITCHES[pitchIndex];
    } else {
      // In bass clef, the lines from bottom to top are G2, B2, D3, F3, A3
      // The spaces are A2, C3, E3, G3
      const pitchIndex = Math.min(
        Math.max(0, pitchPosition),
        BASS_CLEF_PITCHES.length - 1
      );
      pitch = BASS_CLEF_PITCHES[pitchIndex];
    }

    setHoveredPosition({ trackId, step, pitch });
  };

  // Handle clicking on a note to remove it
  const handleNoteClick = (trackId: string, step: number, pitch: string) => {
    onAddNote(trackId, step, pitch, noteDuration as any); // This will toggle the note off
  };

  // Group notes by step for beaming
  const groupNotesByStep = (notes: Note[]) => {
    const groupedNotes: Record<number, Note[]> = {};

    notes.forEach((note) => {
      if (!groupedNotes[note.step]) {
        groupedNotes[note.step] = [];
      }
      groupedNotes[note.step].push(note);
    });

    return groupedNotes;
  };

  // Render a note with the appropriate symbol based on duration
  const renderNote = (note: Note, trackId: string, isCurrentStep: boolean) => {
    const position = NOTE_POSITIONS[note.pitch] || 0;
    const top = 60 - position * 7.5; // 60px is middle C, each step is 7.5px

    // Determine if the stem should go up or down based on position
    const stemDirection = position < 0 ? "up" : "down";

    // Render the note based on its duration and stem direction
    return (
      <div
        key={`${trackId}-${note.step}-${note.pitch}`}
        className={`absolute w-[24px] h-[24px] flex items-center justify-center cursor-pointer ${
          isCurrentStep ? "ring-2 ring-primary-foreground" : ""
        }`}
        style={{
          left: `${((note.step + 0.5) / totalSteps) * 100}%`,
          top: `${top}px`,
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleNoteClick(trackId, note.step, note.pitch);
        }}
      >
        {renderNoteSymbol(note.duration || "quarter", stemDirection)}
      </div>
    );
  };

  // Helper function to render the appropriate note symbol
  const renderNoteSymbol = (
    duration: NoteDuration,
    stemDirection: "up" | "down"
  ) => {
    if (duration === "whole") {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="24"
          height="24"
        >
          <ellipse
            cx="12"
            cy="12"
            rx="8"
            ry="5"
            stroke="black"
            strokeWidth="1"
            fill="white"
          />
        </svg>
      );
    } else if (duration === "half") {
      if (stemDirection === "up") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="10"
              cy="16"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="white"
            />
            <line
              x1="16"
              y1="16"
              x2="16"
              y2="4"
              stroke="black"
              strokeWidth="1"
            />
          </svg>
        );
      } else {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="14"
              cy="8"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="white"
            />
            <line x1="8" y1="8" x2="8" y2="20" stroke="black" strokeWidth="1" />
          </svg>
        );
      }
    } else if (duration === "quarter") {
      if (stemDirection === "up") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="10"
              cy="16"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="black"
            />
            <line
              x1="16"
              y1="16"
              x2="16"
              y2="4"
              stroke="black"
              strokeWidth="1"
            />
          </svg>
        );
      } else {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="14"
              cy="8"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="black"
            />
            <line x1="8" y1="8" x2="8" y2="20" stroke="black" strokeWidth="1" />
          </svg>
        );
      }
    } else if (duration === "eighth") {
      if (stemDirection === "up") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="10"
              cy="16"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="black"
            />
            <line
              x1="16"
              y1="16"
              x2="16"
              y2="4"
              stroke="black"
              strokeWidth="1"
            />
            <path
              d="M16,4 C19,6 22,8 22,10"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        );
      } else {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="14"
              cy="8"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="black"
            />
            <line x1="8" y1="8" x2="8" y2="20" stroke="black" strokeWidth="1" />
            <path
              d="M8,20 C5,18 2,16 2,14"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        );
      }
    } else if (duration === "sixteenth") {
      if (stemDirection === "up") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="10"
              cy="16"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="black"
            />
            <line
              x1="16"
              y1="16"
              x2="16"
              y2="4"
              stroke="black"
              strokeWidth="1"
            />
            <path
              d="M16,4 C19,6 22,8 22,10"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M16,8 C19,10 22,12 22,14"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        );
      } else {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <ellipse
              cx="14"
              cy="8"
              rx="6"
              ry="4"
              stroke="black"
              strokeWidth="1"
              fill="black"
            />
            <line x1="8" y1="8" x2="8" y2="20" stroke="black" strokeWidth="1" />
            <path
              d="M8,20 C5,18 2,16 2,14"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M8,16 C5,14 2,12 2,10"
              stroke="black"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        );
      }
    }

    // Default to quarter note
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
      >
        <ellipse
          cx="12"
          cy="12"
          rx="6"
          ry="4"
          stroke="black"
          strokeWidth="1"
          fill="black"
        />
        <line x1="18" y1="12" x2="18" y2="4" stroke="black" strokeWidth="1" />
      </svg>
    );
  };

  // Render the treble clef using the provided SVG
  const renderTrebleClef = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 95.116 153.12"
      width="30"
      height="80"
    >
      <path
        d="m51.688 5.25c-5.427-0.1409-11.774 12.818-11.563 24.375 0.049 3.52 1.16 10.659 2.781 19.625-10.223 10.581-22.094 21.44-22.094 35.688-0.163 13.057 7.817 29.692 26.75 29.532 2.906-0.02 5.521-0.38 7.844-1 1.731 9.49 2.882 16.98 2.875 20.44 0.061 13.64-17.86 14.99-18.719 7.15 3.777-0.13 6.782-3.13 6.782-6.84 0-3.79-3.138-6.88-7.032-6.88-2.141 0-4.049 0.94-5.343 2.41-0.03 0.03-0.065 0.06-0.094 0.09-0.292 0.31-0.538 0.68-0.781 1.1-0.798 1.35-1.316 3.29-1.344 6.06 0 11.42 28.875 18.77 28.875-3.75 0.045-3.03-1.258-10.72-3.156-20.41 20.603-7.45 15.427-38.04-3.531-38.184-1.47 0.015-2.887 0.186-4.25 0.532-1.08-5.197-2.122-10.241-3.032-14.876 7.199-7.071 13.485-16.224 13.344-33.093 0.022-12.114-4.014-21.828-8.312-21.969zm1.281 11.719c2.456-0.237 4.406 2.043 4.406 7.062 0.199 8.62-5.84 16.148-13.031 23.719-0.688-4.147-1.139-7.507-1.188-9.5 0.204-13.466 5.719-20.886 9.813-21.281zm-7.719 44.687c0.877 4.515 1.824 9.272 2.781 14.063-12.548 4.464-18.57 21.954-0.781 29.781-10.843-9.231-5.506-20.158 2.312-22.062 1.966 9.816 3.886 19.502 5.438 27.872-2.107 0.74-4.566 1.17-7.438 1.19-7.181 0-21.531-4.57-21.531-21.875 0-14.494 10.047-20.384 19.219-28.969zm6.094 21.469c0.313-0.019 0.652-0.011 0.968 0 13.063 0 17.99 20.745 4.688 27.375-1.655-8.32-3.662-17.86-5.656-27.375z"
        stroke="#000"
        fill="none"
        strokeWidth="1"
      />
    </svg>
  );

  // Render the bass clef
  const renderBassClef = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 40"
      width="30"
      height="40"
    >
      <path
        d="M3,20 C3,14 8,10 15,12 C15,16 12,20 8,20 C4,20 3,16 3,14 C3,12 4,8 8,8"
        stroke="black"
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="18" cy="12" r="1.5" fill="black" />
      <circle cx="18" cy="18" r="1.5" fill="black" />
    </svg>
  );

  // Render key signature accidentals
  const renderKeySignature = (clef: "treble" | "bass", key: string) => {
    if (!KEY_SIGNATURES[key]) return null;

    const { sharps, flats } = KEY_SIGNATURES[key];

    // Positions for sharps and flats on the staff
    const sharpPositions = {
      treble: { F: 4, C: 1, G: 5, D: 2, A: 6, E: 3, B: 7 },
      bass: { F: 6, C: 3, G: 7, D: 4, A: 1, E: 5, B: 2 },
    };

    const flatPositions = {
      treble: { B: 0, E: 3, A: -1, D: 2, G: -2, C: 1, F: -3 },
      bass: { B: 2, E: 5, A: 1, D: 4, G: 0, C: 3, F: -1 },
    };

    return (
      <div className="absolute left-10 top-[15px] h-[90px]">
        {sharps.map((note, index) => {
          const position =
            sharpPositions[clef][note as keyof typeof sharpPositions.treble];
          const top = 60 - position * 7.5;

          return (
            <div
              key={`sharp-${note}`}
              className="absolute"
              style={{
                left: `${index * 8}px`,
                top: `${top - 10}px`,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 10 24"
                width="10"
                height="24"
              >
                <path
                  d="M1,0 L1,24 M9,6 L9,18 M1,12 L9,8 M1,16 L9,12"
                  stroke="black"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
          );
        })}

        {flats.map((note, index) => {
          const position =
            flatPositions[clef][note as keyof typeof flatPositions.treble];
          const top = 60 - position * 7.5;

          return (
            <div
              key={`flat-${note}`}
              className="absolute"
              style={{
                left: `${index * 8}px`,
                top: `${top - 10}px`,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 10 24"
                width="10"
                height="24"
              >
                <path
                  d="M2,6 L2,24 M2,12 C2,12 8,10 8,14 C8,18 2,16 2,16"
                  stroke="black"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
          );
        })}
      </div>
    );
  };

  // Render time signature
  const renderTimeSignature = () => (
    <div className="absolute left-[60px] top-[30px] h-[60px] flex flex-col items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 60"
        width="20"
        height="60"
      >
        <text
          x="10"
          y="25"
          fontSize="24"
          fontFamily="serif"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          4
        </text>
        <text
          x="10"
          y="55"
          fontSize="24"
          fontFamily="serif"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          4
        </text>
      </svg>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold">Orchestra Score</h2>
        <div className="ml-auto text-sm text-muted-foreground">
          {keySignature} {scale}
        </div>
      </div>

      <div className="space-y-8">
        {tracks.map((track) => {
          const isCurrentTrack = track.id === currentTrackId;
          const clef = getInstrumentClef(track.instrument);

          return (
            <div
              key={track.id}
              className={`p-4 rounded-md border transition-colors ${
                isCurrentTrack
                  ? "border-primary/50 bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelectTrack(track.id)}
            >
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium capitalize">
                  {track.instrument}
                </h3>
                <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                  {clef} clef
                </span>
                {track.muted && (
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                    Muted
                  </span>
                )}
              </div>

              <div
                className="relative w-full h-[180px] bg-white dark:bg-slate-900 border rounded-md overflow-hidden"
                ref={(el) => {
                  if (el) staffRefs.current[track.id] = el;
                }}
                onDragOver={(e) => handleDragOver(e, track.id)}
                onDrop={(e) => handleDrop(e, track.id)}
                onDragLeave={() => setHoveredPosition(null)}
              >
                {/* Staff lines */}
                <div className="absolute w-full h-full">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={`line-${track.id}-${i}`}
                      className="absolute w-full h-[1px] bg-gray-400 dark:bg-gray-600"
                      style={{ top: `${30 + i * 15}px` }}
                    />
                  ))}

                  {/* Ledger lines (above and below staff) */}
                  {[5, 6, 7].map((i) => (
                    <div
                      key={`ledger-above-${track.id}-${i}`}
                      className="absolute w-full h-[1px] bg-gray-300 dark:bg-gray-700"
                      style={{ top: `${30 - i * 15}px` }}
                    />
                  ))}

                  {[1, 2, 3].map((i) => (
                    <div
                      key={`ledger-below-${track.id}-${i}`}
                      className="absolute w-full h-[1px] bg-gray-300 dark:bg-gray-700"
                      style={{ top: `${30 + (4 + i) * 15}px` }}
                    />
                  ))}
                </div>

                {/* Clef */}
                <div className="absolute left-2 top-[15px] h-[90px] flex items-center">
                  {clef === "bass" ? renderBassClef() : renderTrebleClef()}
                </div>

                {/* Key Signature */}
                {renderKeySignature(clef, keySignature)}

                {/* Time Signature */}
                {renderTimeSignature()}

                {/* Measure lines */}
                <div className="absolute w-full h-full">
                  {Array.from({ length: totalSteps + 1 }, (_, i) => (
                    <div
                      key={`measure-${track.id}-${i}`}
                      className={`absolute h-[90px] w-[1px] ${
                        i % 4 === 0
                          ? "bg-gray-500 dark:bg-gray-500"
                          : "bg-gray-300 dark:bg-gray-700"
                      }`}
                      style={{
                        left: `${(i / totalSteps) * 100}%`,
                        top: "15px",
                      }}
                    />
                  ))}
                </div>

                {/* Current step indicator */}
                {isPlaying && (
                  <div
                    className="absolute h-[90px] w-[2px] bg-primary"
                    style={{
                      left: `${((currentStep + 0.5) / totalSteps) * 100}%`,
                      top: "15px",
                    }}
                  />
                )}

                {/* Notes */}
                {track.notes.map((note) =>
                  renderNote(
                    note,
                    track.id,
                    currentStep === note.step && isPlaying
                  )
                )}

                {/* Hover indicator for drag and drop */}
                {hoveredPosition && hoveredPosition.trackId === track.id && (
                  <div
                    className="absolute w-[20px] h-[20px] bg-primary/50 rounded-full"
                    style={{
                      left: `${
                        ((hoveredPosition.step + 0.5) / totalSteps) * 100
                      }%`,
                      top: `${
                        60 - (NOTE_POSITIONS[hoveredPosition.pitch] || 0) * 7.5
                      }px`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
