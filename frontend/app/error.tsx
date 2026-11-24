"use client";

import { useEffect } from "react";

// Catches unexpected render errors in any page so people see a recovery
// option instead of a blank screen.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="card p-8 max-w-md text-center">
        <h1 className="font-serif text-2xl text-ink-800 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-5">An unexpected error happened on this page. Your data is safe — try again, or head back to the feed.</p>
        <div className="flex justify-center gap-3">
          <button className="btn-primary" onClick={() => reset()}>Try again</button>
          <a className="btn-secondary" href="/feed">Go to feed</a>
        </div>
      </div>
    </div>
  );
}
