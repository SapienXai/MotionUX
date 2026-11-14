import { useState } from "react";
import { PaginationDots } from "../../components/navigation/pagination-dots";
import type { Specimen } from "../catalog";
import "./demo.css";

const pages = {
  en: ["Arrive at the studio", "Meet the designers", "Review the collection", "Save your favourites"],
  tr: ["Stüdyoya gelin", "Tasarımcılarla tanışın", "Koleksiyonu inceleyin", "Beğendiklerinizi kaydedin"],
};

const story: Specimen = {
  component: function Example({ reduced, language }) {
    const [page, setPage] = useState(0);
    const tr = language === "tr";
    return <div className="mx-demo"><div className="mx-demo-sample">
      <p>{page + 1} / {pages[language].length}</p><strong>{pages[language][page]}</strong>
    </div><PaginationDots count={pages[language].length} value={page} onValueChange={setPage} reducedMotion={reduced}
      label={tr ? "Sayfalama" : "Pagination"} pageLabel={tr ? "Sayfa" : "Page"} previousLabel={tr ? "Önceki" : "Previous"} nextLabel={tr ? "Sonraki" : "Next"} /></div>;
  },
  usage: `"use client";

import { useState } from "react";
import { PaginationDots } from "@/components/sapienx-motion/pagination-dots";

export function Tour() {
  const [page, setPage] = useState(0);
  return <><p>Step {page + 1} of 4</p>
    <PaginationDots count={4} value={page} onValueChange={setPage} />
  </>;
}`,
  states: "Select a dot or go to the next page. Boundary arrows disable when you reach the first or last page.",
  api: "count is the number of pages; value and defaultValue are zero-based. Override labels for localisation.",
  accessibility: "Each button carries its page number or direction. The active dot exposes its current state.",
  performance: "The current dot uses a shared layout marker and is static under reduced motion.",
};
export default story;
