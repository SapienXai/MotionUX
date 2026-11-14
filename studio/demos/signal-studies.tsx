import { useEffect, useState } from "react";
import { EmphasisText, PhraseSwap, ReadAlong, RollLink, TextReveal } from "../../components/text/animated-type";
import { GhostSuggestion, PromptBox } from "../../components/ai/composer";
import { StreamingReply, TaskList, ThinkingText, VoiceInput } from "../../components/ai/async-feedback";
import { AudioControl, SignalOrb, TimeScrubber } from "../../components/media/audio-tools";
import fieldTones from "../assets/field-tones.wav";
import { usageExample } from "./usage-example";
import type { Specimen } from "../catalog";
import "./demo.css";
import "./signal-studies.css";

const examples = {
  "word-roll": ["PhraseSwap", "text/animated-type", '<><PhraseSwap text={word} /><button type="button" onClick={() => setWord(word === "Horizon" ? "Canopy" : "Horizon")}>Switch word</button></>', "Change the selected word. A directional roll leaves one accessible copy."],
  "dynamic-text": ["PhraseSwap", "text/animated-type", '<><PhraseSwap variant="dynamic" text={phrase} direction={1} /><button type="button" onClick={() => setPhrase(phrase === "Quiet by the treeline" ? "Light crosses the valley" : "Quiet by the treeline")}>Next phrase</button></>', "Switch sentences to see words enter in sequence. The full sentence remains available."],
  "weight-wave": ["EmphasisText", "text/animated-type", '<><EmphasisText variant="weight" text="A slower journey" trigger={revision} /><button type="button" onClick={() => setRevision(revision + 1)}>Replay</button></>', "Replay a short wave of typographic weight while the phrase keeps its meaning."],
  "marker-text": ["EmphasisText", "text/animated-type", '<><EmphasisText variant="marker" text="On the ridge" trigger={revision} /><button type="button" onClick={() => setRevision(revision + 1)}>Replay</button></>', "Replay a background sweep that leaves the text legible at rest."],
  "scramble-text": ["TextReveal", "text/animated-type", '<><TextReveal text="A signal through the mist" variant="scramble" trigger={revision} /><button type="button" onClick={() => setRevision(revision + 1)}>Replay</button></>', "Explicit activation plays a bounded glyph sequence. Assistive technology receives the final phrase."],
  "typewriter": ["TextReveal", "text/animated-type", '<><TextReveal text="The trail runs east" variant="typewriter" trigger={revision} /><button type="button" onClick={() => setRevision(revision + 1)}>Replay</button></>', "Render the entire phrase to assistive technology while the decorative display reveals it once."],
  "read-along": ["ReadAlong", "text/animated-type", '<><ReadAlong phrases={paragraphs} current={index} /><button type="button" onClick={() => setIndex((index + 1) % paragraphs.length)}>Next</button></>', "Advance the marked phrase while keeping the entire passage available."],
  "roll-links": ["RollLink", "text/animated-type", '<RollLink href="/journal">Open journal</RollLink>', "Pointer or keyboard focus rolls a decorative copy. The original link remains usable."],
  "prompt-box": ["PromptBox", "ai/composer", '<PromptBox label="Prompt" value={prompt} onValueChange={setPrompt} onSubmit={submitted => { console.info(submitted); setPrompt(""); }} onStop={() => {}} pending={false} sendLabel="Send" stopLabel="Stop" />', "The caller handles submission and stopping. Ctrl+Enter or Cmd+Enter is optional."],
  "ghost-suggestion": ["GhostSuggestion", "ai/composer", '<GhostSuggestion label="Search" value={query} completion={suffix} onValueChange={setQuery} acceptLabel="Accept suggestion" />', "Accept the proposed suffix at the final caret with ArrowRight or the labelled button."],
  "streaming-reply": ["StreamingReply", "ai/async-feedback", '<StreamingReply label="Reply" summary={stateLabel} text={text} pending={pending} onStop={abort} stopLabel="Stop" />', "Preserve the readable reply as chunks arrive. A separate mounted live region reports stage changes."],
  "voice-input": ["VoiceInput", "ai/async-feedback", '<VoiceInput state={state} status={message} startLabel="Start" stopLabel="Stop" onStart={start} onStop={stop} />', "Recording state is caller-owned. Studio drives the waveform with synthetic state and never requests a microphone."],
  "thinking-text": ["ThinkingText", "ai/async-feedback", '<ThinkingText phase={visiblePhase} status={announcedState} pending={working} />', "Show operation phases while keeping the announced status independent of individual visual updates."],
  "task-list": ["TaskList", "ai/async-feedback", '<TaskList label="Preparation" tasks={tasks} onToggle={(id, complete) => setTasks(tasks.map(task => task.id === id ? { ...task, complete } : task))} describe={(done, total) => `${done} of ${total} complete`} />', "Native checkboxes update caller-owned state and the readable count."],
  "siri-orb": ["SignalOrb", "media/audio-tools", '<><SignalOrb active={listening} status={listening ? "Active" : "Ready"} /><button type="button" onClick={() => setListening(!listening)}>Toggle</button></>', "A bounded organic transition indicates state. A readable label persists in both motion modes."],
  "scrubber": ["TimeScrubber", "media/audio-tools", '<TimeScrubber label="Position" elapsed={elapsed} duration={120} onSeek={setElapsed} format={formatTime} />', "Seek a controlled synthetic timeline with keyboard or pointer."],
  "glass-player": ["AudioControl", "media/audio-tools", '<AudioControl src={audioUrl} title="Quiet tones" playLabel="Play" pauseLabel="Pause" errorLabel="Could not start" seekLabel="Position" format={formatTime} />', "Audio playback starts after an explicit action. Playback and seek state follow native media events."],
  "music-toggle": ["AudioControl", "media/audio-tools", '<AudioControl variant="toggle" src={audioUrl} title="Quiet tones" playLabel="Play" pauseLabel="Pause" errorLabel="Could not start" seekLabel="Position" format={formatTime} />', "The compact control pauses or plays the supplied audio and reports media errors."],
} as const;

