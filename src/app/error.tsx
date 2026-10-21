"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="wrap section">
      <div className="empty-state">
        <h2>A small pause.</h2>
        <p>
          We couldn’t load this page. Please try again. If you’re setting up the
          application, check the database migration and environment
          configuration.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
