import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const viewports = [
  { width: 390, height: 844, touch: true },
  { width: 768, height: 1024, touch: true },
  { width: 1440, height: 900, touch: false },
];
const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const dedupe = (items) => [...new Set(items)];
const axeTargets = (nodes) =>
  dedupe(nodes.map((node) => node.target.join(" ")))
    .slice(0, 8)
    .join(", ")
    .slice(0, 800);

function measureLayout() {
  const root = document.documentElement;
  const width = root.clientWidth;
  const documentWidth = Math.max(root.scrollWidth, document.body.scrollWidth);
  const findings = [];
  const identify = (element) =>
    element.id
      ? "#" + CSS.escape(element.id)
      : [element.localName, ...Array.from(element.classList).slice(0, 2)].join(
          ".",
        );

  if (documentWidth > width + 1) {
    const elements = [...document.body.querySelectorAll("main, main *")].filter(
      (element) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || rect.right <= width + 1) return false;
        for (
          let parent = element.parentElement;
          parent && parent !== document.body;
          parent = parent.parentElement
        ) {
          if (
            getComputedStyle(parent).overflowX !== "visible" &&
            parent.getBoundingClientRect().right <= width + 1
          )
            return false;
        }
        return true;
      },
    );
    findings.push({
      category: "layout",
      rule: "page-overflow",
      summary: "The page scrolls horizontally.",
      evidence:
        `${documentWidth}px of content in a ${width}px viewport. ${[...new Set(elements.slice(0, 6).map(identify))].join(", ")}`.trim(),
    });
  }

  const clipped = [];
  for (const element of document.querySelectorAll(
    "main :is(button, a[href], input, select, textarea)",
  )) {
    const rect = element.getBoundingClientRect();
    if (
      !rect.width ||
      !rect.height ||
      getComputedStyle(element).visibility !== "visible"
    )
      continue;
    for (
      let parent = element.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    ) {
      if (!["hidden", "clip"].includes(getComputedStyle(parent).overflowX))
        continue;
      const bounds = parent.getBoundingClientRect();
      if (rect.left < bounds.left - 2 || rect.right > bounds.right + 2) {
        clipped.push(identify(element) + " inside " + identify(parent));
        break;
      }
    }
  }
  if (clipped.length)
    findings.push({
      category: "layout",
      rule: "clipped-control",
      summary: "A control extends beyond a horizontally clipped container.",
      evidence: [...new Set(clipped)].slice(0, 6).join(", "),
    });
  return findings;
}

async function checkCommand(page, touch) {
  const trigger = page.getByRole("button", { name: /^Find a page/ }).first();
  const dialog = page.getByRole("dialog", { name: "Go to a page" });
  const search = dialog.getByRole("searchbox");
  const focused = (element) =>
    element.evaluate((node) => node === document.activeElement);
  let step = "Reach Find a page using Tab.";
  try {
    await trigger.waitFor({ timeout: 2500 });
    for (
      let attempts = 0;
      attempts < 32 && !(await focused(trigger));
      attempts++
    )
      await page.keyboard.press("Tab");
    if (!(await focused(trigger))) throw new Error();

    step = "Open Find a page with Enter and move focus into the search field.";
    await page.keyboard.press("Enter");
    await search.waitFor();
    if (!(await focused(search))) throw new Error();

    step = "Keep Tab focus inside the open search dialog.";
    await page.keyboard.press("Tab");
    if (
      !(await dialog.evaluate((node) => node.contains(document.activeElement)))
    )
      throw new Error();

    step = "Filter the page list when the query has no match.";
    await search.fill("motionux-inspector-unmatched-7b91");
    await dialog
      .getByRole("status")
      .filter({ hasText: "No pages match" })
      .waitFor();

    step = "Close Find a page with Escape and return focus to its trigger.";
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    if (!(await focused(trigger))) throw new Error();

    step = touch
      ? "Open Find a page with a touch tap."
      : "Open Find a page with a pointer click.";
    if (touch) await trigger.tap();
    else await trigger.click();
    await dialog.waitFor();
  } catch {
    return [
      {
        category: "interaction",
        rule: "page-search",
        summary: "The page search interaction failed.",
        evidence: step,
      },
    ];
  }
  return [];
}

export async function inspectRuntime({
  origin,
  route,
  revision,
  identity,
  signal,
}) {
  signal?.throwIfAborted();
  const parsed = new URL(origin);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.origin !== origin
  )
    throw new Error("Expected a loopback origin.");
  if (!/^(?:\/|\/[a-z][a-z0-9-]{0,39})$/.test(route))
    throw new Error("Invalid preview route.");

  const started = performance.now();
  const browser = await chromium.launch({ timeout: 10_000 });
  const cancel = () => {
    void browser.close().catch(() => {});
  };
  signal?.addEventListener("abort", cancel, { once: true });
  const report = { route, revision, durationMs: 0, viewports: [] };
  try {
    for (const { width, height, touch } of viewports) {
      signal?.throwIfAborted();
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: touch,
        hasTouch: touch,
        reducedMotion: "reduce",
        serviceWorkers: "block",
        acceptDownloads: false,
      });
      try {
        await context.route("**/*", async (intercept) => {
          const request = intercept.request();
          const url = new URL(request.url());
          if (
            url.origin !== origin ||
            !["GET", "HEAD"].includes(request.method()) ||
            (request.isNavigationRequest() && url.pathname !== route)
          )
            return intercept.abort();
          // Fulfill redirects locally so no follow-up request can leave the loopback origin.
          const response = await intercept.fetch({
            maxRedirects: 0,
            timeout: 6000,
          });
          if ([301, 302, 303, 307, 308].includes(response.status()))
            return intercept.abort();
          return intercept.fulfill({ response });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(1800);
        let errors = 0;
        page.on("pageerror", () => errors++);
        const response = await page.goto(origin + route, {
          waitUntil: "networkidle",
          timeout: 10_000,
        });
        if (
          !response?.ok() ||
          (identity &&
            (response.headers()["x-motionux-preview"] !== identity.token ||
              response.headers()["x-motionux-document"] !== identity.digest))
        )
          throw new Error("Preview identity could not be verified.");
        const findings = await page.evaluate(measureLayout);
        const axe = await new AxeBuilder({ page }).withTags(wcag).analyze();
        for (const violation of axe.violations) {
          findings.push({
            category: "accessibility",
            rule: violation.id,
            summary: violation.help,
            evidence: axeTargets(violation.nodes),
            impact: violation.impact,
          });
        }
        findings.push(...(await checkCommand(page, touch)));
        if (errors)
          findings.push({
            category: "interaction",
            rule: "page-error",
            summary: "The browser reported uncaught application errors.",
            evidence: `${errors} error events during load or interaction.`,
          });
        report.viewports.push({
          width,
          height,
          touch,
          findings,
          manualReview: axe.incomplete.map(({ id, nodes }) => ({
            rule: id,
            evidence: axeTargets(nodes),
          })),
        });
      } finally {
        await context.close();
      }
    }
    report.durationMs = Math.round(performance.now() - started);
    return report;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await browser.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cancellation = new AbortController();
  process.once("SIGTERM", () =>
    cancellation.abort(new Error("Inspection stopped.")),
  );
  const options = JSON.parse(process.env.MOTIONUX_INSPECTION);
  if (options.origin !== "http://127.0.0.1:5202" || !options.identity)
    throw new Error("Expected the active managed preview.");
  const report = await inspectRuntime({
    ...options,
    signal: AbortSignal.any([cancellation.signal, AbortSignal.timeout(42_000)]),
  });
  process.stdout.write(JSON.stringify(report));
}
