"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Play, Pause, Save, Plus, Trash2, Music, SkipBack, Volume2 } from "lucide-react"
import * as Tone from "tone"
import MultiStaffNotation from "./multi-staff-notation"
import type { InstrumentType, Note, Track, NoteDuration } from "@/lib/types"

export default function OrchestraBuilder() {
  const [tracks, setTracks] = useState<Track[]>([{ id: "1", instrument: "piano", notes: [], volume: 0, muted: false }])
  const [currentTrackId, setCurrentTrackId] = useState("1")
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [key, setKey] = useState("C")
  const [scale, setScale] = useState("major")
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(16)
  const [activeDuration, setActiveDuration] = useState<NoteDuration>("quarter")
  const [timeSignature, setTimeSignature] = useState({ numerator: 4, denominator: 4 })
  const sequencerRef = useRef<any>(null)
  const synthsRef = useRef<Record<string, any>>({})

  // Initialize Tone.js
  useEffect(() => {
    console.log("Initializing Tone.js synths for tracks:", tracks)

    // Create synths for each track with appropriate instrument sounds
    tracks.forEach((track) => {
      if (!synthsRef.current[track.id]) {
        console.log(`Creating synth for track ${track.id} (${track.instrument})`)

        // Use different synth types based on instrument category
        let synth

        switch (track.instrument) {
          case "piano":
          case "harpsichord":
          case "organ":
          case "synthesizer":
            synth = new Tone.PolySynth(Tone.Synth).toDestination()
            break
          case "violin":
          case "viola":
          case "cello":
          case "guitar":
          case "harp":
            synth = new Tone.PolySynth(Tone.AMSynth).toDestination()
            break
          case "flute":
          case "clarinet":
          case "oboe":
          case "bassoon":
            synth = new Tone.PolySynth(Tone.FMSynth).toDestination()
            break
          case "trumpet":
          case "trombone":
          case "french horn":
          case "tuba":
            synth = new Tone.PolySynth(Tone.MonoSynth).toDestination()
            break
          case "drums":
          case "timpani":
          case "xylophone":
          case "marimba":
            synth = new Tone.PolySynth(Tone.MembraneSynth).toDestination()
            break
          default:
            synth = new Tone.PolySynth(Tone.Synth).toDestination()
        }

        synth.volume.value = track.volume
        synthsRef.current[track.id] = synth
      }
    })

    // Update synth volumes
    tracks.forEach((track) => {
      if (synthsRef.current[track.id]) {
        synthsRef.current[track.id].volume.value = track.volume
      }
    })

    // Add a test sound function
    window.playTestSound = () => {
      if (Tone.context.state !== "running") {
        Tone.start().then(() => {
          const testSynth = new Tone.Synth().toDestination()
          testSynth.triggerAttackRelease("C4", "8n")
          console.log("Test sound played")
          testSynth.dispose()
        })
      } else {
        const testSynth = new Tone.Synth().toDestination()
        testSynth.triggerAttackRelease("C4", "8n")
        console.log("Test sound played")
        testSynth.dispose()
      }
    }

    console.log("Synths initialized:", Object.keys(synthsRef.current))

    // Only clean up when component unmounts, not on every render
    return () => {
      // Clean up all synths when component unmounts
      Object.values(synthsRef.current).forEach((synth: any) => {
        synth.dispose()
      })
      if (sequencerRef.current) {
        sequencerRef.current.dispose()
      }
      // Clear the refs
      synthsRef.current = {}
      sequencerRef.current = null
    }
  }, [tracks]) // Only re-run when tracks change

  // Update tempo
  useEffect(() => {
    Tone.Transport.bpm.value = bpm
  }, [bpm])

  // Handle play/pause
  const togglePlayback = async () => {
    try {
      // Always ensure Tone.js is started with user interaction
      if (Tone.context.state !== "running") {
        console.log("Starting Tone.js audio context...")
        await Tone.start()
        console.log("Tone.js audio context started successfully")
      }

      if (isPlaying) {
        console.log("Pausing playback")
        Tone.Transport.pause()
        setIsPlaying(false)
      } else {
        console.log("Starting playback")

        // Make sure all tracks have synths before playing
        let allSynthsReady = true
        tracks.forEach((track) => {
          if (!synthsRef.current[track.id]) {
            allSynthsReady = false
          }
        })

        // If any synths are missing, recreate them
        if (!allSynthsReady) {
          console.log("Some synths are missing, recreating them")
          tracks.forEach((track) => {
            if (!synthsRef.current[track.id]) {
              const synth = new Tone.PolySynth(Tone.Synth).toDestination()
              synth.volume.value = track.volume
              synthsRef.current[track.id] = synth
            }
          })
        }

        // Recreate sequence each time to ensure latest notes are used
        createSequence()

        // Set the loop points and start from beginning
        Tone.Transport.setLoopPoints(0, `${totalSteps}*8n`)
        Tone.Transport.loop = true
        Tone.Transport.position = 0

        Tone.Transport.start()
        setIsPlaying(true)

        // Debug info
        console.log("BPM:", Tone.Transport.bpm.value)
        console.log("Tracks:", tracks)
      }
    } catch (error) {
      console.error("Error toggling playback:", error)
    }
  }

  const resetPlayback = () => {
    setCurrentStep(0)
    if (Tone.Transport.state !== "stopped") {
      Tone.Transport.position = 0
    }
  }

  const createSequence = () => {
    console.log("Creating new sequence")

    // Dispose of existing sequence if any
    if (sequencerRef.current) {
      sequencerRef.current.dispose()
      sequencerRef.current = null
    }

    // Create a new sequence
    const seq = new Tone.Sequence(
      (time, step) => {
        setCurrentStep(step)

        // Play notes for each track at this step
        tracks.forEach((track) => {
          if (!track.muted) {
            const notesToPlay = track.notes.filter((note) => {
              // Check if the note should be played at this step
              // For longer durations, we only trigger at the start step
              return note.step === step
            })

            if (notesToPlay.length > 0 && synthsRef.current[track.id]) {
              try {
                const synth = synthsRef.current[track.id]

                // Skip if synth is not available
                if (!synth || typeof synth.triggerAttackRelease !== "function") {
                  console.warn(`Synth for track ${track.id} is not available or was disposed`)
                  return
                }

                notesToPlay.forEach((note) => {
                  // Convert duration to Tone.js format
                  let duration
                  switch (note.duration) {
                    case "whole":
                      duration = "1n"
                      break
                    case "half":
                      duration = "2n"
                      break
                    case "quarter":
                      duration = "4n"
                      break
                    case "eighth":
                      duration = "8n"
                      break
                    case "sixteenth":
                      duration = "16n"
                      break
                    default:
                      duration = "8n"
                  }

                  // Make sure we're using the correct format for Tone.js
                  synth.triggerAttackRelease(note.pitch, duration, time)
                })
              } catch (error) {
                console.error(`Error playing notes for track ${track.id}:`, error)
              }
            }
          }
        })
      },
      Array.from({ length: totalSteps }, (_, i) => i),
      "8n",
    )

    seq.start(0)
    sequencerRef.current = seq
  }

  const addTrack = () => {
    const newTrackId = (tracks.length + 1).toString()
    setTracks([
      ...tracks,
      {
        id: newTrackId,
        instrument: "piano",
        notes: [],
        volume: 0,
        muted: false,
      },
    ])
    setCurrentTrackId(newTrackId)
  }

  const removeTrack = (id: string) => {
    if (tracks.length <= 1) return

    // Properly dispose of the synth before removing the track
    if (synthsRef.current[id]) {
      try {
        // Stop any playing notes first
        synthsRef.current[id].releaseAll()
        // Dispose the synth
        synthsRef.current[id].dispose()
        // Remove from the ref
        delete synthsRef.current[id]
      } catch (error) {
        console.error(`Error disposing synth for track ${id}:`, error)
      }
    }

    setTracks(tracks.filter((track) => track.id !== id))

    // If we're removing the current track, select another one
    if (currentTrackId === id) {
      const remainingTracks = tracks.filter((track) => track.id !== id)
      setCurrentTrackId(remainingTracks[0].id)
    }
  }

  const updateTrackInstrument = (id: string, instrument: InstrumentType) => {
    // Dispose of the old synth first
    if (synthsRef.current[id]) {
      try {
        synthsRef.current[id].releaseAll()
        synthsRef.current[id].dispose()
        delete synthsRef.current[id]
      } catch (error) {
        console.error(`Error disposing synth for track ${id}:`, error)
      }
    }

    // Update the track
    setTracks(tracks.map((track) => (track.id === id ? { ...track, instrument } : track)))

    // Create a new synth with the appropriate type
    let synth
    switch (instrument) {
      case "piano":
      case "harpsichord":
      case "organ":
      case "synthesizer":
        synth = new Tone.PolySynth(Tone.Synth).toDestination()
        break
      case "violin":
      case "viola":
      case "cello":
      case "guitar":
      case "harp":
        synth = new Tone.PolySynth(Tone.AMSynth).toDestination()
        break
      case "flute":
      case "clarinet":
      case "oboe":
      case "bassoon":
        synth = new Tone.PolySynth(Tone.FMSynth).toDestination()
        break
      case "trumpet":
      case "trombone":
      case "french horn":
      case "tuba":
        synth = new Tone.PolySynth(Tone.MonoSynth).toDestination()
        break
      case "drums":
      case "timpani":
      case "xylophone":
      case "marimba":
        synth = new Tone.PolySynth(Tone.MembraneSynth).toDestination()
        break
      default:
        synth = new Tone.PolySynth(Tone.Synth).toDestination()
    }

    // Get the volume from the track
    const track = tracks.find((t) => t.id === id)
    if (track) {
      synth.volume.value = track.volume
    }

    // Store the new synth
    synthsRef.current[id] = synth
  }

  const updateTrackVolume = (id: string, volume: number) => {
    setTracks(tracks.map((track) => (track.id === id ? { ...track, volume } : track)))

    // Update the synth volume in real-time
    if (synthsRef.current[id]) {
      synthsRef.current[id].volume.value = volume
    }
  }

  const toggleTrackMute = (id: string) => {
    setTracks(tracks.map((track) => (track.id === id ? { ...track, muted: !track.muted } : track)))
  }

  const addNote = (trackId: string, step: number, pitch: string, duration: NoteDuration = activeDuration) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    // Check if note already exists at this step and pitch
    const noteExists = track.notes.some((note) => note.step === step && note.pitch === pitch)

    if (noteExists) {
      // Remove the note if it exists
      setTracks(
        tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                notes: t.notes.filter((note) => !(note.step === step && note.pitch === pitch)),
              }
            : t,
        ),
      )
    } else {
      // Add the note if it doesn't exist
      const newNote: Note = { step, pitch, duration }
      setTracks(tracks.map((t) => (t.id === trackId ? { ...t, notes: [...t.notes, newNote] } : t)))
    }
  }

  const clearTrack = (trackId: string) => {
    setTracks(tracks.map((track) => (track.id === trackId ? { ...track, notes: [] } : track)))
  }

  const exportMusic = () => {
    const musicData = {
      tracks,
      bpm,
      key,
      scale,
      timeSignature,
    }

    const blob = new Blob([JSON.stringify(musicData)], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `orchestra-composition-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Add this useEffect for proper cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Stop any playing sounds
      if (Tone.Transport.state !== "stopped") {
        Tone.Transport.stop()
      }

      // Dispose all synths
      Object.values(synthsRef.current).forEach((synth: any) => {
        try {
          if (synth && typeof synth.dispose === "function") {
            synth.dispose()
          }
        } catch (error) {
          console.error("Error disposing synth:", error)
        }
      })

      // Dispose sequencer
      if (sequencerRef.current) {
        try {
          sequencerRef.current.dispose()
        } catch (error) {
          console.error("Error disposing sequencer:", error)
        }
      }

      // Clear refs
      synthsRef.current = {}
      sequencerRef.current = null
    }
  }, []) // Empty dependency array means this runs only on unmount

  // Function to render note SVG for the palette
  const renderNoteSVG = (duration: NoteDuration) => {
    switch (duration) {
      case "whole":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
            <ellipse cx="12" cy="12" rx="8" ry="5" stroke="black" strokeWidth="1" fill="white" />
          </svg>
        )
      case "half":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
            <ellipse cx="10" cy="16" rx="6" ry="4" stroke="black" strokeWidth="1" fill="white" />
            <line x1="16" y1="16" x2="16" y2="4" stroke="black" strokeWidth="1" />
          </svg>
        )
      case "quarter":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
            <ellipse cx="10" cy="16" rx="6" ry="4" stroke="black" strokeWidth="1" fill="black" />
            <line x1="16" y1="16" x2="16" y2="4" stroke="black" strokeWidth="1" />
          </svg>
        )
      case "eighth":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
            <ellipse cx="10" cy="16" rx="6" ry="4" stroke="black" strokeWidth="1" fill="black" />
            <line x1="16" y1="16" x2="16" y2="4" stroke="black" strokeWidth="1" />
            <path d="M16,4 C19,6 22,8 22,10" stroke="black" strokeWidth="1" fill="none" />
          </svg>
        )
      case "sixteenth":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
            <ellipse cx="10" cy="16" rx="6" ry="4" stroke="black" strokeWidth="1" fill="black" />
            <line x1="16" y1="16" x2="16" y2="4" stroke="black" strokeWidth="1" />
            <path d="M16,4 C19,6 22,8 22,10" stroke="black" strokeWidth="1" fill="none" />
            <path d="M16,8 C19,10 22,12 22,14" stroke="black" strokeWidth="1" fill="none" />
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
            <ellipse cx="10" cy="16" rx="6" ry="4" stroke="black" strokeWidth="1" fill="black" />
            <line x1="16" y1="16" x2="16" y2="4" stroke="black" strokeWidth="1" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Playback Controls - Moved to the top */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button onClick={resetPlayback} variant="outline" size="icon" className="h-10 w-10 rounded-full">
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button onClick={togglePlayback} variant="default" size="icon" className="h-10 w-10 rounded-full">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
              </div>

              <Button
                onClick={() => {
                  if (Tone.context.state !== "running") {
                    Tone.start().then(() => {
                      const testSynth = new Tone.Synth().toDestination()
                      testSynth.triggerAttackRelease("C4", "8n")
                      setTimeout(() => testSynth.dispose(), 1000)
                    })
                  } else {
                    const testSynth = new Tone.Synth().toDestination()
                    testSynth.triggerAttackRelease("C4", "8n")
                    setTimeout(() => testSynth.dispose(), 1000)
                  }
                }}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                Test Sound
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="master-volume" className="text-sm font-medium sr-only">
                  Master Volume
                </Label>
                <div className="w-32">
                  <Slider
                    id="master-volume"
                    defaultValue={[0]}
                    min={-40}
                    max={10}
                    step={1}
                    onValueChange={(value) => {
                      // Adjust master volume
                      Tone.Destination.volume.value = value[0]
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="bpm" className="text-sm font-medium">
                  BPM
                </Label>
                <div className="w-32">
                  <Slider
                    id="bpm"
                    value={[bpm]}
                    min={60}
                    max={200}
                    step={1}
                    onValueChange={(value) => setBpm(value[0])}
                  />
                </div>
                <span className="text-sm font-mono w-8">{bpm}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="key" className="text-sm font-medium">
                  Key
                </Label>
                <Select value={key} onValueChange={setKey}>
                  <SelectTrigger id="key" className="w-20">
                    <SelectValue placeholder="Key" />
                  </SelectTrigger>
                  <SelectContent>
                    {["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"].map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="scale" className="text-sm font-medium">
                  Scale
                </Label>
                <Select value={scale} onValueChange={setScale}>
                  <SelectTrigger id="scale" className="w-28">
                    <SelectValue placeholder="Scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="pentatonic">Pentatonic</SelectItem>
                    <SelectItem value="blues">Blues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="timeSignature" className="text-sm font-medium">
                  Time
                </Label>
                <Select
                  value={`${timeSignature.numerator}/${timeSignature.denominator}`}
                  onValueChange={(value) => {
                    const [numerator, denominator] = value.split("/").map(Number)
                    setTimeSignature({ numerator, denominator })
                  }}
                >
                  <SelectTrigger id="timeSignature" className="w-20">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4/4">4/4</SelectItem>
                    <SelectItem value="3/4">3/4</SelectItem>
                    <SelectItem value="2/4">2/4</SelectItem>
                    <SelectItem value="6/8">6/8</SelectItem>
                    <SelectItem value="9/8">9/8</SelectItem>
                    <SelectItem value="12/8">12/8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={exportMusic} variant="outline" size="sm" className="gap-1">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Staff Notation */}
      <Card className="w-full">
        <CardContent className="p-4 md:p-6">
          <MultiStaffNotation
            tracks={tracks}
            currentTrackId={currentTrackId}
            currentStep={currentStep}
            isPlaying={isPlaying}
            onAddNote={addNote}
            keySignature={key}
            scale={scale}
            totalSteps={totalSteps}
            onSelectTrack={setCurrentTrackId}
          />

          {/* Note Palette */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-medium mb-4 text-center">Drag Notes to Staff</h3>

            <div className="flex flex-wrap justify-center gap-6">
              {["whole", "half", "quarter", "eighth", "sixteenth"].map((duration) => (
                <div
                  key={duration}
                  className={`flex flex-col items-center gap-1 cursor-grab ${
                    activeDuration === duration ? "ring-2 ring-primary rounded-md" : ""
                  }`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("noteDuration", duration)
                    setActiveDuration(duration as NoteDuration)
                  }}
                  onClick={() => setActiveDuration(duration as NoteDuration)}
                >
                  {renderNoteSVG(duration as NoteDuration)}
                  <span className="text-xs capitalize">{duration}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Select a note type and drag it to the staff. The vertical position determines the pitch.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Track Management */}
      <Card className="w-full">
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tracks</h2>
            <Button onClick={addTrack} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Track
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`p-3 rounded-md border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  track.id === currentTrackId ? "bg-primary/10 border-primary/30" : "hover:bg-muted"
                }`}
                onClick={() => setCurrentTrackId(track.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Music className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Select
                      value={track.instrument}
                      onValueChange={(value) => updateTrackInstrument(track.id, value as InstrumentType)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Instrument" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piano">Piano</SelectItem>
                        <SelectItem value="violin">Violin</SelectItem>
                        <SelectItem value="cello">Cello</SelectItem>
                        <SelectItem value="bass">Double Bass</SelectItem>
                        <SelectItem value="flute">Flute</SelectItem>
                        <SelectItem value="clarinet">Clarinet</SelectItem>
                        <SelectItem value="oboe">Oboe</SelectItem>
                        <SelectItem value="bassoon">Bassoon</SelectItem>
                        <SelectItem value="trumpet">Trumpet</SelectItem>
                        <SelectItem value="trombone">Trombone</SelectItem>
                        <SelectItem value="tuba">Tuba</SelectItem>
                        <SelectItem value="french horn">French Horn</SelectItem>
                        <SelectItem value="drums">Drums</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={!track.muted} onCheckedChange={() => toggleTrackMute(track.id)} />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTrack(track.id)
                    }}
                    disabled={tracks.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
