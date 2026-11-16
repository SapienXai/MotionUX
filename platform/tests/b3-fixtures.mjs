import { manualDocument } from "../packages/build-core/model.ts";

export const crmBrief =
  "Build a premium CRM sales dashboard with a desktop sidebar and mobile bottom navigation. Include sales overview, contacts with filters, editable local deal stages in pipeline, activity details, settings and fictional data.";
export const trBrief =
  "Satış ekibimiz için premium bir CRM tasarla. Satış özeti, kişi rehberi, satış hattı, aktiviteler ve ayarlar olsun. Mobilde alt gezinme, masaüstünde yan menü olsun. Başlıkları Türkçe yaz.";
export const briefs = [
  ["crm-en", crmBrief, "crm-dashboard", "en"],
  ["crm-tr", trBrief, "crm-dashboard", "tr"],
  [
    "hotel-en",
    "Create a calm premium hotel operations dashboard with occupancy metrics, bookings, room details and settings. Use fictional sample data.",
    "hotel-dashboard",
    "en",
  ],
  [
    "no-motion",
    "Make a static business form without animation. Use one clearly labeled local field, visible keyboard focus and local feedback.",
    "blank-app",
    "en",
  ],
  [
    "unsupported",
    "Create a light CRM demo for contacts, pipeline and activities, with live Stripe billing and real user authentication. Explain which requirements are unsupported.",
    "crm-dashboard",
    "en",
  ],
];
export function crmFixture() {
  return {
    template: "crm-dashboard",
    locale: "en",
    name: "Meridian CRM",
    summary:
      "The sales team can view contacts, move demo deals and inspect follow-ups.",
    theme: "light",
    sidebar: "expanded",
    motion: "system",
    unsupported: [],
    pages: manualDocument("crm-dashboard").pages.map((page) => ({
      route: page.route,
      label: page.title,
      heading: page.title,
      purpose: page.blocks[0].props.description,
      blocks: page.blocks
        .slice(1)
        .map((block) => ({
          id: block.type,
          reason: "Supports this demo workflow.",
        })),
    })),
  };
}
