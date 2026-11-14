# BookPlace adoption profile

Use the public hotel preview with an isolated fixture. The `codex/motionux-pilot` baseline at `34fe690` is read-only for this plan. Apply hotel theme tokens at the public experience boundary and preserve Core-owned PMS and the authenticated shell. [Pilot verification](VERIFICATION.md#bookplace)

| Priority | Existing surface | MotionUX candidate and minimum scope | Acceptance |
| --- | --- | --- | --- |
| 1 | Published hotel `/`, mobile navigation in HotelExperience | Evaluate Bottom bar with the existing anchors, active destination and More sheet trigger. Leave navigation semantics and history with the product. | Touch, safe areas, Escape and focus return from More. |
| 2 | Published hotel `/#room-options`, room photos in `PublicSite` | Evaluate Expand card around secondary room content. Retain lazy images and the existing room action. | Long room names, image failure, keyboard closure and 200% zoom. |
| 3 | Published hotel `/`, booking party selector in `PublicSite` | Evaluate Number stepper for the guest value. Keep adults/children validation and inventory bounds in BookPlace. | Direct edit and increment, min/max, changing capacity and error feedback. |
| 4 | Published hotel `/#room-options`, `GuestCheckout` | Evaluate Step progress using existing search, review, verification and confirmation states. | Back/change room, sold out, invalid code, server failure and focus. |
| 5 | Published hotel `/`, email proof in `GuestCheckout` | Evaluate OTP code while retaining expiry, resend and confirmation handling. | Leading zero, full paste, keyboard submission, expiration and no premature confirmation. |

Use the specific full SHA from the [Studio inventory](REFERENCE-INVENTORY.md) for each preview. Begin with `shadcn view` and `add --dry-run`, inspect the diff, and test in an isolated product fixture before considering adoption. The existing stable dock and disclosure remain available as `#v1.0.0`.
