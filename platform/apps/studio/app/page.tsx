import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Layers3,
  LayoutTemplate,
  PanelTop,
} from "lucide-react";

const legacy = "http://127.0.0.1:5199/";
export default function StudioHome() {
  return (
    <main className="studio-home">
      <header className="studio-home-nav">
        <Link href="/" className="build-brand">
          <span className="build-mark">
            <Layers3 size={17} />
          </span>
          MotionUX <span>Studio</span>
        </Link>
        <nav aria-label="Studio navigation">
          <a href={legacy}>Gallery</a>
          <a href={legacy + "?view=library"}>My Library</a>
          <Link href="/build" prefetch={false}>
            Build
          </Link>
        </nav>
      </header>
      <section className="studio-welcome">
        <div>
          <span className="studio-overline">
            <PanelTop size={14} /> Local app workspace
          </span>
          <h1>
            From proven components
            <br /> to working apps.
          </h1>
          <p>
            Compose a screen, try it at any size, and take the source with you.
          </p>
          <Link className="build-button accent" href="/build">
            Open Build <ArrowRight size={15} />
          </Link>
        </div>
        <div className="studio-illustration" aria-hidden="true">
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      </section>
      <div className="studio-lanes">
        <Link href="/build" prefetch={false}>
          <LayoutTemplate />
          <strong>Project dashboard</strong>
          <span>Create or reopen a managed app.</span>
          <ArrowRight size={16} />
        </Link>
        <a href={legacy}>
          <Boxes />
          <strong>Originals Gallery</strong>
          <span>Explore the prepared source catalog.</span>
          <ArrowRight size={16} />
        </a>
        <a href={legacy + "?view=playground&item=kokonut-wheel-picker"}>
          <Layers3 />
          <strong>Playground</strong>
          <span>Inspect and try an original.</span>
          <ArrowRight size={16} />
        </a>
      </div>
    </main>
  );
}
