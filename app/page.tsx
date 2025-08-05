"use client";

import React from "react";
import { BackgroundBeams } from "@/components/ui/backgroundbeams";
import { WaitlistForm } from "@/components/ui/waitlist-form";

export default function Home() {
  return (
    <div className="h-[40rem] w-full rounded-md bg-background relative flex flex-col items-center justify-center antialiased">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground text-center font-sans font-bold">
          Join the waitlist
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto my-2 text-sm text-center relative z-10 mb-6">
          Welcome to Autosell, the AI-powered marketplace automation platform. 
          Upload photos, get instant AI analysis, and automatically publish optimized listings across 
          Facebook Marketplace, FINN.no, and Amazon. Smart pricing, platform recommendations, 
          and automated publishing - all powered by advanced AI.
        </p>
        <div className="relative z-10">
          <WaitlistForm />
        </div>
      </div>
      <BackgroundBeams />
    </div>
  );
}
