import { seedImageIds } from "./marketing-spec.ts";
import type { BlockId, BlockProps } from "./model.ts";

type Row = [BlockId, string, Partial<BlockProps>?];
export function marketingTemplate(
  make: (type: BlockId, id: string, props: Partial<BlockProps>) => unknown,
  locale: "en" | "tr",
) {
  const tr = locale === "tr";
  const t = (en: string, turkish: string) => (tr ? turkish : en);
  const photo = (asset: string, alt: string, focal = "center") => ({
    asset,
    alt,
    focal: focal as "center" | "top" | "bottom",
  });
  const coast = photo(
    "seed-coast",
    t(
      "White stone terraces above a rocky blue shore",
      "Kayalık mavi kıyının üzerindeki beyaz taş teraslar",
    ),
  );
  const room = photo(
    "seed-room",
    t(
      "Linen bed and an arched doorway facing the sea",
      "Keten örtülü yatak ve denize bakan kemerli kapı",
    ),
  );
  const pool = photo(
    "seed-pool",
    t(
      "Stone pool beneath a sunlit olive tree",
      "Güneş alan bir zeytin ağacının altındaki taş havuz",
    ),
  );
  const link = (cta: string, destination: string) => ({ cta, destination });
  const story: Row = [
    "StorySection",
    t("A slower kind of stay", "Daha yavaş bir konaklama"),
    {
      description: t(
        "Stone quarried nearby, linen made to be lived in, and a terrace that catches the last light. The things that matter here are simple.",
        "Yakın çevreden taş, günlük kullanıma uygun keten ve son ışığı yakalayan bir teras. Burada önemli olan şeyler sade.",
      ),
      image: pool,
    },
  ];
  const rooms: Row = [
    "RoomCollection",
    t("Stay close to the sea", "Denize yakın konaklayın"),
    {
      items: [
        {
          title: t("Terrace Suite", "Teras Süiti"),
          text: t(
            "42 m² · two guests · private terrace",
            "42 m² · iki misafir · özel teras",
          ),
          ...room,
          destination: "/terrace-suite",
        },
        {
          title: t("Olive Room", "Zeytin Odası"),
          text: t(
            "32 m² · two guests · garden outlook",
            "32 m² · iki misafir · bahçe manzarası",
          ),
          ...pool,
          destination: "/olive-room",
        },
      ],
    },
  ];
  const amenities: Row = [
    "AmenityGrid",
    t("Life at Costa di Sera", "Costa di Sera’da yaşam"),
    {
      items: [
        {
          title: t("Saltwater pool", "Tuzlu su havuzu"),
          text: t(
            "A quiet swim in the shade of the olive trees.",
            "Zeytin ağaçlarının gölgesinde sakin bir yüzüş.",
          ),
        },
        {
          title: t("Terrace breakfast", "Terasta kahvaltı"),
          text: t(
            "Seasonal fruit, bread and coffee from the local kitchen.",
            "Yerel mutfaktan mevsim meyvesi, ekmek ve kahve.",
          ),
        },
        {
          title: t("Coastal walks", "Kıyı yürüyüşleri"),
          text: t(
            "Follow the old stone path down to the water.",
            "Eski taş yolu izleyerek suya inin.",
          ),
        },
      ],
    },
  ];
  const gallery: Row = [
    "GalleryGrid",
    t("The property in pictures", "Fotoğraflarla otel"),
    {
      items: [
        { ...coast, title: t("The coast", "Kıyı"), text: "" },
        { ...room, title: t("The suite", "Süit"), text: "" },
        { ...pool, title: t("The pool", "Havuz"), text: "" },
      ],
    },
  ];
  const faq: Row = [
    "FAQAccordion",
    t("Before you arrive", "Gelmeden önce"),
    {
      items: [
        {
          title: t("What time is check-in?", "Giriş saati nedir?"),
          text: t(
            "In this fictional example, check-in begins at 15:00.",
            "Bu kurgusal örnekte giriş saati 15.00’tir.",
          ),
        },
        {
          title: t("Is breakfast included?", "Kahvaltı dahil mi?"),
          text: t(
            "The example rates include a seasonal terrace breakfast.",
            "Örnek fiyatlara terasta mevsimlik kahvaltı dahildir.",
          ),
        },
        {
          title: t("Can I book a room here?", "Buradan oda ayırtabilir miyim?"),
          text: t(
            "The inquiry form demonstrates validation locally. It cannot place a reservation.",
            "Talep formu yerel doğrulamayı gösterir. Rezervasyon yapamaz.",
          ),
        },
      ],
    },
  ];
  const cta: Row = [
    "CTASection",
    t("Find your dates", "Tarihlerinizi belirleyin"),
    link(t("Open demo inquiry", "Örnek talebi açın"), "/contact"),
  ];
  const pricing: Row = [
    "PricingCards",
    t("Illustrative nightly rates", "Örnek gecelik fiyatlar"),
    {
      ...link(t("Open demo inquiry", "Örnek talebi açın"), "/contact"),
      items: [
        { title: t("Terrace Suite", "Teras Süiti"), text: "€320" },
        { title: t("Olive Room", "Zeytin Odası"), text: "€240" },
      ],
    },
  ];
  const page = (slug: string, title: string, sections: Row[]) => ({
    id: "p-" + slug,
    route: slug === "home" ? "/" : "/" + slug,
    title,
    blocks: (
      [
        ["MarketingHeader", "Costa di Sera"],
        ...sections,
        ["MarketingFooter", "Costa di Sera"],
      ] as Row[]
    ).map(([type, heading, props], index) =>
      make(type, "b-" + slug + "-" + index, { title: heading, ...props }),
    ),
  });
  return {
    name: "Costa di Sera",
    locale,
    template: "hotel-marketing",
    runtime: "next-16",
    theme: "system",
    sidebar: "expanded",
    motionProfile: "system",
    data: "marketing-demo-v1",
    assets: seedImageIds,
    pages: [
      page("home", t("Home", "Ana sayfa"), [
        [
          "HeroEditorial",
          t("A quieter shore.", "Daha sakin bir kıyı."),
          {
            image: coast,
            description: t(
              "An imagined boutique stay on the Mediterranean, between olive groves and the deep blue.",
              "Akdeniz’de, zeytinliklerle derin mavi arasında hayal edilmiş bir butik konaklama.",
            ),
            ...link(t("Explore the rooms", "Odaları keşfedin"), "/rooms"),
          },
        ],
        rooms,
        story,
        amenities,
        [
          "Testimonials",
          t("Notes from imagined stays", "Kurgusal konaklama notları"),
          {
            items: [
              {
                title: t("Fictional guest A", "Kurgusal misafir A"),
                text: t(
                  "We lost track of the time on the terrace.",
                  "Terasta zamanın nasıl geçtiğini anlamadık.",
                ),
              },
              {
                title: t("Fictional guest B", "Kurgusal misafir B"),
                text: t(
                  "It felt like the coast belonged to us for a morning.",
                  "Bir sabah boyunca kıyı bize aitmiş gibi hissettik.",
                ),
              },
            ],
          },
        ],
        faq,
        cta,
      ]),
      page("rooms", t("Rooms", "Odalar"), [
        [
          "HeroSplit",
          t("A room to come back to", "Dönmek isteyeceğiniz bir oda"),
          { image: room },
        ],
        rooms,
        pricing,
      ]),
      page("terrace-suite", t("Terrace Suite", "Teras Süiti"), [
        [
          "HeroSplit",
          t("Terrace Suite", "Teras Süiti"),
          {
            image: room,
            description: t(
              "42 m² for two, with a private sea-facing terrace.",
              "Denize bakan özel teraslı, iki kişilik 42 m² süit.",
            ),
          },
        ],
        gallery,
        cta,
      ]),
      page("olive-room", t("Olive Room", "Zeytin Odası"), [
        [
          "HeroSplit",
          t("Olive Room", "Zeytin Odası"),
          {
            image: pool,
            description: t(
              "A garden-facing retreat near the pool.",
              "Havuzun yanında, bahçeye bakan sakin bir oda.",
            ),
          },
        ],
        amenities,
        cta,
      ]),
      page("about", t("About", "Hakkında"), [
        [
          "HeroSplit",
          t("A home shaped by the coast", "Kıyının şekillendirdiği bir ev"),
          { image: coast },
        ],
        story,
        gallery,
        [
          "FeatureBento",
          t("Around the property", "Otelin çevresinde"),
          {
            items: [
              {
                title: t("The olive path", "Zeytin yolu"),
                text: t(
                  "From the terraces to the edge of the water.",
                  "Teraslardan suyun kenarına.",
                ),
                ...coast,
              },
              {
                title: t("A place to read", "Okuma köşesi"),
                text: t(
                  "Find a sheltered seat in the garden.",
                  "Bahçede korunaklı bir köşe bulun.",
                ),
              },
            ],
          },
        ],
        [
          "StatsStrip",
          t("At a glance", "Bir bakışta"),
          {
            items: [
              { title: t("Room types", "Oda türü"), text: "2" },
              { title: t("Saltwater pool", "Tuzlu su havuzu"), text: "1" },
            ],
          },
        ],
      ]),
      page("contact", t("Contact", "İletişim"), [
        [
          "ContactForm",
          t("Plan an imagined stay", "Örnek bir konaklama planlayın"),
        ],
        faq,
      ]),
    ],
  };
}
