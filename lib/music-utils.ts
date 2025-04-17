import type { Note } from "./types"

export function generateMusicNotation(notes: Note[], key: string, scale: string): string {
  // This is a simplified placeholder function
  // In a real implementation, we would generate actual music notation
  // using a library like VexFlow

  // Sort notes by step
  const sortedNotes = [...notes].sort((a, b) => a.step - b.step)

  // Group notes by step
  const notesByStep: Record<number, string[]> = {}

  sortedNotes.forEach((note) => {
    if (!notesByStep[note.step]) {
      notesByStep[note.step] = []
    }
    notesByStep[note.step].push(note.pitch)
  })

  // Generate a simple text representation
  let notation = `Key: ${key} ${scale}\n\n`

  // Add measures
  for (let step = 0; step < 16; step++) {
    if (step % 4 === 0) {
      notation += step > 0 ? " | " : ""
    }

    const stepNotes = notesByStep[step] || []
    if (stepNotes.length > 0) {
      notation += `[${stepNotes.join(",")}]`
    } else {
      notation += "."
    }
  }

  notation += " |"

  return notation
}

export function getScaleNotes(key: string, scale: string): string[] {
  const chromaticScale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

  // Find the index of the key in the chromatic scale
  const keyIndex = chromaticScale.indexOf(key)

  // Define scale patterns (intervals between notes)
  const scalePatterns: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    blues: [0, 3, 5, 6, 7, 10],
  }

  // Get the pattern for the selected scale
  const pattern = scalePatterns[scale] || scalePatterns.major

  // Generate the scale notes
  return pattern.map((interval) => {
    const noteIndex = (keyIndex + interval) % 12
    return chromaticScale[noteIndex]
  })
}

// Add helper function to convert MIDI note numbers to note names
export function midiToNoteName(midi: number): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  const octave = Math.floor(midi / 12) - 1
  const noteIndex = midi % 12
  return `${noteNames[noteIndex]}${octave}`
}

// Add helper function to convert note names to MIDI note numbers
export function noteNameToMidi(noteName: string): number {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  const [, note, accidental, octave] = noteName.match(/([A-G])(#|b)?([-0-9]+)/) || []

  if (!note) return 60 // Default to middle C if invalid

  let noteIndex = noteNames.indexOf(note)
  if (accidental === "#") noteIndex += 1
  if (accidental === "b") noteIndex -= 1

  return (Number.parseInt(octave) + 1) * 12 + noteIndex
}

// Get the appropriate clef for an instrument
export function getInstrumentClef(instrument: string): "treble" | "bass" {
  // Bass instruments typically use bass clef
  const bassInstruments = ["cello", "bass", "double bass", "tuba", "bassoon", "trombone", "bass guitar", "contrabass"]

  // Check if the instrument name contains any of the bass instruments
  for (const bassInst of bassInstruments) {
    if (instrument.toLowerCase().includes(bassInst)) {
      return "bass"
    }
  }

  // Piano typically uses both clefs, but we'll default to treble
  return "treble"
}

// Add helper function to print music as ASCII
export function printMusicAsASCII(notes: Note[]): string {
  const pitches = ["B5", "A5", "G5", "F5", "E5", "D5", "C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"]
  const grid: string[][] = []

  // Initialize empty grid
  for (let i = 0; i < pitches.length; i++) {
    grid[i] = Array(16).fill("·")
  }

  // Place notes in grid
  notes.forEach((note) => {
    const rowIndex = pitches.indexOf(note.pitch)
    if (rowIndex >= 0 && note.step < 16) {
      grid[rowIndex][note.step] = "●"
    }
  })

  // Convert grid to string
  let result = ""
  for (let i = 0; i < pitches.length; i++) {
    result += pitches[i].padEnd(4, " ") + " | " + grid[i].join(" ") + " |\n"
  }

  // Add step numbers
  result += "     | " + Array.from({ length: 16 }, (_, i) => (i + 1).toString().padStart(1)).join(" ") + " |\n"

  return result
}
