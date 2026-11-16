# Agent V4 trust model

## Identities and data

MotionUX treats model messages, tool arguments, project content, README and AGENTS files, shell output, request JSON, screenshots and review fingerprints as data. Checked hashes identify exact bytes. Authorization requires a separately authenticated issuer and a decision bound to those bytes. A deterministic manifest confirmation, a JSON field marked approved, workspace trust and an approval cached for a session carry no MotionUX authority.

V4 has a process-backed fixture operator for tests. The runner starts the known operator program over a private parent-child IPC channel, pins that process's ephemeral Ed25519 public key, and sends a fresh challenge. The operator loads the saved review from the fixed fixture namespace and independently checks its identity and full binding. Scripted decisions exercise acceptance, decline, cancellation, timeout and revocation. The private key stays in the operator process. The scripted operator carries fixture authority only.

The Codex host or a separate OS-protected operator would need to authenticate a human event and attest the exact display and effects. Codex App Server offers client responses for command, file and permission prompts. The public protocol exposes item IDs and dispositions. No supported signed MotionUX manifest receipt was identified for the installed client. MotionUX records native events as diagnostic observations and rejects them as grants. Real project writes are disabled. [Codex App Server approvals](https://learn.chatgpt.com/docs/app-server#approvals)

## Effects and verification

A grant binds the approved project device, inode, permissions, exact fixture path, baseline and postimage tree hashes, route or file, review and Brain fingerprints, component source and registry hashes, notice hash, sorted manifest, dependency locks, requested actions, operator, event, audience, nonce and expiration. The runner validates the signature and issuer context before an atomic claim. Each mutation also rechecks authorization, the live host connection, target identity, complete tree, file preimage, source freshness and run lock. A cancellation or revoked grant stops the transaction. Recovery operates from recorded preimages and accepts only known preimage or postimage bytes. Private review evidence and rollback logs are retained.

Signatures reject caller-supplied changes to the reviewed binding. A single-component, single-screen grant has a short lifetime and is consumed once. The host process starts with a fresh key, key ID and audience for each IPC session. This rotates test trust without a long-lived signer. A future production issuer requires host-managed key storage, an independently trusted key identity and rotation, and authenticated revocation and consume state across process restarts.

The fixture writer uses bounded build and browser subprocesses under the existing macOS sandbox, a reviewed offline package graph and a fixed loopback port. The runner does not execute request-supplied commands. File mode 0600 protects evidence from other accounts. Arbitrary local code executing under the same OS user, a modified MotionUX checkout, a compromised host, process inspection or control of the OS is outside the fixture threat boundary. A production writer needs independent OS isolation and assurance that the displayed manifest and exact effects are under host control.

Licenses are separate from grants. The local Animate UI example carries its MIT + Commons Clause notice. Kokonut carries its MIT notice. Only local fixture execution is covered here. Provider payloads and notices stay in the private vault.