const exampleSetup: Partial<Record<keyof typeof examples, string>> = {
  "word-roll": "const [word, setWord] = useState(\"Horizon\");",
  "dynamic-text": "const [phrase, setPhrase] = useState(\"Quiet by the treeline\");",
  "weight-wave": "const [revision, setRevision] = useState(0);",
  "marker-text": "const [revision, setRevision] = useState(0);",
  "scramble-text": "const [revision, setRevision] = useState(0);",
  "typewriter": "const [revision, setRevision] = useState(0);",
  "read-along": "const [index, setIndex] = useState(0);\n  const paragraphs = [\"At first light.\", \"Follow the lower path.\"];",
  "prompt-box": "const [prompt, setPrompt] = useState(\"\");",
  "ghost-suggestion": "const [query, setQuery] = useState(\"\");\n  const suggestion = \"forest trail\";\n  const suffix = query.length >= 2 && suggestion.startsWith(query) ? suggestion.slice(query.length) : undefined;",
  "task-list": "const [tasks, setTasks] = useState([{ id: \"map\", label: \"Review the map\", complete: false }]);",
  "siri-orb": "const [listening, setListening] = useState(false);",
  "scrubber": "const [elapsed, setElapsed] = useState(0);\n  const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, \"0\")}`;",
  "glass-player": "const formatTime = (seconds: number) => Math.floor(seconds) + \" seconds\";",
  "music-toggle": "const formatTime = (seconds: number) => Math.floor(seconds) + \" seconds\";"
};
const exampleProps: Partial<Record<keyof typeof examples, string>> = {
  "streaming-reply": "{ stateLabel, text, pending, abort }: { stateLabel: string; text: string; pending: boolean; abort: () => void }",
  "thinking-text": "{ visiblePhase, announcedState, working }: { visiblePhase: string; announcedState: string; working: boolean }",
  "voice-input": "{ state, message, start, stop }: { state: \"idle\" | \"recording\" | \"processing\"; message: string; start: () => void; stop: () => void }",
  "glass-player": "{ audioUrl }: { audioUrl: string }",
  "music-toggle": "{ audioUrl }: { audioUrl: string }"
};

type Kind = keyof typeof examples;
function time(seconds: number) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

