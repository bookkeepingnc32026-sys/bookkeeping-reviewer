import Link from "next/link";
import { BookOpen } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Bookkeep home">
      <span className="brand-symbol">
        <BookOpen size={23} strokeWidth={2.4} />
      </span>
      <span>
        bookkeep<span className="brand-dot">.</span>
        {!compact && <small>NC III REVIEWER</small>}
      </span>
    </Link>
  );
}
