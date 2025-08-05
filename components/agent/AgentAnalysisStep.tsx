"use client"

import React from "react"
import { Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface AgentAnalysisStepProps {
  files: File[]
}

export default function AgentAnalysisStep({ files }: AgentAnalysisStepProps) {
  return (
    <Card className="border-slate-200 shadow-sm animate-in fade-in-0 zoom-in-95 duration-500">
      <CardContent className="py-16">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-slate-900 rounded-full flex items-center justify-center animate-pulse">
              <Eye className="h-10 w-10 text-white animate-bounce" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-slate-200 rounded-full animate-ping" />
            <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-slate-400 rounded-full animate-spin" />
          </div>
          <div className="animate-in slide-in-from-bottom-2 duration-300 delay-200">
            <h3 className="text-xl font-semibold text-slate-900">AI is analyzing your images</h3>
            <p className="text-slate-600">
              Identifying product details, condition, and market value from {files.length} image{files.length !== 1 ? 's' : ''}...
            </p>
          </div>
          <div className="w-full max-w-xs mx-auto animate-in slide-in-from-bottom-2 duration-300 delay-400">
            <Progress value={75} className="h-2 transition-all duration-1000" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}