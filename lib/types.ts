export type InstrumentType = string

export type NoteDuration = "whole" | "half" | "quarter" | "eighth" | "sixteenth"

export interface Note {
  step: number
  pitch: string
  duration?: NoteDuration
}

export interface Track {
  id: string
  instrument: InstrumentType
  notes: Note[]
  volume: number
  muted: boolean
}
