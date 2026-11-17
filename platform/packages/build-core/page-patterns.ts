import type { Adapter, BlockId, BlockProps, Template } from "./model.ts";

type Locale = "en" | "tr";
type Text = Record<Locale, string>;
type Section = readonly [BlockId, Partial<BlockProps>?];
type Context = { data: Adapter; locale: Locale; name: string };
type Pattern = {
  label: Text;
  summary: Text;
  sections: (context: Context) => readonly Section[];
};
const text = (en: string, tr: string): Text => ({ en, tr });
const entries = (locale: Locale) => [
  {
    title: text("Start here", "Başlangıç")[locale],
    text: text("Open this guide to see the workspace essentials. Update this text in the editor to fit your team.", "Çalışma alanının temel bilgileri için kılavuzu açın. Ekibinize uyarlamak için editörde düzenleyin.")[locale],
  },
  {
    title: text("Update a procedure", "Prosedürü güncelleyin")[locale],
    text: text("Confirm the owner, write the steps in order and check the saved revision in Run.", "Sorumluyu doğrulayın, adımları sırayla yazın ve kaydedilen revizyonu Run’da kontrol edin.")[locale],
  },
];
export const pagePatternVersion = 1;
export const pagePatterns = {
  blank: {
    label: text("Blank page", "Boş sayfa"),
    summary: text("Start with an editable page heading.", "Düzenlenebilir bir sayfa başlığıyla başlayın."),
    sections: () => [],
  },
  overview: {
    label: text("Workspace overview", "Çalışma alanına genel bakış"),
    summary: text("Introduce a workspace and link to its next page.", "Çalışma alanını tanıtın ve sonraki sayfaya bağlantı verin."),
    sections: ({ locale }) => [["Hero", {
      title: text("Start exploring", "Keşfetmeye başlayın")[locale],
      description: text("Open the next page to get familiar with this workspace.", "Çalışma alanını tanımak için sonraki sayfayı açın.")[locale],
    }]],
  },
  intake: {
    label: text("Intake form", "Talep formu"),
    summary: text("Collect and validate a browser-local response.", "Tarayıcıda yerel bir yanıt alın ve doğrulayın."),
    sections: ({ locale }) => [["WorkspaceResponse", { title: text("Local response", "Yerel yanıt")[locale] }]],
  },
  reference: {
    label: text("Reference library", "Başvuru kitaplığı"),
    summary: text("Add editable, searchable guides and procedures.", "Düzenlenebilir ve aranabilir kılavuzlar ekleyin."),
    sections: ({ locale }) => [["ArticleLibrary", {
      title: text("Reference guides", "Başvuru kılavuzları")[locale],
      items: entries(locale),
    }]],
  },
  queue: {
    label: text("Operations queue", "Operasyon kuyruğu"),
    summary: text("Review and complete tasks from the local operations dataset.", "Yerel operasyon verisindeki görevleri inceleyin ve tamamlayın."),
    sections: ({ locale }) => [["OperationsQueue", { title: text("Assigned tasks", "Atanan görevler")[locale] }]],
  },
  workload: {
    label: text("Workload overview", "İş yüküne genel bakış"),
    summary: text("Show totals derived from the operations queue.", "Operasyon kuyruğundan hesaplanan toplamları gösterin."),
    sections: ({ locale }) => [["OperationsSummary", { title: text("Queue summary", "Kuyruk özeti")[locale] }]],
  },
  inquiry: {
    label: text("Website inquiry", "Site talebi"),
    summary: text("Add the website’s navigation and local demo form.", "Sitenin gezinme çubuğunu ve yerel örnek formunu ekleyin."),
    sections: ({ locale }) => [["ContactForm", { title: text("Send a demo inquiry", "Örnek talep oluşturun")[locale] }]],
  },
} satisfies Record<string, Pattern>;

export type PagePatternId = keyof typeof pagePatterns;
export const pagePatternIds = Object.keys(pagePatterns) as [PagePatternId, ...PagePatternId[]];

export const workspaceStarters = {
  "knowledge-base": {
    name: "Fieldnotes Handbook",
    pages: [
      ["home", "reference", "Handbook", "El kitabı"],
      ["guides", "reference", "Guides", "Kılavuzlar"],
      ["feedback", "intake", "Feedback", "Geri bildirim"],
    ],
  },
  "operations-workspace": {
    name: "Relay Operations",
    pages: [
      ["overview", "workload", "Operations overview", "Operasyona genel bakış"],
      ["queue", "queue", "Work queue", "İş kuyruğu"],
      ["runbooks", "reference", "Runbooks", "İşleyiş kılavuzları"],
    ],
  },
} as const satisfies Partial<Record<Template, {
  name: string;
  pages: readonly (readonly [string, PagePatternId, string, string])[];
}>>;
