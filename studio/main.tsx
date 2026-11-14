import { createRoot } from "react-dom/client";

if (new URLSearchParams(location.search).has("legacy")) {
  document.documentElement.lang = "tr";
  void import("../examples/main");
} else {
  void import("./app/entry").then(({ default: Studio }) => createRoot(document.getElementById("root")!).render(<Studio />));
}
