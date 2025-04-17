"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { Note } from "@/lib/types"

interface StaffNotationProps {
  notes: Note[]
  currentStep: number
  isPlaying: boolean
  onAddNote: (step: number, pitch: string) => void
  keySignature: string
  scale: string
  totalSteps: number
}

// Map of note names to staff positions (0 = middle C, positive = above, negative = below)
const NOTE_POSITIONS: Record<string, number> = {
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
}

// Available pitches for drag and drop
const AVAILABLE_PITCHES = [
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
]

export default function StaffNotation({
  notes,
  currentStep,
  isPlaying,
  onAddNote,
  keySignature,
  scale,
  totalSteps,
}: StaffNotationProps) {
  const staffRef = useRef<HTMLDivElement>(null)
  const [draggedNote, setDraggedNote] = useState<string | null>(null)
  const [hoveredPosition, setHoveredPosition] = useState<{ step: number; pitch: string } | null>(null)
  const [staffWidth, setStaffWidth] = useState(0)
  const [staffHeight, setStaffHeight] = useState(0)

  // Calculate staff dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (staffRef.current) {
        setStaffWidth(staffRef.current.clientWidth)
        setStaffHeight(staffRef.current.clientHeight)
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  // Handle dropping a note on the staff
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    if (!staffRef.current) return

    // Get the dropped note
    const note = e.dataTransfer.getData("note") || draggedNote
    if (!note) return

    // Calculate the step and pitch based on drop position
    const rect = staffRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate step (x position)
    const stepWidth = staffWidth / totalSteps
    const step = Math.floor(x / stepWidth)

    // Calculate pitch (y position)
    const lineHeight = staffHeight / 14 // 14 possible pitches
    const pitchIndex = Math.floor(y / lineHeight)
    const pitch = AVAILABLE_PITCHES[Math.min(pitchIndex, AVAILABLE_PITCHES.length - 1)]

    // Add the note
    if (step >= 0 && step < totalSteps && pitch) {
      onAddNote(step, pitch)
    }

    setDraggedNote(null)
  }

  // Handle dragging over the staff
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()

    if (!staffRef.current) return

    // Calculate the step and pitch based on current position
    const rect = staffRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate step (x position)
    const stepWidth = staffWidth / totalSteps
    const step = Math.floor(x / stepWidth)

    // Calculate pitch (y position)
    const lineHeight = staffHeight / 14 // 14 possible pitches
    const pitchIndex = Math.floor(y / lineHeight)
    const pitch = AVAILABLE_PITCHES[Math.min(pitchIndex, AVAILABLE_PITCHES.length - 1)]

    setHoveredPosition({ step, pitch })
  }

  // Handle clicking on a note to remove it
  const handleNoteClick = (step: number, pitch: string) => {
    onAddNote(step, pitch) // This will toggle the note off
  }

  // Handle clicking on an empty spot to add a note
  const handleStaffClick = (e: React.MouseEvent) => {
    if (!staffRef.current) return

    // Calculate the step and pitch based on click position
    const rect = staffRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate step (x position)
    const stepWidth = staffWidth / totalSteps
    const step = Math.floor(x / stepWidth)

    // Calculate pitch (y position)
    const lineHeight = staffHeight / 14 // 14 possible pitches
    const pitchIndex = Math.floor(y / lineHeight)
    const pitch = AVAILABLE_PITCHES[Math.min(pitchIndex, AVAILABLE_PITCHES.length - 1)]

    // Add the note
    if (step >= 0 && step < totalSteps && pitch) {
      onAddNote(step, pitch)
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold">Music Notation</h2>
        <div className="ml-auto text-sm text-muted-foreground">
          {keySignature} {scale}
        </div>
      </div>

      <div
        className="relative w-full h-[220px] bg-white dark:bg-slate-900 border rounded-md overflow-hidden"
        ref={staffRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleStaffClick}
        onDragLeave={() => setHoveredPosition(null)}
      >
        {/* Staff lines */}
        <div className="absolute w-full h-full">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={`line-${i}`}
              className="absolute w-full h-[1px] bg-gray-400 dark:bg-gray-600"
              style={{ top: `${30 + i * 15}px` }}
            />
          ))}

          {/* Ledger lines (above and below staff) */}
          {[5, 6, 7].map((i) => (
            <div
              key={`ledger-above-${i}`}
              className="absolute w-full h-[1px] bg-gray-300 dark:bg-gray-700"
              style={{ top: `${30 - i * 15}px` }}
            />
          ))}

          {[1, 2, 3].map((i) => (
            <div
              key={`ledger-below-${i}`}
              className="absolute w-full h-[1px] bg-gray-300 dark:bg-gray-700"
              style={{ top: `${30 + (4 + i) * 15}px` }}
            />
          ))}
        </div>

        {/* Clef */}
        <div className="absolute left-2 top-[15px] h-[90px]">
          <img src="/treble-clef.png" alt="Treble clef" className="h-full" />
        </div>

        {/* Measure lines */}
        <div className="absolute w-full h-full">
          {Array.from({ length: totalSteps + 1 }, (_, i) => (
            <div
              key={`measure-${i}`}
              className={`absolute h-[90px] w-[1px] ${i % 4 === 0 ? "bg-gray-500 dark:bg-gray-500" : "bg-gray-300 dark:bg-gray-700"}`}
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
        {notes.map((note, index) => {
          const position = NOTE_POSITIONS[note.pitch] || 0
          const top = 60 - position * 7.5 // 60px is middle C, each step is 7.5px

          return (
            <div
              key={`note-${index}`}
              className={`absolute w-[20px] h-[20px] bg-primary rounded-full flex items-center justify-center cursor-pointer ${
                currentStep === note.step && isPlaying ? "ring-2 ring-primary-foreground" : ""
              }`}
              style={{
                left: `${((note.step + 0.5) / totalSteps) * 100}%`,
                top: `${top}px`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleNoteClick(note.step, note.pitch)
              }}
            >
              <span className="text-[10px] text-white font-bold">{note.pitch.replace(/\d+/, "")}</span>
            </div>
          )
        })}

        {/* Hover indicator for drag and drop */}
        {hoveredPosition && (
          <div
            className="absolute w-[20px] h-[20px] bg-primary/50 rounded-full"
            style={{
              left: `${((hoveredPosition.step + 0.5) / totalSteps) * 100}%`,
              top: `${60 - (NOTE_POSITIONS[hoveredPosition.pitch] || 0) * 7.5}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}

        {/* Note palette */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
          <div className="flex gap-1 bg-muted/80 backdrop-blur-sm p-1 rounded-full">
            {["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"].map((note) => (
              <div
                key={note}
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium cursor-grab"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("note", note)
                  setDraggedNote(note)
                }}
              >
                {note.replace(/\d+/, "")}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 text-sm text-center text-muted-foreground">
        Drag notes onto the staff or click to place them
      </div>
    </div>
  )
}
