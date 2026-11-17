"use client";

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import {
  isMarketing,
  defaultMotionDna,
  motionEasings,
  type Block,
  type BlockProps,
  type BuildPage,
  type Document,
} from "@motionux/build-core";
import type { CSSProperties } from "react";

type Context = {
  document: Document;
  route: string;
  navigate?: (route: string) => void;
  mediaBase: string;
};
const Site = createContext<Context | null>(null);
function useSite() {
  const site = useContext(Site);
  if (!site) throw new Error("A marketing block requires its site.");
  return site;
}
const localeText = (locale: string, en: string, tr: string) =>
  locale === "tr" ? tr : en;
function SiteLink({
  href,
  children,
  className,
  active,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const { navigate } = useSite();
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (
      navigate &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      navigate(href);
    }
    onClick?.();
  }
  return (
    <a
      href={href}
      className={className}
      aria-current={active ? "page" : undefined}
      onClick={follow}
    >
      {children}
    </a>
  );
}
type Visual = { asset?: string; alt?: string; focal?: string };
function Photo({
  asset,
  alt = "",
  focal = "center",
  priority = false,
}: Visual & { priority?: boolean }) {
  const { mediaBase } = useSite();
  if (!asset) return null;
  return (
    <img
      className="site-photo"
      src={mediaBase + asset + "-720.webp"}
      srcSet={
        mediaBase +
        asset +
        "-360.webp 360w, " +
        mediaBase +
        asset +
        "-720.webp 720w"
      }
      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 56vw, 720px"
      alt={alt}
      width="720"
      height="720"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      style={{ objectPosition: focal }}
    />
  );
}
function Action({ cta, destination }: Pick<BlockProps, "cta" | "destination">) {
  return cta && destination ? (
    <SiteLink className="site-action" href={destination}>
      {cta}
      <ArrowDownRight size={17} aria-hidden="true" />
    </SiteLink>
  ) : null;
}
function Navigation({
  footer = false,
  title,
}: {
  footer?: boolean;
  title: string;
}) {
  const { document, route } = useSite();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const tr = document.locale === "tr";
  const pages = document.pages.filter(
    ({ route }) => !["/terrace-suite", "/olive-room"].includes(route),
  );
  const links = (
    <ul id={id} data-open={open}>
      {pages.map((page) => (
        <li key={page.id}>
          <SiteLink
            href={page.route}
            active={page.route === route}
            onClick={() => setOpen(false)}
          >
            {page.title}
          </SiteLink>
        </li>
      ))}
    </ul>
  );
  return footer ? (
    <footer className="site-footer">
      <SiteLink href="/" className="site-wordmark">
        {title || document.name}
      </SiteLink>
      <nav aria-label={tr ? "Alt menü" : "Footer navigation"}>{links}</nav>
      <p>
        {tr
          ? "Kurgusal bir konaklama sitesi · MotionUX"
          : "A fictional stay · Built with MotionUX"}
      </p>
    </footer>
  ) : (
    <header className="site-header">
      <SiteLink href="/" className="site-wordmark">
        {title || document.name}
      </SiteLink>
      <nav
        aria-label={tr ? "Ana menü" : "Primary navigation"}
        onKeyDown={(event) => {
          if (open && event.key === "Escape") {
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        <button
          className="site-menu"
          type="button"
          ref={trigger}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <X size={21} aria-hidden="true" />
          ) : (
            <Menu size={21} aria-hidden="true" />
          )}
          {tr ? "Menü" : "Menu"}
        </button>
        {links}
      </nav>
    </header>
  );
}
function SectionTitle({
  title,
  description,
}: Pick<BlockProps, "title" | "description">) {
  return (
    <div className="site-section-title">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
function Hero({ props, editorial }: { props: BlockProps; editorial: boolean }) {
  return (
    <section className={editorial ? "site-hero editorial" : "site-hero split"}>
      <div className="site-hero-copy">
        <h1>{props.title}</h1>
        {props.description && <p>{props.description}</p>}
        <Action {...props} />
      </div>
      {props.image && (
        <div className="site-hero-photo">
          <Photo {...props.image} priority />
        </div>
      )}
    </section>
  );
}
function Gallery({ props }: { props: BlockProps }) {
  const { document } = useSite();
  const photos = (props.items ?? []).filter(({ asset }) => Boolean(asset));
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const title = useId();
  const t = (en: string, tr: string) => localeText(document.locale, en, tr);
  const go = (change: number) =>
    setIndex((current) => (current + change + photos.length) % photos.length);
  return (
    <section className="site-section">
      <SectionTitle {...props} />
      <div className="site-gallery">
        {photos.map((photo, i) => (
          <button
            key={i}
            type="button"
            onClick={(event) => {
              opener.current = event.currentTarget;
              setIndex(i);
              dialog.current?.showModal();
            }}
            aria-label={t("View", "Görüntüle") + " " + photo.title}
          >
            <Photo {...photo} />
            <span>{photo.title}</span>
          </button>
        ))}
      </div>
      <dialog
        className="site-lightbox"
        ref={dialog}
        aria-labelledby={title}
        onClose={() => opener.current?.focus()}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") go(-1);
          if (event.key === "ArrowRight") go(1);
        }}
      >
        <div>
          <h2 id={title}>{photos[index]?.title}</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t("Close image", "Görseli kapat")}
          >
            <X size={22} />
          </button>
        </div>
        {photos[index] && <Photo {...photos[index]} />}
        <div className="site-gallery-controls">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("Previous image", "Önceki görsel")}
          >
            <ArrowLeft size={20} />
          </button>
          <span aria-live="polite">
            {photos.length ? index + 1 : 0} / {photos.length}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("Next image", "Sonraki görsel")}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </dialog>
    </section>
  );
}
function Rooms({ props }: { props: BlockProps }) {
  const { document } = useSite();
  return (
    <section className="site-section">
      <SectionTitle {...props} />
      <div className="site-room-grid">
        {props.items?.map((room, i) => (
          <article key={i}>
            <div className="site-room-photo">
              <Photo {...room} />
            </div>
            <div className="site-room-copy">
              <h3>{room.title}</h3>
              <p>{room.text}</p>
              {room.destination && (
                <SiteLink href={room.destination}>
                  {localeText(document.locale, "View room", "Odayı inceleyin")}{" "}
                  <span className="site-sr">{room.title}</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </SiteLink>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
function Contact({ props }: { props: BlockProps }) {
  const { document } = useSite();
  const [validated, setValidated] = useState(false);
  const t = (en: string, tr: string) => localeText(document.locale, en, tr);
  return (
    <section className="site-section site-contact">
      <div>
        <h1>{props.title}</h1>
        <p>
          {props.description ||
            t(
              "A local example for planning a stay. Nothing is sent and no booking is made.",
              "Konaklama planlamak için yerel bir örnek. Hiçbir bilgi gönderilmez ve rezervasyon yapılmaz.",
            )}
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setValidated(true);
        }}
        onChange={() => setValidated(false)}
      >
        <label>
          {t("Your name", "Adınız")}
          <input autoComplete="name" required maxLength={100} />
        </label>
        <label>
          {t("Email address", "E-posta adresi")}
          <input type="email" autoComplete="email" required maxLength={160} />
        </label>
        <label>
          {t("What would you like to know?", "Neyi öğrenmek istersiniz?")}
          <textarea required rows={4} maxLength={600} />
        </label>
        <button type="submit" className="site-action">
          {t("Check demo inquiry", "Örnek talebi kontrol et")}
        </button>
        <p role="status">
          {validated &&
            t(
              "The demo inquiry is valid. It was not sent.",
              "Örnek talep geçerli. Herhangi bir yere gönderilmedi.",
            )}
        </p>
      </form>
    </section>
  );
}

export function MarketingBlockView({ block }: { block: Block }) {
  const p = block.props;
  const shared = {
    "data-visibility": p.visibility,
    "data-block-motion": p.motion,
    "data-variant": p.variant,
  };
  let node: ReactNode;
  switch (block.type) {
    case "MarketingHeader":
      return <Navigation title={p.title} />;
    case "MarketingFooter":
      return <Navigation title={p.title} footer />;
    case "HeroEditorial":
      node = <Hero props={p} editorial />;
      break;
    case "HeroSplit":
      node = <Hero props={p} editorial={false} />;
      break;
    case "PageHeader":
      node = (
        <section className="site-section">
          <h1>{p.title}</h1>
          <p>{p.description}</p>
        </section>
      );
      break;
    case "RoomCollection":
      node = <Rooms props={p} />;
      break;
    case "GalleryGrid":
      node = <Gallery props={p} />;
      break;
    case "ContactForm":
      node = <Contact props={p} />;
      break;
    case "StorySection":
      node = (
        <section className="site-section site-story">
          <Photo {...p.image} />
          <SectionTitle {...p} />
        </section>
      );
      break;
    case "FAQAccordion":
      node = (
        <section className="site-section site-faq">
          <SectionTitle {...p} />
          <div>
            {p.items?.map(({ title, text }, i) => (
              <details key={i}>
                <summary>
                  {title}
                  <ChevronDown size={19} aria-hidden="true" />
                </summary>
                <p>{text}</p>
              </details>
            ))}
          </div>
        </section>
      );
      break;
    case "CTASection":
      node = (
        <section className="site-section site-cta">
          <SectionTitle {...p} />
          <Action {...p} />
        </section>
      );
      break;
    case "Testimonials":
      node = (
        <section className="site-section site-testimonials">
          <SectionTitle {...p} />
          <div>
            {p.items?.map(({ title, text }, i) => (
              <figure key={i}>
                <blockquote>{text}</blockquote>
                <figcaption>{title}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
      break;
    case "StatsStrip":
      node = (
        <section className="site-section site-stats">
          <SectionTitle {...p} />
          <dl>
            {p.items?.map(({ title, text }, i) => (
              <div key={i}>
                <dd>{text}</dd>
                <dt>{title}</dt>
              </div>
            ))}
          </dl>
        </section>
      );
      break;
    case "LogoCloud":
      node = (
        <section className="site-section site-names">
          <SectionTitle {...p} />
          <ul>
            {p.items?.map(({ title }, i) => (
              <li key={i}>{title}</li>
            ))}
          </ul>
        </section>
      );
      break;
    case "AmenityGrid":
    case "PricingCards":
    case "FeatureBento":
      node = (
        <section
          className={
            "site-section site-features " +
            (block.type === "FeatureBento"
              ? "bento"
              : block.type === "PricingCards"
                ? "rates"
                : "")
          }
        >
          <SectionTitle {...p} />
          <div>
            {p.items?.map((item, i) => (
              <article key={i}>
                <Photo {...item} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
          <Action {...p} />
        </section>
      );
      break;
    default:
      return null;
  }
  return <div {...shared}>{node}</div>;
}
export function MarketingSurface({
  document,
  route,
  navigate,
  mediaBase = "/media/",
  theme,
  children,
}: Context & {
  theme?: Document["theme"];
  children: ReactNode;
}) {
  const dna = document.motionDna ?? defaultMotionDna;
  return (
    <Site.Provider value={{ document, route, navigate, mediaBase }}>
      <div className="site-preview">
        <div
          className="site"
          lang={document.locale}
          data-theme={theme ?? document.theme}
          data-motion={document.motionProfile}
          style={
            {
              "--site-feedback": dna.feedbackMs + "ms",
              "--site-easing": motionEasings[dna.easing],
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </Site.Provider>
  );
}
export function MarketingPage({
  document,
  page,
  navigate,
  mediaBase = "/media/",
  theme,
  status,
  studio,
}: {
  document: Document;
  page: BuildPage;
  navigate?: Context["navigate"];
  mediaBase?: string;
  theme?: Document["theme"];
  status?: ReactNode;
  studio?: boolean;
}) {
  const Main = studio ? "div" : "main";
  const { blocks } = page;
  return (
    <MarketingSurface
      document={document}
      route={page.route}
      navigate={navigate}
      mediaBase={mediaBase}
      theme={theme}
    >
      <a className="site-skip" href="#site-main">
        {localeText(document.locale, "Skip to content", "İçeriğe geç")}
      </a>
      {blocks
        .filter(({ type }) => type === "MarketingHeader")
        .map((block) => (
          <MarketingBlockView key={block.id} block={block} />
        ))}
      <Main id="site-main" tabIndex={-1}>
        {status}
        {blocks
          .filter(({ type }) =>
            isMarketing(type)
              ? !["MarketingHeader", "MarketingFooter"].includes(type)
              : type === "PageHeader",
          )
          .map((block) => (
            <MarketingBlockView key={block.id} block={block} />
          ))}
      </Main>
      {blocks
        .filter(({ type }) => type === "MarketingFooter")
        .map((block) => (
          <MarketingBlockView key={block.id} block={block} />
        ))}
    </MarketingSurface>
  );
}
