export const designPresets = ["editorial", "precision", "warm"] as const;
export const presetDetails = {
  editorial: {
    name: ["Editorial Calm", "Dingin Editoryal"],
    detail: ["Paper surfaces, serif headings and generous spacing.", "Kâğıt tonları, serif başlıklar ve ferah boşluklar."],
    density: "generous", typography: "editorial", radius: "crisp",
  },
  precision: {
    name: ["Product Precision", "Ürün Netliği"],
    detail: ["Cool surfaces, compact controls and precise sans typography.", "Serin yüzeyler, kompakt kontroller ve sade sans tipografi."],
    density: "compact", typography: "system", radius: "rounded",
  },
  warm: {
    name: ["Warm Operations", "Sıcak Operasyon"],
    detail: ["Clay accents, soft corners and an easy reading rhythm.", "Kil tonları, yumuşak köşeler ve rahat okuma ritmi."],
    density: "balanced", typography: "humanist", radius: "soft",
  },
} as const;
export const recipeIds = [
  "welcome", "metrics", "sales-workbench", "contact-directory", "editorial-hero",
  "social-proof", "media-story", "stay-options", "questions", "reference",
  "work-queue", "team-response",
] as const;
export type RecipeId = (typeof recipeIds)[number];


export const sectionRecipeNames = {
  welcome: ["Welcome and next step", "Karşılama ve sonraki adım"],
  metrics: ["Metrics overview", "Gösterge özeti"],
  "sales-workbench": ["Sales workbench", "Satış çalışma alanı"],
  "contact-directory": ["Contacts and activity", "Kişiler ve etkinlik"],
  "editorial-hero": ["Editorial opening", "Editoryal açılış"],
  "social-proof": ["Proof and testimonials", "Kanıt ve yorumlar"],
  "media-story": ["Story and gallery", "Hikâye ve galeri"],
  "stay-options": ["Rooms and pricing", "Odalar ve fiyatlar"],
  questions: ["Questions and inquiry", "Sorular ve talepler"],
  reference: ["Searchable handbook", "Aranabilir el kitabı"],
  "work-queue": ["Workload and queue", "İş yükü ve kuyruk"],
  "team-response": ["Guides and feedback", "Kılavuz ve geri bildirim"],
} as const satisfies Record<RecipeId, readonly [string, string]>;
