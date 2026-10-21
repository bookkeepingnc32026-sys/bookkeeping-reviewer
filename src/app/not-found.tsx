import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="wrap section">
      <Brand />
      <div className="empty-state spaced">
        <h1>Let’s find your way.</h1>
        <p>This page isn’t here. Your next learning step is.</p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
