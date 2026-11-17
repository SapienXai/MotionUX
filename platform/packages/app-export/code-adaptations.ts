export const comparisonSource = "magicui-code-comparison";
export const heroVideoSource = "magicui-hero-video-dialog";
export const coastVideo = {
  path: "public/media/seed-coast-preview.mp4",
  sha256: "04951507d0fc6bdc63840b239a484c65a1026a052b11e0ab45fa3c5577f45d49",
} as const;

export function adaptCodeComparison(code: string) {
  return code
    .replace('import { useEffect, useState } from "react"', 'import { useEffect, useState, type ReactNode } from "react"\nimport { highlight } from "./motionux-highlight"')
    .replace(/import \{\s*transformerNotationDiff,\s*transformerNotationFocus,\s*\} from "@shikijs\/transformers"\n/, "")
    .replace(/  const \[highlightedBefore,[\s\S]*?(?=  const renderCode)/, `  const [highlightedBefore, setHighlightedBefore] = useState<ReactNode>(null)
  const [highlightedAfter, setHighlightedAfter] = useState<ReactNode>(null)
  const hasLeftFocus = beforeCode.includes("[!code focus]")
  const hasRightFocus = afterCode.includes("[!code focus]")

  useEffect(() => {
    let current = true
    setHighlightedBefore(null)
    setHighlightedAfter(null)
    void Promise.all([highlight(beforeCode, language), highlight(afterCode, language)]).then(([before, after]) => {
      if (!current) return
      setHighlightedBefore(before)
      setHighlightedAfter(after)
    }, () => {})
    return () => { current = false }
  }, [beforeCode, afterCode, language])

`)
    .replace("highlighted: string", "highlighted: ReactNode")
    .replace("dangerouslySetInnerHTML={{ __html: highlighted }}\n        />", ">\n          {highlighted}\n        </div>")
    .replace("h-full [&>pre]:w-screen!", "h-full [&>pre]:min-w-full")
    .replace("leftside group/left", "min-w-0 leftside group/left")
    .replace("rightside group/right", "min-w-0 rightside group/right")
    .replace(/^  lightTheme,\n  darkTheme,\n/m, "");
}

export function adaptHeroVideo(code: string) {
  const start = code.indexOf("      <AnimatePresence>");
  if (start < 0) throw new Error("runtime-review: video template differs");
  return code.slice(0, start)
    .replace('import { useState } from "react"', 'import { useRef, useState } from "react"')
    .replace('import { AnimatePresence, motion } from "motion/react"', 'import { motion } from "motion/react"')
    .replace("  const selectedAnimation", "  const dialog = useRef<HTMLDialogElement>(null)\n  const selectedAnimation")
    .replace("onClick={() => setIsVideoOpen(true)}", "onClick={() => { dialog.current?.showModal(); setIsVideoOpen(true) }}") +
    `      <dialog ref={dialog} aria-label="Hero video" onClose={() => setIsVideoOpen(false)}
        className="m-auto max-w-[min(90vw,56rem)] w-full overflow-visible bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-md">
        <button type="button" autoFocus aria-label="Close video" onClick={() => dialog.current?.close()}
          className="absolute -top-12 right-0 rounded-full bg-neutral-900 p-2 text-white ring-1"><XIcon className="size-5" /></button>
        {isVideoOpen && <motion.div {...selectedAnimation} transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-white">
          <video src={videoSrc === "${coastVideo.path.slice("public".length)}" ? videoSrc : undefined}
            aria-label="Hero Video player" controls playsInline preload="metadata" className="size-full" />
        </motion.div>}
      </dialog>
    </div>
  )
}
`;
}
