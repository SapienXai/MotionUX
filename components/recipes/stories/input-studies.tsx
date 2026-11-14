import { booleanValue, numberValue, stringValue } from "../values";
import { useState } from "react";
import { LetterLimit, OtpCode, PasswordStrength, SpringField, TagInput } from "../../inputs/text-fields";
import { CheckboxList, NumberStepper, RangePair, StarRating, ValueSlider } from "../../inputs/value-controls";
import { CardField, FileDrop, SignaturePad, WheelPicker, type CardDetails, type InkPoint } from "../../inputs/special-fields";
import { quietHills } from "../quiet-hills";
import { usageExample } from "./usage-example";
import type { Specimen } from "../specimen";
import "./demo.css";
import "./input-studies.css";

const examples = {
  "letter-limit": ["LetterLimit", "text-fields", '<LetterLimit label="Caption" value={value} onValueChange={setValue} limit={40} describe={n => `${n} remaining`} />', "Tracks graphemes when Intl.Segmenter is available. Composition remains editable until committed."],
  "springy-input": ["SpringField", "text-fields", '<SpringField label="Project name" value={value} onValueChange={setValue} error={value.length > 18 ? "Use 18 characters or fewer" : undefined} />', "Focus animates a separate underline. Validation and error descriptions are independent of animation."],
  "otp-code": ["OtpCode", "text-fields", '<OtpCode label="Verification code" length={6} value={value} onValueChange={setValue} name="code" required />', "One text input accepts full paste and platform one-time-code autofill."],
  "tag-input": ["TagInput", "text-fields", '<TagInput label="Tags" value={tags} onValueChange={setTags} removeLabel={tag => `Remove ${tag}`} />', "Enter or the Add button commits a unique tag. Removing a tag returns focus to the input."],
  "password-strength": ["PasswordStrength", "text-fields", '<PasswordStrength label="New password" value={value} onValueChange={setValue} describeRule={met => met ? "Met" : "Not met"} rules={[{ id: "long", label: "12 characters", test: value => value.length >= 12 }]} />', "Rules are caller-defined feedback for a masked input."],
  "jelly-slider": ["ValueSlider", "value-controls", '<ValueSlider label="Elasticity" variant="jelly" value={amount} onValueChange={setAmount} />', "A native range follows the gesture. A decorative thumb compresses while held, then springs back."],
  "exposure-slider": ["ValueSlider", "value-controls", '<ValueSlider label="Exposure" variant="exposure" min={-2} max={2} step={0.25} value={amount} onValueChange={setAmount} />', "The demo applies the controlled value to a local photograph."],
  "detent-dial": ["ValueSlider", "value-controls", '<ValueSlider label="Gain" variant="dial" min={0} max={10} value={amount} onValueChange={setAmount} />', "The dial tracks a primary pointer angle. The named native range provides the same values."],
  "range-slider": ["RangePair", "value-controls", '<RangePair label="Budget" minimumLabel="Minimum" maximumLabel="Maximum" low={range[0]} high={range[1]} onValueChange={setRange} />', "Two independently labelled endpoints preserve order when edited."],
  "number-stepper": ["NumberStepper", "value-controls", '<NumberStepper label="Guests" name="guests" min={1} max={8} value={amount} onValueChange={setAmount} />', "Edit directly or use the buttons. Committed values stay within the configured bounds."],
  "star-rating": ["StarRating", "value-controls", '<StarRating label="Rating" value={amount} onValueChange={setAmount} describe={n => `${n} out of 5`} />', "One native radio group supports the pointer, touch and arrow keys."],
  "checkbox-list": ["CheckboxList", "value-controls", '<CheckboxList label="Amenities" choices={[{ value: "desk", label: "Desk" }]} value={tags} onValueChange={setTags} describe={n => `${n} selected`} />', "Submit selections as repeated native checkbox values under the given name."],
  "file-drop": ["FileDrop", "special-fields", '<FileDrop label="Choose files" accept=".txt" maxBytes={16384} files={files} onFiles={setFiles} describeError={error => `${error.file.name}: ${error.reason}`} />', "The same validation handles native file selection and drop. Consumers own upload and storage."],
  "card-field": ["CardField", "special-fields", '<CardField label="Test card details" labels={{ number: "Card number", expiry: "Expiry", code: "Security code" }} value={card} onValueChange={setCard} />', "Display formatting is separate from digit values. Demo data stays on this page."],
  "signature-pad": ["SignaturePad", "special-fields", '<SignaturePad label="Signature" typeLabel="Type your name" undoLabel="Undo stroke" clearLabel="Clear" value={signature} onValueChange={setSignature} />', "Draw on the bounded surface or use the labelled text alternative."],
  "wheel-picker": ["WheelPicker", "special-fields", '<WheelPicker label="Check-in time" values={[{ id: "14", label: "14:00" }, { id: "15", label: "15:00" }]} value={value} onValueChange={setValue} />', "Native radio detents align to scroll snap. Arrows, Home and End select directly."],
} as const;

