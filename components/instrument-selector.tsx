"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { InstrumentType } from "@/lib/types"
import { Music } from "lucide-react"

interface InstrumentSelectorProps {
  instrument: InstrumentType
  onInstrumentChange: (instrument: InstrumentType) => void
}

export default function InstrumentSelector({ instrument, onInstrumentChange }: InstrumentSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("strings")

  const instrumentCategories = {
    strings: ["violin", "cello", "guitar", "harp"],
    woodwinds: ["flute", "clarinet", "oboe", "bassoon"],
    brass: ["trumpet", "trombone", "french horn", "tuba"],
    percussion: ["drums", "timpani", "xylophone", "marimba"],
    keyboard: ["piano", "organ", "harpsichord", "synthesizer"],
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Instrument Selection</h3>
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="strings">Strings</TabsTrigger>
          <TabsTrigger value="woodwinds">Woodwinds</TabsTrigger>
          <TabsTrigger value="brass">Brass</TabsTrigger>
          <TabsTrigger value="percussion">Percussion</TabsTrigger>
          <TabsTrigger value="keyboard">Keyboard</TabsTrigger>
        </TabsList>

        {Object.entries(instrumentCategories).map(([category, instruments]) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-2 gap-2">
              {instruments.map((inst) => (
                <Card
                  key={inst}
                  className={`cursor-pointer transition-colors ${
                    instrument === inst ? "bg-primary/10 border-primary/30" : "hover:bg-muted"
                  }`}
                  onClick={() => onInstrumentChange(inst as InstrumentType)}
                >
                  <CardContent className="p-3 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-1">
                        <Music className="w-10 h-10 mx-auto text-muted-foreground" />
                      </div>
                      <span className="text-sm capitalize">{inst}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
