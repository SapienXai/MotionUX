import type { Adapter, Request } from "./contracts.ts";

const accordion = "originals/animateui-components-base-accordion/";
const registry = accordion + "apps/v1/apps/www/registry/";
export const adapters: Adapter[] = [
  {
    id: "disclosure-v1", fixture: "next", route: "/details", screen: "src/app/details/page.tsx",
    glue: "src/ui/disclosure-view.tsx", template: "disclosure.txt", component: "animateui-components-base-accordion",
    patterns: ["disclosure"], license: "MIT + Commons Clause", notice: accordion + "LICENSE.txt",
    props: ["AccordionItem.value", "AccordionTrigger.children", "AccordionPanel.transition"], styles: [accordion + "upstream.css"],
    files: [registry + "components/base/accordion/index.tsx", registry + "primitives/base/accordion/index.tsx",
      registry + "lib/get-strict-context/index.tsx", registry + "hooks/use-controlled-state/index.tsx", accordion + "apps/v1/packages/ui/upstream/lib/utils.ts"],
    packages: { "@base-ui-components/react": "1.0.0-beta.4", "clsx": "2.1.1", "lucide-react": "0.482.0", "motion": "12.43.0", "tailwind-merge": "3.7.0" },
    state: "The Next.js server page owns the room details. The client view only controls disclosure.",
  },
  {
    id: "picker-v1", fixture: "vite", file: "src/Screen.tsx", screen: "src/Screen.tsx",
    glue: "src/Picker.tsx", template: "picker.txt", component: "kokonut-wheel-picker",
    legacyComparison: true,
    patterns: ["picker"], license: "MIT", notice: "notices/kokonut.txt",
    props: ["columns", "value", "label", "onValueChange"], styles: ["upstream.css"],
    files: ["components/kokonutui/wheel-picker.tsx", "lib/utils.ts"],
    packages: { clsx: "2.1.1", motion: "12.23.25", "tailwind-merge": "3.4.0" },
    state: "The parent React screen owns the selected time. The picker emits a settled selection.",
  },
];
export const adapterFor = (req: Request) => adapters.find(row => row.fixture === req.fixture && row.component === req.source &&
  (row.route ? row.route === req.route && !req.file : row.file === req.file && !req.route));
