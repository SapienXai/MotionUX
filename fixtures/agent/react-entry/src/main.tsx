import { createRoot } from "react-dom/client";
import { RoomBrowser } from "./room-browser.js";

const root = document.getElementById("root");
if (root) createRoot(root).render(<RoomBrowser />);
