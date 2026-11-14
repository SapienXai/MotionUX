import { stringValue } from "../playground/controls";
import { SwipeTabs } from "../../components/navigation/swipe-tabs";
import type { Specimen } from "../catalog";
import "./demo.css";

const story: Specimen = {
  component: ({ reduced, language, config }) => <div className="mx-demo">
    <SwipeTabs label={stringValue(config, "label") ?? (language === "tr" ? "Koleksiyon" : "Collection")} reducedMotion={reduced} pages={
      (language === "tr" ? ["Yüzey", "Renk", "Biçim"] : ["Surface", "Colour", "Form"]).map((label, i) => ({
        value: String(i), label, content: <div className="mx-demo-sample"><strong>{label}</strong>
          <p>{language === "tr" ? "Bir panel seçin veya yana kaydırın." : "Select a panel or swipe sideways."}</p>
        </div>,
      }))
    } />
  </div>,
  usage: `"use client";

import { SwipeTabs } from "@/components/sapienx-motion/swipe-tabs";

export function Collection() {
  return <SwipeTabs label="Collection" pages={[
    { value: "surface", label: "Surface", content: <p>Surface studies</p> },
    { value: "colour", label: "Colour", content: <p>Colour studies</p> },
  ]} />;
}`,
  states: "Move through adjacent panels by touch, arrow keys or a direct tab selection.",
  api: "Pass pages with value, label and content. Controlled selection and disabled pages are supported.",
  accessibility: "Shares the same tab and panel contract as Tab pill. Vertical page scrolling remains enabled.",
  performance: "The gesture records only its origin and release. It does not re-render on pointer movement.",
};
export default story;