const exampleSetup: Partial<Record<keyof typeof examples, string>> = {
  "letter-limit": "const [value, setValue] = useState(\"\");",
  "springy-input": "const [value, setValue] = useState(\"\");",
  "otp-code": "const [value, setValue] = useState(\"\");",
  "tag-input": "const [tags, setTags] = useState<string[]>([]);",
  "checkbox-list": "const [tags, setTags] = useState<string[]>([]);",
  "password-strength": "const [value, setValue] = useState(\"\");",
  "jelly-slider": "const [amount, setAmount] = useState(35);",
  "exposure-slider": "const [amount, setAmount] = useState(0);",
  "detent-dial": "const [amount, setAmount] = useState(4);",
  "range-slider": "const [range, setRange] = useState<[number, number]>([25, 75]);",
  "number-stepper": "const [amount, setAmount] = useState(2);",
  "star-rating": "const [amount, setAmount] = useState(3);",
  "file-drop": "const [files, setFiles] = useState<File[]>([]);",
  "card-field": "const [card, setCard] = useState({ number: \"\", expiry: \"\", code: \"\" });",
  "signature-pad": "const [signature, setSignature] = useState<{ typed: string; strokes: readonly (readonly { x: number; y: number }[])[] }>({ typed: \"\", strokes: [] });",
  "wheel-picker": "const [value, setValue] = useState(\"14\");"
};

