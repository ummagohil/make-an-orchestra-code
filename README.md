# 𝄞 Make an Orchestra

## 🎻 Instrument Selector

This component sets the instrument the user selects. There are numerous different sections that refer to different parts of an orchestra, strings, percussion, keyboard etc.

```ts
const instrumentCategories = {
  strings: ["violin", "cello", "guitar", "harp"],
  woodwinds: ["flute", "clarinet", "oboe", "bassoon"],
  brass: ["trumpet", "trombone", "french horn", "tuba"],
  percussion: ["drums", "timpani", "xylophone", "marimba"],
  keyboard: ["piano", "organ", "harpsichord", "synthesizer"],
};
```

## 🎼 Multi Staff Notation

One of the main functionalities of the app is for the user to be able to drag and drop notes on a music staff.

Treble (right hand) clef and bass (left hand) clef notes are mapped out here but this could also be refactored to be put into a utils folder.

As well as taking the clef into consideration, the functionality of key signatures is also mapped out here.

This is how the drag and drop has been implemented:

```ts
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
```

## 🎺 Orchestra Builder

```ts
useEffect(() => {
  console.log("Initializing Tone.js synths for tracks:", tracks);

  // Create synths for each track with appropriate instrument sounds
  tracks.forEach((track) => {
    if (!synthsRef.current[track.id]) {
      console.log(`Creating synth for track ${track.id} (${track.instrument})`);

      // Use different synth types based on instrument category
      let synth;

      switch (track.instrument) {
        case "piano":
        case "harpsichord":
        case "organ":
        case "synthesizer":
          synth = new Tone.PolySynth(Tone.Synth).toDestination();
          break;
        case "violin":
        case "viola":
        case "cello":
        case "guitar":
        case "harp":
          synth = new Tone.PolySynth(Tone.AMSynth).toDestination();
          break;
        case "flute":
        case "clarinet":
        case "oboe":
        case "bassoon":
          synth = new Tone.PolySynth(Tone.FMSynth).toDestination();
          break;
        case "trumpet":
        case "trombone":
        case "french horn":
        case "tuba":
          synth = new Tone.PolySynth(Tone.MonoSynth).toDestination();
          break;
        case "drums":
        case "timpani":
        case "xylophone":
        case "marimba":
          synth = new Tone.PolySynth(Tone.MembraneSynth).toDestination();
          break;
        default:
          synth = new Tone.PolySynth(Tone.Synth).toDestination();
      }

      synth.volume.value = track.volume;
      synthsRef.current[track.id] = synth;
    }
  });

  // Update synth volumes
  tracks.forEach((track) => {
    if (synthsRef.current[track.id]) {
      synthsRef.current[track.id].volume.value = track.volume;
    }
  });

  // Add a test sound function
  window.playTestSound = () => {
    if (Tone.context.state !== "running") {
      Tone.start().then(() => {
        const testSynth = new Tone.Synth().toDestination();
        testSynth.triggerAttackRelease("C4", "8n");
        console.log("Test sound played");
        testSynth.dispose();
      });
    } else {
      const testSynth = new Tone.Synth().toDestination();
      testSynth.triggerAttackRelease("C4", "8n");
      console.log("Test sound played");
      testSynth.dispose();
    }
  };

  console.log("Synths initialized:", Object.keys(synthsRef.current));

  // Only clean up when component unmounts, not on every render
  return () => {
    // Clean up all synths when component unmounts
    Object.values(synthsRef.current).forEach((synth: any) => {
      synth.dispose();
    });
    if (sequencerRef.current) {
      sequencerRef.current.dispose();
    }
    // Clear the refs
    synthsRef.current = {};
    sequencerRef.current = null;
  };
}, [tracks]); // Only re-run when tracks change
```

## 🧪 Testing

`npm run test`

## 🧠 Other Considerations

- Fix the UI styling
