import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Play,
  BookOpen,
  PenLine,
  Layers3,
  Clock3,
  Sparkles,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
const tools = [
  {
    icon: BookOpen,
    number: "01",
    title: "Learn at your pace",
    copy: "Clear video lessons that make every concept click. Pick up right where you left off.",
    link: "Explore lessons",
    to: "lessons",
  },
  {
    icon: PenLine,
    number: "02",
    title: "Put it into practice",
    copy: "Turn your knowledge into confidence with hands-on journal entry exercises.",
    link: "Try an exercise",
    to: "practice",
  },
  {
    icon: Layers3,
    number: "03",
    title: "Make it stick",
    copy: "A little review goes a long way. Keep concepts fresh with smart flashcards.",
    link: "Flip a flashcard",
    to: "flashcards",
  },
  {
    icon: Clock3,
    number: "04",
    title: "Feel assessment-ready",
    copy: "Find your strengths and your next steps with timed mock examinations.",
    link: "Preview mock exams",
    to: "exam",
  },
];
export default function Home() {
  return (
    <div className="landing">
      <header className="public-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/" className="active">
            Home
          </Link>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="login-link">
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">
              Get started <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
        <details className="public-mobile">
          <summary aria-label="Toggle navigation">
            <span />
            <span />
            <span />
          </summary>
          <nav aria-label="Mobile navigation">
            <Link href="/">Home</Link>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <Link href="/login">Log in</Link>
          </nav>
        </details>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> YOUR NC III JOURNEY STARTS HERE
            </div>
            <h1>
              Small steps.
              <br />
              <span>Balanced books.</span>
              <br />A brighter future.
            </h1>
            <p>
              Build the skills. Find your confidence. Get ready for your
              Bookkeeping NC III assessment, one lesson at a time.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/signup">
                  Start learning <ArrowRight size={18} />
                </Link>
              </Button>
              <Link href="/demo/dashboard" className="text-button">
                <span className="play-outline">
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                Take a look inside
              </Link>
            </div>
            <div className="hero-reassurance">
              <span>
                <Check size={14} /> Learn at your own pace
              </span>
              <span>
                <Check size={14} /> Free to get started
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-photo">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=85"
                alt="A small group of students learning together around a laptop"
              />
              <span className="photo-shade" />
              <div className="photo-caption">
                <span className="photo-caption-dot" /> A little progress, every
                day.
              </div>
            </div>
            <div className="photo-sticker sticker-top">
              <span className="sticker-icon">
                <GraduationCap size={24} />
              </span>
              <span>
                <strong>Your next chapter</strong>
                <small>starts with a little confidence.</small>
              </span>
              <Sparkles size={17} className="sticker-spark" />
            </div>
            <div className="photo-sticker sticker-bottom">
              <span className="round-check">
                <Check size={20} />
              </span>
              <span>
                <strong>One step closer.</strong>
                <small>You’ve got this.</small>
              </span>
              <span className="mini-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="orbit-spark">✳</div>
            <span className="image-label">LEARN. PRACTICE. PROGRESS.</span>
          </div>
        </section>
        <section className="confidence-strip">
          <div className="wrap confidence-inner">
            <p>
              A little structure.
              <br />
              <strong>A lot more confidence.</strong>
            </p>
            <span>
              <BookOpen size={22} /> Guided video lessons
            </span>
            <span>
              <PenLine size={22} /> Real-world practice
            </span>
            <span>
              <Target size={22} /> Progress you can see
            </span>
            <span>
              <ShieldCheck size={22} /> Your pace, your journey
            </span>
          </div>
        </section>
        <section id="features" className="section wrap">
          <div className="section-top">
            <div>
              <div className="eyebrow">A TOOLKIT FOR YOUR NEXT CHAPTER</div>
              <h2>
                Everything you need.
                <br />
                <span>One clear path forward.</span>
              </h2>
            </div>
            <p>
              Less wondering where to start.
              <br />
              More time getting a little better.
            </p>
          </div>
          <div className="feature-grid">
            {tools.map(({ icon: Icon, ...t }) => (
              <Link
                href={"/demo/" + t.to}
                className="feature-card"
                key={t.number}
              >
                <div className="feature-card-top">
                  <span className="feature-icon">
                    <Icon size={24} />
                  </span>
                  <span>{t.number}</span>
                </div>
                <h3>{t.title}</h3>
                <p>{t.copy}</p>
                <span className="feature-link">
                  {t.link}
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="how-section">
          <div className="wrap how-grid">
            <div>
              <div className="eyebrow">
                FROM “WHERE DO I START?” TO “I’VE GOT THIS.”
              </div>
              <h2>
                Good habits.
                <br />
                Great possibilities.
              </h2>
              <p>
                You don’t have to learn everything in a day.
                <br />
                Just make a little room for progress.
              </p>
              <Button asChild variant="secondary">
                <Link href="/signup">
                  Find your starting point <ArrowRight size={17} />
                </Link>
              </Button>
            </div>
            <div className="steps">
              {[
                [
                  "01",
                  "Make it yours",
                  "Set your assessment date and choose a daily goal that fits your life.",
                ],
                [
                  "02",
                  "Learn a little. Try a little.",
                  "Watch a lesson, practice a transaction, or review a few flashcards.",
                ],
                [
                  "03",
                  "See how far you’ve come",
                  "Build your streak, celebrate milestones, and focus on what needs work.",
                ],
              ].map(([n, title, copy]) => (
                <div className="step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section wrap preview-section">
          <div className="preview-art">
            <div className="preview-card">
              <div className="preview-card-head">
                <span className="eyebrow">A LITTLE EVERY DAY</span>
                <Sparkles size={18} />
              </div>
              <h3>Your effort adds up.</h3>
              <div className="preview-xp">
                <span>Level 3</span>
                <strong>
                  620 <small>XP</small>
                </strong>
              </div>
              <div className="progress-track">
                <span style={{ width: "48%" }} />
              </div>
              <div className="preview-activity">
                <span className="round-check">
                  <Check size={17} />
                </span>
                <span>
                  First lesson complete<small>A great place to start.</small>
                </span>
                <b>+20 XP</b>
              </div>
              <div className="preview-activity">
                <span className="feature-icon">
                  <PenLine size={17} />
                </span>
                <span>
                  A little hands-on practice
                  <small>Putting knowledge to work.</small>
                </span>
                <b>+15 XP</b>
              </div>
              <small className="sample-note">
                Illustrative progress preview
              </small>
            </div>
            <div className="preview-star">✦</div>
          </div>
          <div>
            <div className="eyebrow">PROGRESS THAT FEELS PERSONAL</div>
            <h2>
              Every little win
              <br />
              <span>counts.</span>
            </h2>
            <p>
              Stay motivated with daily goals, study streaks, and badges that
              celebrate the work you put in. Your dashboard helps you see what’s
              clicking, and what to try next.
            </p>
            <Link className="feature-link" href="/demo/dashboard">
              Meet your learning dashboard <ChevronRight size={18} />
            </Link>
          </div>
        </section>
        <section className="wrap">
          <div className="final-cta">
            <span className="cta-star">✳</span>
            <div className="eyebrow">YOUR FUTURE SELF WILL THANK YOU</div>
            <h2>Ready for your next chapter?</h2>
            <p>Start small. Stay curious. Build your bookkeeping confidence.</p>
            <Button asChild variant="secondary">
              <Link href="/signup">
                Let’s get started <ArrowRight size={17} />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="public-footer wrap">
        <Brand compact />
        <span>Made for your learning journey.</span>
        <small>
          Independent learning tool. Not affiliated with or endorsed by TESDA.
        </small>
        <Link href="/login">
          Log in <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
