import { booleanValue, numberValue, stringValue } from "../values";
import { useState } from "react";
import { ActionOutcome, CartAction, CopyTextButton, MagneticButton, ReactionButton, UndoAction } from "../../feedback/feedback-actions";
import { HoldConfirm, SlideConfirm } from "../../feedback/confirmation-controls";
import { PlanSwitch, ToggleSwitch, CommandButton } from "../../feedback/state-buttons";
import { ProgressSequence, type ProgressStage } from "../../feedback/progress-sequence";
import { NotificationStack } from "../../feedback/notification-stack";
import { GooThinking, ToolApproval } from "../../feedback/tool-approval";
import type { Specimen } from "../specimen";
import "./demo.css";

const configs = {
  "plan-switch": ["PlanSwitch", "state-buttons", '<PlanSwitch label="Billing cycle">{annual => <p>{annual ? "$120 per year" : "$12 per month"}</p>}</PlanSwitch>', "Select Annual to see the yearly price.", "Native radio group, optional controlled annual state.", "Native Arrow keys and a named fieldset."],
  "hold-to-publish": ["HoldConfirm", "confirmation-controls", '<HoldConfirm label="Hold to publish" variant="publish" onConfirm={() => console.info("Confirmed intent")} />', "Holding advances to a confirmation dialog. Confirmation records a demo intent.", "Pass onConfirm to request publication. The component does not set publication status.", "Hold or use the keyboard alternative. The confirmation opens with Cancel focused."],
  "hold-button": ["HoldConfirm", "confirmation-controls", '<HoldConfirm label="Hold to arm" duration={850} onConfirm={() => console.info("Confirmed intent")} />', "Release early to cancel; a complete hold arms the demo control.", "Configure duration and onConfirm. Handle pending state in the consumer.", "Use Enter or Space to open the confirmation alternative."],
  "slide-to-confirm": ["SlideConfirm", "confirmation-controls", '<SlideConfirm label="Slide to confirm" onConfirm={() => console.info("Confirmed intent")} />', "Drag the thumb to the end of the track or open the keyboard confirmation.", "onConfirm signals user intent. Supply disabled while handling the request.", "Enter or Space offers an equivalent action without dragging."],
  "loading-to-success": ["ActionOutcome", "feedback-actions", '<ActionOutcome state="pending" label="Waiting for the server" />', "Try pending, success and failure using the demo selector.", "Pass the actual state and localised label for your operation.", "The status region stays mounted during updates."],
  "copy-button": ["CopyTextButton", "feedback-actions", '<CopyTextButton text="workspace-link" label="Copy workspace link" />', "Copies the visible demo token and reports the actual result.", "Supply text and localise the result labels.", "The visible label names what will be copied. The result is announced separately."],
  "like-burst": ["ReactionButton", "feedback-actions", '<ReactionButton label="Like" variant="like" />', "Toggle the reaction to see the heart settle with a small burst.", "Use pressed/onPressedChange or defaultPressed.", "The button exposes pressed state without changing its accessible name."],
  "magnetic-button": ["MagneticButton", "feedback-actions", '<MagneticButton onClick={() => console.info("Opened")}>Open collection</MagneticButton>', "Move a pointer near the button edge and click, or activate directly with the keyboard.", "Accepts native button props. The motion is bounded to a few pixels.", "Only a fine pointer is affected. The activation target stays a native button."],
  "designbookmark-command-button": ["CommandButton", "state-buttons", '<CommandButton label="Export draft" shortcutLabel="Alt E" chord={{ modifier: "alt", key: "e" }} onExecute={() => console.info("Export requested")} />', "Activate the engraved keycap button or use its chord.", "An optional explicit chord calls onExecute and is ignored in editable controls.", "A native button remains the main entry point."],
  "kokonut-command-button": ["CommandButton", "state-buttons", '<CommandButton label="Open workspace" variant="tile" shortcutLabel="Alt O" chord={{ modifier: "alt", key: "o" }} onExecute={() => console.info("Open requested")} />', "Open a workspace using the tile or its displayed shortcut.", "Set the tile preset and provide onExecute. Keyboard collisions remain the caller’s responsibility.", "The shortcut is announced with aria-keyshortcuts."],
  "cart-button": ["CartAction", "feedback-actions", '<CartAction label="Add to bag" count={0} onAdd={() => console.info("Add requested")} />', "Add an item to the local demo bag and watch its count change.", "Count is controlled by the application. onAdd is an intent callback.", "The count stays visible and readable under reduced motion."],
  "bell-button": ["ReactionButton", "feedback-actions", '<ReactionButton label="Alerts" variant="bell" />', "Enable or disable alerts. A short ring follows activation.", "Controlled or uncontrolled pressed state.", "The same label identifies both pressed states."],
  "undo-button": ["UndoAction", "feedback-actions", '<UndoAction label="Undo" onUndo={() => console.info("Undo requested")}>Item moved</UndoAction>', "Reverse a demo move and observe the updated message.", "Supply onUndo and an outcome message from your app.", "Use the disabled state when the action cannot be undone."],
  "toggle-switch": ["ToggleSwitch", "state-buttons", '<ToggleSwitch label="Quiet hours" name="quiet-hours" />', "Toggle quiet hours by pointer or keyboard.", "Supply a name for form submission and optional controlled state.", "Native checkbox with switch semantics and a visible focus ring."],
  "notification-stack": ["NotificationStack", "notification-stack", '<NotificationStack label="Updates" items={[{ id: "1", title: "Draft ready" }]} onDismiss={id => console.info(id)} />', "Expand the notices, remove one, and inspect the remaining notices.", "Pass items and dismiss them in the caller. Closed stack shows one notice.", "Dismissal moves focus to the persistent stack toggle."],
  "step-progress": ["ProgressSequence", "progress-sequence", '<ProgressSequence label="Setup" stages={[{ id: "1", label: "Details", state: "current" }]} />', "Advance setup and watch the connected progress update.", "Pass stable step IDs and state.", "The current step is marked semantically and remains readable."],
  "agent-steps": ["ProgressSequence", "progress-sequence", '<ProgressSequence label="Task activity" variant="expandable" stages={[{ id: "1", label: "Review", state: "current", detail: "Checking source files." }]} />', "Open each event to inspect what the agent did.", "Expandable variant accepts details and caller-owned stage states.", "Each detail disclosure has a named button and a controlled region."],
  "tool-approval": ["ToolApproval", "tool-approval", '<ToolApproval title="Read file" description="Review the requested file." state="pending" onDecision={value => console.info(value)} />', "Approve or deny reading a demo file. No operation is executed.", "Supply title, parameter summary and a caller-controlled decision state.", "Allow and Deny are distinct native buttons."],
  "goo-thinking": ["GooThinking", "tool-approval", '<GooThinking label="Waiting for a response" pending />', "Start or stop the synthetic pending indicator.", "Pass pending and a meaningful label for the current state.", "The live status remains readable when the brief animation is removed."],
} as const;
type Kind = keyof typeof configs;
export function feedbackStory(kind: Kind): Specimen {
  const [name, file, snippet, states, api, accessibility] = configs[kind];
  return {
    component: function Study({ reduced, language, comparison, config, update }) {
      const [count, setCount] = useState(0);
      const [localState, setState] = useState<"idle" | "pending" | "success" | "error">("idle");
      const [localDecision, setDecision] = useState<"pending" | "approved" | "denied">("pending");
      const [notices, setNotices] = useState([1, 2, 3]);
      const tr = language === "tr";
      const word = (en: string, turkish: string) => tr ? turkish : en;
      const caption = (en: string, turkish: string) => stringValue(config, "label") ?? word(en, turkish);
      const disabled = booleanValue(config, "disabled");
      const state = (stringValue(config, "state") as typeof localState | undefined) ?? localState;
      const decision = (stringValue(config, "state") as typeof localDecision | undefined) ?? localDecision;
      const step = () => setCount((value) => value + 1);
      const number = new Intl.NumberFormat(tr ? "tr-TR" : "en-US").format(count);
      let content;
      switch (kind) {
        case "plan-switch":
          content = <PlanSwitch label={caption("Billing cycle", "Faturalama dönemi")} reducedMotion={reduced}
            monthlyLabel={word("Monthly", "Aylık")} annualLabel={stringValue(config, "annualLabel") ?? word("Annual", "Yıllık")}>
            {(annual) => <div className="mx-demo-sample"><strong>{annual ? "$120" : "$12"}</strong><p>{annual ? word("Per year · save $24", "Yıllık · 24 $ tasarruf") : word("Per month", "Aylık")}</p></div>}
          </PlanSwitch>; break;
        case "hold-button": case "hold-to-publish": case "slide-to-confirm": {
          const label = kind === "hold-button" ? word("Hold to arm", "Etkinleştirmek için basılı tutun") : kind === "hold-to-publish" ? word("Hold to publish", "Yayınlamak için basılı tutun") : word("Slide to confirm", "Onaylamak için kaydırın");
          const props = { label: stringValue(config, "label") ?? label, disabled, onConfirm: step, reducedMotion: reduced, confirmLabel: word("Confirm", "Onayla"), cancelLabel: word("Cancel", "Vazgeç"),
            description: <p>{word("This changes only the demo state.", "Bu işlem yalnızca demo durumunu değiştirir.")}</p> };
          content = <>{kind === "slide-to-confirm" ? <SlideConfirm {...props} /> : <HoldConfirm {...props} duration={numberValue(config, "duration")} variant={kind === "hold-button" ? "hold" : "publish"} />}
            <p role="status">{word("Confirmed intents", "Onaylanan işlemler")} · {number}</p></>; break;
        }
        case "loading-to-success": {
          const names = { idle: word("Ready", "Hazır"), pending: word("Waiting for response", "Yanıt bekleniyor"), success: word("Demo confirmed", "Demo onaylandı"), error: word("Demo failed", "Demo başarısız") };
          content = <><label>{word("Demo result", "Demo sonucu")} <select value={state} onChange={e => { if (config?.state !== undefined) update?.("state", e.target.value); else setState(e.target.value as typeof state); }}>
            {Object.entries(names).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
          </select></label><ActionOutcome state={state} label={stringValue(config, "label") ?? names[state]} reducedMotion={reduced} /></>; break;
        }
        case "copy-button":
          content = <><p><code>{stringValue(config, "text") ?? "studio-access-2026"}</code></p><CopyTextButton text={stringValue(config, "text") ?? "studio-access-2026"} label={caption("Copy access code", "Erişim kodunu kopyala")} copiedLabel={word("Copied", "Kopyalandı")} errorLabel={word("Copy unavailable", "Kopyalanamadı")} /></>; break;
        case "like-burst": case "bell-button":
          content = <ReactionButton label={kind === "like-burst" ? caption("Like", "Beğen") : caption("Alerts", "Bildirimler")} disabled={disabled} variant={(stringValue(config, "variant") ?? (kind === "like-burst" ? "like" : "bell")) as "like" | "bell"} reducedMotion={reduced} />; break;
        case "magnetic-button":
          content = <><MagneticButton reducedMotion={reduced} onClick={step} disabled={disabled}>{stringValue(config, "children") ?? word("Open collection", "Koleksiyonu aç")}</MagneticButton><p>{word("Opened", "Açıldı")} · {number}</p></>; break;
        case "designbookmark-command-button": case "kokonut-command-button": {
          const tile = kind === "kokonut-command-button";
          content = <><CommandButton label={tile ? caption("Open workspace", "Çalışma alanını aç") : caption("Export draft", "Taslağı dışa aktar")} disabled={disabled}
            variant={(stringValue(config, "variant") ?? (tile ? "tile" : "engraved")) as "tile" | "engraved"} shortcutLabel={tile ? "Alt O" : "Alt E"}
            chord={comparison ? undefined : { key: tile ? "o" : "e", modifier: "alt" }} onExecute={step} /><p>{word("Invocations", "Çalıştırma")} · {number}</p></>; break;
        }
        case "cart-button":
          content = <CartAction label={caption("Add to bag", "Sepete ekle")} count={count} disabled={disabled} onAdd={step} reducedMotion={reduced} />; break;
        case "undo-button":
          content = <UndoAction label={caption("Undo", "Geri al")} onUndo={step} disabled={disabled || count > 0}>
            {count ? word("Item restored", "Öğe geri yüklendi") : word("Item moved", "Öğe taşındı")}</UndoAction>; break;
        case "toggle-switch":
          content = <ToggleSwitch label={caption("Quiet hours", "Sessiz saatler")} disabled={disabled} reducedMotion={reduced} />; break;
        case "notification-stack": {
          const titles = tr ? ["Taslak hazır", "Yorum geldi", "Dosya kaydedildi"] : ["Draft ready", "New comment", "File saved"];
          content = <NotificationStack label={caption("Updates", "Güncellemeler")} items={notices.map((id) => ({ id: String(id), title: titles[id - 1] }))}
            onDismiss={(id) => setNotices((items) => items.filter((n) => String(n) !== id))} dismissLabel={word("Dismiss", "Kapat")} emptyLabel={stringValue(config, "emptyLabel") ?? word("No notifications", "Bildirim yok")} reducedMotion={reduced} />; break;
        }
        case "step-progress": case "agent-steps": {
          const agent = kind === "agent-steps";
          const names = agent ? [word("Collect inputs", "Girdileri al"), word("Review notes", "Notları incele"), word("Write summary", "Özet yaz")] :
            [word("Details", "Ayrıntılar"), word("Review", "İncele"), word("Submit", "Gönder")];
          const stages = names.map((label, i): ProgressStage => ({ id: String(i), label,
            detail: word("This is a synthetic run entry.", "Bu bir demo adımıdır."),
            state: count > i ? "complete" : count === i ? "current" : "upcoming" }));
          content = <><ProgressSequence label={caption("Progress", "İlerleme")} stages={stages} variant={(stringValue(config, "variant") ?? (agent ? "expandable" : "linear")) as "expandable" | "linear"} reducedMotion={reduced} />
            <button className="mx-demo-button" type="button" disabled={count >= names.length} onClick={step}>{word("Advance demo", "Demo adımını ilerlet")}</button></>; break;
        }
        case "tool-approval":
          content = <ToolApproval title={stringValue(config, "title") ?? word("Read project notes", "Proje notlarını oku")} state={decision}
            description={decision === "pending" ? word("Review the requested file.", "İstenen dosyayı inceleyin.") : decision === "approved" ? word("Demo request allowed", "Demo isteğine izin verildi") : word("Demo request denied", "Demo isteği reddedildi")}
            parameterSummary={<code>notes.txt</code>} approveLabel={word("Allow", "İzin ver")} denyLabel={word("Deny", "Reddet")} onDecision={allowed => { const next = allowed ? "approved" : "denied"; if (config?.state !== undefined) update?.("state", next); else setDecision(next); }} />; break;
        case "goo-thinking":
          content = <><GooThinking label={stringValue(config, "label") ?? (count % 2 ? word("Waiting for reply", "Yanıt bekleniyor") : word("Ready", "Hazır"))} pending={booleanValue(config, "pending") ?? count % 2 > 0} reducedMotion={reduced} />
            <button className="mx-demo-button" type="button" onClick={() => { if (config?.pending !== undefined) update?.("pending", !config.pending); else step(); }}>{(booleanValue(config, "pending") ?? count % 2 > 0) ? word("Stop demo", "Demoyu durdur") : word("Start demo", "Demoyu başlat")}</button></>; break;
      }
      return <div className="mx-demo mx-demo-center">{content}</div>;
    },
    usage: `"use client";

import { ${name} } from "@/components/sapienx-motion/${file}";

export function Example() {
  return ${snippet};
}`,
    states, api, accessibility,
    performance: "Animations are bounded to local feedback. The demonstration has no external requests.",
  };
}
