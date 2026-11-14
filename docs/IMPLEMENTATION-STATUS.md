# MotionUX v2 implementation status

The live inventory contains 82 references across DesignBookmark (51), Kokonut UI (25) and SmoothUI (6). The v1 registry remains available. A v2 reference is ready when its live implementation, install, accessibility and visual evidence are recorded.

| Wave | Checkpoint |
| --- | --- |
| 0 | All 82 references reconciled with the brief. Independent implementation chosen wherever file-level redistribution was unverified. |
| 1 | Studio catalog, theme and viewport controls, reduced-motion comparison and GitHub CI. The v1 demos are at `/?legacy=1`. |
| 2 | 15 navigation previews. Native top layer and viewport positioning tested for the shared action-menu variants. |
| 3 | 19 feedback previews with caller-owned results for consequential actions. |
| 4 | 16 form previews. Playwright covered each of these on three browser profiles. |
| 5 | 14 card and gesture previews. All 42 browser checks passed across three profiles. |
| 6 | 18 typography, simulated AI and audio previews. The playback demos use a local authored tone sample. |
| 7 | 82/82 live previews and install paths; 320px stability sweep, 82 rest-state axe scans and desktop/mobile captures, with representative active-state visual review. Individual premium acceptance remains open. |

**Release pending.** All 82 references are live previews. See the [per-reference ledger](REFERENCE-INVENTORY.md).

| Provider | Total | Ready | Needs review | Blocked |
| --- | ---: | ---: | ---: | ---: |
| DesignBookmark | 51 | 0 | 51 | 0 |
| Kokonut UI | 25 | 0 | 25 | 0 |
| SmoothUI | 6 | 0 | 6 | 0 |

Complete visual and gesture review by reference. Known follow-ups include legacy-browser fallback placement for overlays, shared-layout continuity on expansion, signature stroke workload under real touch, and touch/scroll behavior outside emulation. Additional per-item reduced-motion and error cases, real-device tests, and consumer integration benchmarks are tracked in the [verification report](VERIFICATION.md).
