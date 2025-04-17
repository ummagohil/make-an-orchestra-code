"use client"

import { useEffect, useRef } from "react"

interface MusicNotationProps {
  notation: string
}

export default function MusicNotation({ notation }: MusicNotationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current

    // Create a more visual representation of the music notation
    const notes = notation.split("\n\n")[1] || ""

    // Parse the notation to create a visual grid
    const measures = notes.split("|").filter((m) => m.trim())

    let visualNotation = `
    <div class="p-4 bg-white dark:bg-slate-800 rounded-md">
      <div class="text-center mb-4">
        <h3 class="text-lg font-semibold">Music Notation</h3>
        <p class="text-sm text-muted-foreground mb-2">
          Visual representation of your composition
        </p>
      </div>
      
      <div class="border-t pt-4">
        <div class="flex items-center justify-center mb-4">
          <img 
            src="/treble-clef.png?height=40&width=40&query=treble clef" 
            alt="Treble clef"
            class="h-10"
          />
          
          <div class="flex-1 flex">
  `

    // Create a visual grid of the measures
    measures.forEach((measure, i) => {
      const notes = measure.trim().split("")

      visualNotation += `
      <div class="border-r border-gray-300 dark:border-gray-700 px-1 flex items-end">
    `

      notes.forEach((note) => {
        if (note === "[") return // Skip opening bracket
        if (note === "]") return // Skip closing bracket
        if (note === ".") {
          // Empty note
          visualNotation += `<div class="w-4 h-6 mx-0.5"></div>`
        } else if (note.match(/[A-G]/) || note === ",") {
          // Note or chord
          visualNotation += `
          <div class="w-4 h-6 mx-0.5 bg-primary rounded-full flex items-center justify-center text-white text-xs">
            ${note}
          </div>
        `
        }
      })

      visualNotation += `</div>`
    })

    visualNotation += `
          </div>
        </div>
        
        <div class="grid grid-cols-5 gap-2 mt-6">
          <div class="col-span-5">
            <div class="text-sm font-medium mb-1">Staff Lines</div>
            <div class="h-20 relative">
              <div class="absolute w-full h-px bg-gray-400 dark:bg-gray-600" style="top: 0%"></div>
              <div class="absolute w-full h-px bg-gray-400 dark:bg-gray-600" style="top: 25%"></div>
              <div class="absolute w-full h-px bg-gray-400 dark:bg-gray-600" style="top: 50%"></div>
              <div class="absolute w-full h-px bg-gray-400 dark:bg-gray-600" style="top: 75%"></div>
              <div class="absolute w-full h-px bg-gray-400 dark:bg-gray-600" style="top: 100%"></div>
            </div>
          </div>
        </div>
        
        <div class="mt-4 p-2 bg-muted rounded">
          <div class="text-sm font-medium mb-1">Raw Notation Data:</div>
          <pre class="text-xs overflow-x-auto">${notation}</pre>
        </div>
      </div>
    </div>
  `

    container.innerHTML = visualNotation
  }, [notation])

  return <div ref={containerRef} className="w-full h-full min-h-[300px]" />
}
