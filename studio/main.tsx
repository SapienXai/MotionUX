import { createRoot } from "react-dom/client";

const params = new URLSearchParams(location.search);
if (params.has("legacy") && !params.has("item")) {
  document.documentElement.lang = "tr";
  void import("../examples/main");
} else {
  void import("./app/entry").then(({ default: Studio }) => createRoot(document.getElementById("root")!).render(<Studio />));
}
