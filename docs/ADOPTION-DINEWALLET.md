# DineWallet adoption profile

Review the staff UI in an isolated local fixture. The `codex/motionux-pilot` baseline at `ae9ae91` is read-only for this plan. Apply the existing staff semantic tokens to the candidates. Keep roles, amounts, polling and idempotency in the application. Show success only after authoritative `CAPTURED`. [Pilot verification](VERIFICATION.md#dinewallet)

| Priority | Existing surface | MotionUX candidate and minimum scope | Acceptance |
| --- | --- | --- | --- |
| 1 | `/staff`, StaffApp mobile destinations | Bottom bar carries existing links and status. Keep route permissions and staff navigation unchanged. | Keyboard and tap, tiny screens, safe areas and venue switching. |
| 2 | `/staff/status` and `/staff/requests/[id]`, result state | Action outcome reflects actual poll results. Reserve success for captured and preserve full amount and currency text. | Synthetic pending, captured, failure, reload and one live status. |
| 3 | `/staff`, StaffApp history navigation | Segmented control changes the existing filter value. Preserve URL and reporting semantics. | Keyboard arrows, empty results, overflow and scoped fetch. |
| 4 | `/staff/collect`, StaffApp payment request result | Copy button reports an actual clipboard result for an already-created share string. | Clipboard denied, copied label, screen reader status and scrubbing of fixture secrets. |
| 5 | `/staff/scan`, StaffApp QR response | Use Step progress for visible scan, review and server-authorized outcome. Keep camera permission and transaction submission in existing logic. | Camera denied, retry, duplicate scan, navigation cancellation and no early success. |

Use `shadcn view` and `add --dry-run` with the exact full SHA for the attempted preview. Measure the staff bundle and test with the existing role and synthetic settlement fixtures before adopting. Keep physical Safari/PWA and staff OTP as explicit acceptance checks. [Per-item pins](REFERENCE-INVENTORY.md)
