# V13 starting point

The V13 import started from MotionUX main at `df938f49d1d41896873f63ce230f9c907825b863`. GitHub reported the same commit for `refs/heads/main`.

| Local measure | Baseline |
| --- | ---: |
| Ready originals | 152 |
| React and standalone HTML | 102 React, 50 HTML |
| Providers | 6 |
| Cached thumbnails | 608 across 152 originals |
| Frozen hashes | 2,145 source, recipe, installed and compiled preview files |
| V11 subset | 140 originals, 1,369 existing hashes matched |
| My Library | Readable, revision 0, 0 collections |
| Verified backup entries | 3,019 |

The archive was created in `.motionux-v9/backups/` and checked with `npm run studio:restore -- <archive> --check`. The check verified filenames and SHA-256 digests without restoring over the workspace. The frozen comparison file is `.motionux-v9/evidence/v13/baseline.json`. The archive, fingerprints and private browser captures stay in the local vault.

The matched baseline performance run used Chromium 159, a 1536 × 1024 viewport, 2× CPU throttling, three cold page loads, and three repeated scroll passes. Raw measurements, including renderer-only RSS and the Studio page's JavaScript heap, are in `.motionux-v9/evidence/v13/performance-baseline.json`.
