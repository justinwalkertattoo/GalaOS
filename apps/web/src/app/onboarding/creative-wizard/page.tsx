"use client";
import React from "react";

export default function CreativeOnboardingPage() {
  const enabled = process.env.NEXT_PUBLIC_ONBOARDING_ENABLED === "true";
  if (!enabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="text-sm text-gray-500 mt-2">This feature is disabled in this build.</p>
      </div>
    );
  }

  // Minimal skeleton; real steps to be added incrementally
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Create Your Gala</h1>
      <Step title="What do you create?">
        <Option label="Visual Art" />
        <Option label="Writing" />
        <Option label="Video" />
        <Option label="Music" />
        <Option label="Photography" />
      </Step>
      <Step title="Where do you share?">
        <Option label="Instagram" />
        <Option label="TikTok" />
        <Option label="YouTube" />
        <Option label="Pinterest" />
        <Option label="Behance" />
      </Step>
      <Step title="Your brand voice">
        <p className="text-sm text-gray-600">Upload 3–5 examples (optional)</p>
      </Step>
      <div>
        <button className="px-4 py-2 bg-black text-white rounded">Finish</button>
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded p-4 space-y-3">
      <h2 className="font-medium">{title}</h2>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </section>
  );
}

function Option({ label }: { label: string }) {
  return (
    <button className="px-3 py-1 border rounded hover:bg-gray-50">{label}</button>
  );
}