type Kind = keyof typeof examples;
export function inputStory(kind: Kind): Specimen {
  const [name, file, snippet, detail] = examples[kind];
  return {
    component: function InputStudy({ language, reduced, config }) {
      const [value, setValue] = useState(kind === "wheel-picker" ? "14:00" : "");
      const [tags, setTags] = useState<string[]>(kind === "tag-input" ? ["studio"] : []);
      const [amount, setAmount] = useState(kind === "number-stepper" ? 2 : kind === "jelly-slider" ? 35 : kind === "star-rating" ? 3 : kind === "detent-dial" ? 4 : 0);
      const [range, setRange] = useState<[number, number]>([25, 75]);
      const [files, setFiles] = useState<File[]>([]);
      const [card, setCard] = useState<CardDetails>({ number: "", expiry: "", code: "" });
      const [signature, setSignature] = useState<{ typed: string; strokes: readonly (readonly InkPoint[])[] }>({ typed: "", strokes: [] });
      const tr = language === "tr";
      const t = (english: string, turkish: string) => tr ? turkish : english;
      const format = new Intl.NumberFormat(tr ? "tr-TR" : "en-US", { maximumFractionDigits: 2 });
      const count = (n: number, en: string, turkish: string) => `${format.format(n)} ${t(en, turkish)}`;
      const caption = (en: string, tr: string) => stringValue(config, "label") ?? t(en, tr);
      const disabled = booleanValue(config, "disabled");
      const style = (fallback: "jelly" | "exposure" | "dial") => (stringValue(config, "variant") ?? fallback) as typeof fallback;
      const fieldProps = { value, onValueChange: setValue, disabled };
      const numericProps = { value: amount, onValueChange: setAmount, disabled };
      let control;
      switch (kind) {
        case "letter-limit":
          control = <LetterLimit {...fieldProps} label={caption("Caption", "Açıklama")} name="caption" limit={numberValue(config, "limit") ?? 20} locale={tr ? "tr" : "en"} describe={n => count(n, "remaining", "karakter kaldı")} />; break;
        case "springy-input":
          control = <SpringField {...fieldProps} label={caption("Project name", "Proje adı")} name="project" placeholder={stringValue(config, "placeholder") ?? "Juniper"}
            hint={t("Up to 18 characters", "En fazla 18 karakter")}
            error={value.length > 18 ? t("Use 18 characters or fewer", "En fazla 18 karakter kullanın") : undefined} />; break;
        case "otp-code":
          control = <OtpCode {...fieldProps} label={caption("Verification code", "Doğrulama kodu")} name="code" length={numberValue(config, "length")} required />; break;
        case "tag-input":
          control = <TagInput label={caption("Tags", "Etiketler")} value={tags} onValueChange={setTags} limit={numberValue(config, "limit")} disabled={disabled} addLabel={t("Add", "Ekle")}
            removeLabel={tag => t(`Remove ${tag}`, `${tag} etiketini kaldır`)} />; break;
        case "password-strength":
          control = <PasswordStrength {...fieldProps} label={caption("New password", "Yeni parola")} rules={[
            { id: "length", label: t("At least 12 characters", "En az 12 karakter"), test: candidate => candidate.length >= 12 },
            { id: "digit", label: t("Includes a digit", "Bir rakam içerir"), test: candidate => /\d/.test(candidate) },
          ]} describeRule={met => met ? t("Met", "Karşılandı") : t("Unmet", "Karşılanmadı")} />; break;
        case "jelly-slider":
          control = <ValueSlider {...numericProps} label={caption("Elasticity", "Esneklik")} variant={style("jelly")} reducedMotion={reduced} elasticity={numberValue(config, "elasticity")}
            format={n => format.format(n) + "%"} />; break;
        case "exposure-slider":
          control = <div className="mx-exposure-demo">
            <img src={quietHills} alt={t("Snowy forest beneath low clouds", "Alçak bulutların altında karlı orman")} width={720} height={480}
              style={{ filter: `brightness(${2 ** (amount / 2)})` }} />
            <ValueSlider {...numericProps} label={caption("Exposure", "Pozlama")} variant={style("exposure")} min={-2} max={2} step={.25}
              format={n => format.format(n) + " EV"} reducedMotion={reduced} />
          </div>; break;
        case "detent-dial":
          control = <ValueSlider {...numericProps} label={caption("Gain", "Kazanç")} variant={style("dial")} max={10}
            format={n => format.format(n) + " dB"} reducedMotion={reduced} />; break;
        case "range-slider":
          control = <RangePair label={caption("Nightly budget", "Gecelik bütçe")} minimumLabel={t("Minimum", "En düşük")} maximumLabel={t("Maximum", "En yüksek")}
            low={range[0]} high={range[1]} disabled={disabled} onValueChange={setRange} format={n => "$" + format.format(n)} />; break;
        case "number-stepper":
          control = <NumberStepper {...numericProps} label={caption("Guests", "Konuklar")} name="guests" min={1} max={numberValue(config, "max") ?? 8}
            minusLabel={t("Remove one guest", "Bir konuk çıkar")} plusLabel={t("Add one guest", "Bir konuk ekle")} />; break;
        case "star-rating":
          control = <StarRating {...numericProps} label={caption("Rate your stay", "Konaklamayı puanlayın")} name="rating" max={numberValue(config, "max")}
            describe={n => t(`${n} out of ${numberValue(config, "max") ?? 5} stars`, `${numberValue(config, "max") ?? 5} üzerinden ${n} yıldız`)} />; break;
        case "checkbox-list":
          control = <CheckboxList label={caption("Amenities", "Olanaklar")} value={tags} onValueChange={setTags} name="amenities" disabled={disabled}
            describe={n => count(n, "selected", "seçildi")} choices={[
              { value: "desk", label: t("Work desk", "Çalışma masası") },
              { value: "terrace", label: t("Private terrace", "Özel teras") },
            ]} />; break;
        case "file-drop":
          control = <FileDrop files={files} onFiles={setFiles} label={caption("Select or drop files", "Dosya seçin veya bırakın")}
            hint={t("Plain text, up to 16 KB", "Düz metin, en fazla 16 KB")} accept=".txt,text/plain" maxBytes={numberValue(config, "maxBytes") ?? 16384} multiple={booleanValue(config, "multiple")} disabled={disabled}
            describeError={({ file, reason }) => `${file.name} · ${reason === "type" ? t("Unsupported file type", "Desteklenmeyen dosya türü") : reason === "size" ? t("File too large", "Dosya boyutu fazla") : t("Choose one file", "Tek dosya seçin")}`} />; break;
        case "card-field":
          control = <CardField label={caption("Synthetic card details", "Örnek kart bilgileri")} labels={{ number: t("Card number", "Kart numarası"),
            expiry: t("Expiry", "Son kullanma"), code: t("Security code", "Güvenlik kodu") }} value={card} onValueChange={setCard} disabled={disabled} />; break;
        case "signature-pad":
          control = <SignaturePad label={caption("Demo signature", "Örnek imza")} typeLabel={stringValue(config, "typeLabel") ?? t("Type your name", "Adınızı yazın")}
            undoLabel={t("Undo stroke", "Çizgiyi geri al")} clearLabel={t("Clear signature", "İmzayı temizle")}
            value={signature} onValueChange={setSignature} disabled={disabled} />; break;
        case "wheel-picker":
          control = <WheelPicker label={caption("Check-in time", "Giriş saati")} name="check-in" {...fieldProps}
            values={["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(id => ({ id, label: id }))} />; break;
      }
      return <div className="mx-demo mx-demo-center">{control}</div>;
    },
    usage: usageExample(name, `${file}`, snippet, exampleSetup[kind]),
    states: detail, api: "Control the submitted value from your form. Labels are configurable.",
    accessibility: detail, performance: "Input events are immediate. Motion is isolated from the committed form value.",
  };
}
