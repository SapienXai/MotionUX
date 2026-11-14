# MotionUX

Shared React UI and motion primitives for SapienX products. The GitHub repository is the shadcn registry. Installed files live in the consumer: no registry server, runtime requests, or shared brand theme.

```sh
npx shadcn@latest view SapienXai/MotionUX/motion-dock#v1.0.0
npx shadcn@latest add SapienXai/MotionUX/motion-dock#v1.0.0 --dry-run
npx shadcn@latest add SapienXai/MotionUX/motion-dock#v1.0.0
```

Use your project’s package runner (e.g. `pnpm dlx`). The target is `@components/sapienx-motion/` using the project’s **components.json** `aliases.components` setting. For a project without that file, declare its existing aliases and CSS entry first; avoid changing its theme or replacing UI files. Each item is usable individually; the status pill installs the explicitly pinned foundations. Keep the existing application’s theme and styling in its own adapters.

- [Component catalog](docs/COMPONENTS.md) and [source review](docs/SOURCE-REVIEW.md)
- [Verification and pilot evidence](docs/VERIFICATION.md)
- [User-scoped skill source](skills/sapienx-motion-system/SKILL.md) and [global AGENTS block](skills/global-agents-section.md)

To run the local stories: `npm ci`, then `npm run dev`. To verify: `npx playwright install chromium webkit`, then `npm run verify`. You can also run the production demo with `npm run build` followed by `npx vite preview --host 127.0.0.1`. Release tags stay immutable; for a new tag pin any changed dependent items explicitly, run the checks and a tagged GitHub install, and record the version in each consumer.
