export const hotelBriefs = [
  [
    "en",
    "Create a fictional boutique Mediterranean hotel website with an editorial hero, rooms, gallery, about page and demo inquiry. Use cream, charcoal and olive tones. No live reservations.",
  ],
  [
    "tr",
    "Akdeniz kıyısında kurgusal bir butik otel sitesi oluştur. Odalar, görsel galeri, hakkımızda ve yerel konaklama talebi sayfası olsun. Animasyon istemiyorum, anında geri bildirim ver.",
  ],
];
export const hotelProposal = (locale) => ({
  template: "hotel-marketing",
  locale,
  name: "Costa di Sera",
  summary: "A fictional boutique hotel site.",
  theme: "system",
  sidebar: "expanded",
  motion: "system",
  unsupported: [],
  pages: [
    {
      route: "/",
      label: "Home",
      heading: "A quieter shore",
      purpose: "Introduce the hotel.",
      blocks: [
        { id: "HeroEditorial", reason: "Show the coast." },
        { id: "FAQAccordion", reason: "Answer common questions." },
      ],
    },
    {
      route: "/rooms",
      label: "Rooms",
      heading: "Our rooms",
      purpose: "Introduce the rooms.",
      blocks: [
        { id: "RoomCollection", reason: "Provide access to the room pages." },
      ],
    },
    {
      route: "/about",
      label: "About",
      heading: "Our story",
      purpose: "Present the hotel.",
      blocks: [{ id: "HeroSplit", reason: "Pair copy and an image." }],
    },
    {
      route: "/contact",
      label: "Contact",
      heading: "Plan a stay",
      purpose: "Validate an inquiry locally.",
      blocks: [{ id: "ContactForm", reason: "Show local form validation." }],
    },
  ],
});
