# Build security

B8 keeps Gallery on its existing loopback origin and allows the Studio entry to frame the permitted Gallery documents. Original opaque sandbox frames, private asset paths and local-only APIs retain their existing restrictions. The Build API continues to enforce loopback host, same-origin request and managed-project rules. For verified media bytes, export rights and ownership checks, see [B8 managed media](BUILD-B8-MEDIA.md).

The shared header exchanges appearance, search and location updates with the Gallery window only. It pins both loopback origins and the expected window references. Managed image backups stream through the Build route's local host and same-origin checks with an explicit byte cap. Restore validates project identity, image format, dimensions, metadata, both rendition hashes and the per-project quota before publishing images. Purge checks all retained document references using the same lock as saves and recovery drafts.

Studio writes a validated versioned document under a server-generated project ID in the ignored vault. Document text is data. It cannot name a filesystem target, import, command, external image or executable component. The app registry distinguishes owned exportable blocks from private originals, which are excluded from exports.

The local HTTP API requires the configured loopback host and an exact browser origin for mutations. Project writes check the saved revision and preserve the prior verified document for recovery. Generated apps receive only the explicitly exported project document and registered source. The existing Agent V4 and MCP boundaries also apply to Build.

Only the Build launcher configures the canonical repository path. The HTTP API accepts project IDs and typed data; its mutation gate checks exact host, fetch site and destination, origin and a custom request header. ZIP paths come from the generator’s fixed catalog. Store directories require mode 0700 and regular single-link documents require mode 0600. Recovery verifies the backup before restoring it.

On macOS, Preview executes fixed Next production commands under the system sandbox with a sanitized process environment. The build has no network. The runtime is limited to one loopback port and accepts GET and HEAD on its exact host. The iframe allows scripts, same-origin APIs and forms inside the distinct origin; it grants no top-level navigation. The preview response restricts framing to Studio and supplies an app CSP. Studio and the frame exchange no messages. One preview can be active, can be stopped explicitly, and expires after eight minutes. A watchdog limits build time, process-group memory and scratch bytes. Only trusted generated source runs in this lane; an arbitrary host or same-account process is outside this trust boundary.

## Composer trust boundary

The only model authority is to draft JSON. The native bridge starts the installed ChatGPT desktop Codex CLI from a temporary workspace with a separate config root. It invokes `exec --ignore-user-config --ignore-rules --ephemeral --sandbox read-only --output-schema … --json`, with approval set to never, shell, shell snapshots, hooks, apps, plugins, skill discovery, web search, agent delegation and MCP off. No settings are changed. Node never reads credential bytes. The trusted CLI can read the owner's regular private auth file through a temporary alias; it cannot write to the original. The macOS policy blocks other executables, writes outside scratch, user/vault reads (except the auth file), and outbound ports except TCP 443 and the local resolver service. System files necessary to start Codex remain available to the process. The trusted CLI uses its existing ChatGPT service; the app installs no API key or telemetry.

Public catalog facts and the normalized brief are the only planner inputs. Obvious credentials, addresses, file paths and injection requests are rejected before planning. The model cannot provide code, URLs, private data adapters, package names, directions to external projects or custom actions. The app validates independently and derives unsupported capabilities from both proposal and brief. Personal information cannot be detected reliably in prose; use fictional content.

One job per loopback Studio, 75 s deadline, bounded JSON/stream, 32 MiB scratch ceiling, and cancellation of the native child. Requests use the Build origin checks. The in-memory review is short-lived, tied to an exact digest and single use on successful Create. A stale, replayed, malformed or cancelled review cannot create a project. The server ignores user-supplied provenance on saves. Preview and export bind to the requested saved revision; generated notes and private catalog data are excluded. Real project authorization, remote workspaces, production access and writable MCP remain out of scope.

## PWA cache boundary

Only the explicit PWA export emits a service worker. Its production snapshot covers the saved public demo pages and a finite same-origin asset list. It fetches those resources without credentials and does not store API responses, mutations, cross-origin resources, query variants or Studio and preview responses. Worker updates replace the previous snapshot only after the new inventory is complete and the old client's worker has released its scope. A PWA belongs on its own origin so installation, cache, and storage have the intended scope.

## Inspector boundary

The Studio API uses the existing loopback origin and mutation gates. A request identifies one page on the active saved Run revision. The worker checks the preview session and document headers, allows only GET and HEAD at the fixed preview origin, blocks redirects and service workers, and starts fresh browser contexts. The host runs a single inspection per preview with a wall-time and output limit. Stopping Run cancels the audit. The application and exports receive no inspection code or reports.

## Integration Lab boundary

The trusted operator configures a public Ed25519 pin at Studio startup. Incoming requests carry an ID and signature for one server-generated exact manifest, with a five-minute expiry and an in-process one-time claim. The signature covers the managed project ID, revision, route, generated source, lockfile and license hashes, temporary target identity and the full before/after file trees. The signing key stays with its custodian. Browser and model messages cannot issue host approvals.

The writable target is a generated child of the private Build integration folder. Preparation, application and rollback operate only on that copy. The lab checks current source, revision, complete file contents, modes and directory identity. It verifies the candidate and restored copy with separate builds in the existing macOS sandbox and loopback Chromium. Independent edits stop automatic restoration. A forced termination can leave a private disposable workspace. The threat model assumes the Studio checkout and OS are trusted. The Agent V4 real-project gate and read-only MCP remain separate.

## B10 authorship boundary

Preset, layout and record types use finite enum and numeric bounds. Recipes can instantiate only registered compatible blocks with known export rights. Section nesting, shell landmarks inside slots, arbitrary style strings, unknown fields and unowned media remain invalid. Composer proposal fields for style and sections are declarative choices reviewed by the same exact-digest contract. Local runtime task status is validated against authored IDs before use and cannot create records or authorize a server action.