export function signalStory(kind: Kind): Specimen {
  const [name, file, snippet, detail] = examples[kind];
  return {
    component: function SignalStudy({ language, reduced }) {
      const tr = language === "tr";
      const t = (en: string, turkish: string) => tr ? turkish : en;
      const [index, setIndex] = useState(0);
      const [value, setValue] = useState("");
      const [prompt, setPrompt] = useState("");
      const [state, setState] = useState<"idle" | "pending" | "done" | "cancelled">("idle");
      const [completed, setCompleted] = useState<string[]>([]);
      const [elapsed, setElapsed] = useState(24);
      const [targetShown, setTargetShown] = useState(false);
      const next = () => setIndex((n) => n + 1);
      const ready = state === "pending";
      useEffect(() => {
        if (!ready) return;
        const timer = setInterval(() => setIndex(value => value + 1), 260);
        const done = setTimeout(() => setState("done"), 1450);
        return () => { clearInterval(timer); clearTimeout(done); };
      }, [ready]);
      const start = () => { setIndex(0); setState("pending"); };
      const progress = state === "done" ? t("Demo finished", "Demo tamamlandı") : state === "cancelled" ? t("Demo stopped", "Demo durduruldu") : ready ? t("Demo running", "Demo çalışıyor") : t("Ready", "Hazır");
      const replay = (label: string, action = next) => <button className="mx-demo-button" type="button" onClick={action}>{label}</button>;
      let control;
      switch (kind) {
        case "word-roll": case "dynamic-text": {
          const phrases = kind === "word-roll" ? [t("Horizon", "Ufuk"), t("Canopy", "Orman"), t("Current", "Akıntı")] :
            [t("Quiet by the treeline", "Ağaç sınırında sessizlik"), t("Light crosses the valley", "Işık vadiyi aşıyor"), t("Dusk settles uphill", "Alacakaranlık yamaçta")];
          control = <><p className="mx-demo-type"><PhraseSwap text={phrases[index % phrases.length]} variant={kind === "word-roll" ? "roll" : "dynamic"} reducedMotion={reduced} /></p>
            {replay(t("Next phrase", "Sonraki ifade"))}</>; break;
        }
        case "weight-wave": case "marker-text":
          control = <><p className="mx-demo-type"><EmphasisText text={kind === "weight-wave" ? t("A slower journey", "Daha yavaş bir yolculuk") : t("On the ridge", "Sırtın üzerinde")}
            trigger={index} variant={kind === "weight-wave" ? "weight" : "marker"} reducedMotion={reduced} /></p>{replay(t("Replay emphasis", "Vurguyu yinele"))}</>; break;
        case "scramble-text": case "typewriter":
          control = <><p className="mx-demo-type"><TextReveal text={kind === "scramble-text" ? t("Signal through mist", "Sisin içinden sinyal") : t("The trail runs east", "Patika doğuya uzanır")}
            trigger={index} variant={kind === "typewriter" ? "typewriter" : "scramble"} reducedMotion={reduced} /></p>{replay(t("Replay reveal", "Açılışı yinele"))}</>; break;
        case "read-along":
          control = <><ReadAlong current={index % 3} phrases={[t("At dawn, look east.", "Şafakta doğuya bakın."), t("Follow the river below the hill.", "Tepenin altındaki nehri izleyin."), t("Stop where the valley widens.", "Vadinin genişlediği yerde durun.")]} />
            {replay(t("Next line", "Sonraki satır"))}</>; break;
        case "roll-links":
          control = <><RollLink href="?item=designbookmark-roll-links#journal-note" onClick={(event) => {
            event.preventDefault(); setTargetShown(true);
          }}>{t("Open journal note", "Günlük notunu aç")}</RollLink>{targetShown && <p id="journal-note" role="status">{t("A note from the valley.", "Vadiden bir not.")}</p>}</>; break;
        case "prompt-box":
          control = <><PromptBox label={t("Demo prompt", "Örnek istem")} value={value} onValueChange={setValue} onSubmit={(text) => { setPrompt(text); start(); }}
            onStop={() => setState("cancelled")} pending={ready} sendLabel={t("Send demo", "Demoyu gönder")} stopLabel={t("Stop demo", "Demoyu durdur")}
            shortcutHint="Ctrl / ⌘ + Enter" error={value.length > 160 ? t("Use 160 characters or fewer", "En fazla 160 karakter kullanın") : undefined} />
            <p role="status">{progress}{prompt && ` · ${prompt}`}</p></>; break;
        case "ghost-suggestion": {
          const suggestions = tr ? ["orman patikası", "sisli vadi"] : ["forest trail", "foggy valley"];
          const match = value.length >= 2 ? suggestions.find(text => text.startsWith(value) && text !== value) : undefined;
          control = <GhostSuggestion label={t("Try typing “fo”", "“or” yazın")} value={value} completion={match?.slice(value.length)}
            onValueChange={setValue} acceptLabel={t("Accept suggestion", "Öneriyi kabul et")} />; break;
        }
        case "streaming-reply": {
          const chunks = tr ? ["Gün doğarken", " sis çözülmeye başladı.", " Alt patikayı izleyin.", " Nehir kıyısında durun."] :
            ["At first light", ", the fog began to lift.", " Follow the lower path.", " Stop beside the river."];
          control = <><StreamingReply label={t("Simulated reply", "Örnek yanıt")} summary={progress} text={state === "done" ? chunks.join("") : chunks.slice(0, index).join("")}
            pending={ready} />
            {replay(ready ? t("Stop reply", "Yanıtı durdur") : t("Start reply", "Yanıtı başlat"), ready ? () => setState("cancelled") : start)}</>; break;
        }
        case "voice-input":
          control = <VoiceInput state={state === "pending" ? "recording" : "idle"} status={state === "pending" ? t("Simulated recording", "Kayıt simülasyonu") : progress}
            startLabel={t("Simulate recording", "Kayıt simülasyonu başlat")} stopLabel={t("Stop simulation", "Simülasyonu durdur")}
            onStart={start} onStop={() => setState("cancelled")} reducedMotion={reduced} />; break;
        case "thinking-text":
          control = <><ThinkingText phase={ready ? [t("Gathering", "Toplanıyor"), t("Reading", "Okunuyor"), t("Writing", "Yazılıyor")][index % 3] : progress} pending={ready} status={progress} />
            {replay(ready ? t("Stop demo", "Demoyu durdur") : t("Try phases", "Aşamaları dene"), ready ? () => setState("cancelled") : start)}</>; break;
        case "task-list":
          control = <TaskList label={t("Session checklist", "Oturum listesi")} tasks={[
            { id: "map", label: t("Review the map", "Haritayı incele") }, { id: "notes", label: t("Prepare notes", "Notları hazırla") },
          ].map(task => ({ ...task, complete: completed.includes(task.id) }))}
            onToggle={(id, done) => setCompleted(items => done ? [...items, id] : items.filter(item => item !== id))}
            describe={(n, total) => t(`${n} of ${total} complete`, `${total} görevden ${n} tanesi tamamlandı`)} />; break;
        case "siri-orb":
          control = <><SignalOrb active={index % 2 !== 0} status={index % 2 ? t("Simulated signal active", "Örnek sinyal etkin") : t("Signal at rest", "Sinyal durağan")}
            reducedMotion={reduced} />{replay(t("Toggle signal", "Sinyali değiştir"))}</>; break;
        case "scrubber":
          control = <TimeScrubber label={t("Seek position", "Oynatma konumu")} elapsed={elapsed} duration={120} onSeek={setElapsed} format={time} />; break;
        case "glass-player": case "music-toggle":
          control = <AudioControl src={fieldTones} title={t("Field tones", "Saha tonları")} subtitle={t("Synthetic audio", "Sentetik ses")}
            playLabel={t("Play sample", "Örneği oynat")} pauseLabel={t("Pause sample", "Örneği duraklat")}
            errorLabel={t("Playback unavailable", "Ses oynatılamıyor")} seekLabel={t("Sample position", "Örnek konumu")} format={time}
            variant={kind === "glass-player" ? "glass" : "toggle"} />; break;
      }
      return <div className="mx-demo mx-demo-center">{control}</div>;
    },
    usage: usageExample(name, file.split("/").at(-1)!, snippet, exampleSetup[kind], exampleProps[kind]),
    states: detail, api: "Provide the final content and own any asynchronous state in the application.",
    accessibility: detail, performance: "The experience runs only when selected. The local audio sample loads on playback request.",
  };
}
