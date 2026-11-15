import ts from "typescript";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { semanticKeys, supportKeys } from "../../src/brain/contracts.ts";
import { compareIds } from "../../src/brain/indexer.ts";

export const unknown = () => ({ value: null, status: "unknown", confidence: "none", evidence: [] });
export const claim = (value, status, ...evidence) => ({
  value, status, confidence: status === "verified" || status === "unsupported" ? "high" : "medium", evidence,
});
const hasCheck = (row, name) => row?.checks?.includes(name);
const comparisonActions = {
  "kokonut-wheel-picker": ["keyboard", "ArrowUp changed the Hours spinbutton value across three comparison lanes."],
  "smoothui-scrubber": ["keyboard", "ArrowRight changed the Opacity slider value across three comparison lanes."],
  "kokonut-smooth-tab": ["pointer", "Clicking Activity updated tab selection across three comparison lanes."],
  "designbookmark-goo-menu": ["pointer", "Clicking the menu exposed its expanded state across three comparison lanes."],
  "designbookmark-morph-island": ["pointer", "Clicking Call changed the pressed control across three comparison lanes."],
  "designbookmark-swipe-deck": ["pointer", "A horizontal pointer drag changed the card transform across three comparison lanes."],
  "designbookmark-glass-lens": ["pointer", "Pointer movement changed the lens transform across three comparison lanes."],
  "motionprimitives-morphing-dialog": ["pointer", "Clicking the trigger exposed the dialog and its content across three comparison lanes."],
  "reactbits-glare-hover": ["pointer", "Pointer hover changed the rendered glare opacity across three comparison lanes."],
  "magicui-ripple-button": ["pointer", "Clicking the button produced a ripple element across three comparison lanes."],
};

export function evidenceFor(item, reports) {
  const gallery = reports.gallery.get(item.id);
  const comparison = reports.comparisons.get(item.id);
  const entry = reports.editions.get(item.id);
  const registryHash = reports.registryHashes.get(item.id);
  const probes = (reports.probes.get(item.id) ?? []).filter(row => row.sourceHash === item.upstreamHash &&
    row.registryHash === registryHash);
  return {
    gallery: gallery?.sourceHash === item.upstreamHash && gallery.registryHash === registryHash && gallery.visible === true && !gallery.error
      ? { width: gallery.viewport.width, height: gallery.viewport.height, controls: gallery.controls } : null,
    comparison: comparison?.sourceHash === item.upstreamHash && comparison.registryHash === registryHash && comparison.interactionSampled && comparison.statesMatch &&
      comparison.lanes?.length === 3 && !comparison.error ? true : null,
    edition: entry?.row.sourceHash === item.upstreamHash && entry.row.buildFingerprint && entry.row.buildFingerprint === item.buildFingerprint &&
      entry.row.errors?.length === 0 && hasCheck(entry.row, "pinned source and recipe") ? {
        path: entry.path,
        sampled: hasCheck(entry.row, "three rendered lanes") && entry.row.lanes?.length === 3 && entry.row.lanes.every(lane => Boolean(lane.mode)),
        overflowPx: hasCheck(entry.row, "390px dark/reduced") && Number.isInteger(entry.row.mobileInnerOverflow) ? entry.row.mobileInnerOverflow : null,
        explicit: entry.row.lanes?.length === 3 && entry.row.lanes.every(lane => lane.mode === "keyboard lamp switch" ||
          lane.mode === "keyboard dial and animated settlement") ? "keyboard" :
          entry.row.lanes?.length === 3 && entry.row.lanes.every(lane => lane.mode === "pointer drag and letter rotation") ? "pointer" : null,
      } : null,
    probes: probes.map(({ capability, profile, notes, locator }) => ({ capability, profile, notes, locator })).sort((a, b) => compareIds(a.capability, b.capability)),
  };
}

function astFacts(relative, code) {
  if (!/\.[cm]?[jt]sx?$/.test(relative)) return {};
  const ast = ts.createSourceFile(relative, code, ts.ScriptTarget.Latest, true,
    /\.[jt]sx$/.test(relative) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const facts = {};
  const assign = (name, node) => { facts[name] ??= ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1; };
  const exported = new Set(ast.statements.flatMap(node => {
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) return [node.expression.text];
    if (ts.isExportDeclaration(node) && !node.moduleSpecifier && node.exportClause && ts.isNamedExports(node.exportClause)) {
      return node.exportClause.elements.map(element => (element.propertyName ?? element.name).text);
    }
    return [];
  }));
  const isExported = (node, name) => exported.has(name) ||
    node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword);
  const typedProps = node => node?.parameters?.[0]?.type && /(?:Props|Properties|Attributes)\b/.test(node.parameters[0].type.getText(ast));
  for (const statement of ast.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement, statement.name?.text) && typedProps(statement)) assign("nativeProps", statement);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (isExported(statement, declaration.name.getText(ast)) && typedProps(declaration.initializer)) assign("nativeProps", declaration);
      }
    }
  }
  const visit = node => {
    if (ts.isCallExpression(node)) {
      const target = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : node.expression.getText(ast);
      if (target === "useSpring") assign("spring", node);
      if (target === "getContext" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const type = node.arguments[0].text;
        if (type === "2d") assign("canvas-2d", node);
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") assign("webgl", node);
      }
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(ast).replace(/["']/g, "") === "type" &&
        ts.isStringLiteral(node.initializer) && node.initializer.text === "spring") assign("spring", node);
    if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === "use client" &&
      node.parent === ast && ast.statements.indexOf(node) < 3) assign("clientBoundary", node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return facts;
}

export async function createProfile(revision) {
  const { metadata, path, annotations, tests, source, fingerprint } = revision;
  const { id, title, provider, editionOrdinal, addedSequence, category, dependencies } = metadata;
  const code = await readFile(path, "utf8");
  const evidence = (kind, locator, notes, testedProfile) => ({ kind, locator, sourcePinOrHash: source.upstreamHash,
    ...(testedProfile && { testedProfile }), ...(notes && { notes }) });
  const ast = astFacts(source.entry, code);
  const astRef = (field, notes) => evidence("source-ast", source.sourceURL + "#L" + ast[field], notes);
  const catalogRef = evidence("catalog", "catalog/" + id, "Prepared ready entry and verified artifact identity.");
  const lines = code.split(/\r?\n/);
  const curated = Boolean(annotations && annotations.sourceHash === source.upstreamHash && annotations.entry === source.entry &&
    annotations.sourceURL === source.sourceURL && annotations.anchors.every(anchor => lines[anchor.line - 1]?.includes(anchor.symbol)));
  const review = curated ? evidence("source-review", source.sourceURL + "#L" + annotations.anchors[0].line,
    "Source review r" + annotations.revision + " · " + annotations.anchors.map(anchor => anchor.symbol).join(", ")) : null;
  const semantic = Object.fromEntries(semanticKeys.map(key => [key,
    review && annotations[key]?.length ? claim(annotations[key], "curated", review) : unknown()]));
  if (ast.spring && semantic.motions.status === "unknown") {
    semantic.motions = claim(["spring"], "observed", astRef("spring", "A spring call or configuration is present in the pinned entry."));
  }
  for (const field of ["avoidWhen", "notes", "intensity", "interruption", "restart"]) semantic[field] = unknown();
  if (review) {
    semantic.notes = claim(annotations.note, "curated", review);
    semantic.avoidWhen = claim(annotations.avoidWhen, "curated", review);
  }
  const support = Object.fromEntries(supportKeys.map(key => [key, unknown()]));
  const desktop = "Chromium · desktop 1536×1024";
  const v10 = "evidence/v10/report.json";
  const behavior = { rendered: unknown(), sampledMotion: unknown(), install: unknown(), nativeProps: unknown(),
    clientBoundary: unknown(), previewAt390: unknown() };
  if (tests.gallery) behavior.rendered = claim(true, "verified",
    evidence("browser-test", v10 + "#gallery/" + id, "Prepared Gallery specimen had visible rendered content.",
      "Chromium · " + tests.gallery.width + "×" + tests.gallery.height));
  if (tests.comparison && comparisonActions[id]) {
    const [input, note] = comparisonActions[id];
    const compareRef = evidence("browser-test", v10 + "#comparisons/" + id, note, desktop);
    support[input] = claim(true, "verified", compareRef);
    behavior.sampledMotion = claim(true, "verified", compareRef);
  }
  if (tests.edition) {
    const ref = evidence("browser-test", tests.edition.path + "#rows/" + id,
      "Pinned three-lane comparison recorded rendered motion samples. Samples cover the exercised demo only.", desktop);
    if (tests.edition.sampled) behavior.sampledMotion = claim(true, "verified", ref);
    if (tests.edition.explicit === "keyboard") support.keyboard = claim(true, "verified",
      { ...ref, notes: "Keyboard input changed the dial or lamp switch across three lanes." });
    if (tests.edition.explicit === "pointer") support.pointer = claim(true, "verified",
      { ...ref, notes: "A pointer drag rotated an original cradle letter across three lanes." });
    if (tests.edition.overflowPx !== null) behavior.previewAt390 = claim({ overflowPx: tests.edition.overflowPx, motionPreference: "reduce" },
      "verified", evidence("browser-test", tests.edition.path + "#rows/" + id,
        "Rendering and horizontal overflow recorded. This does not test reduced-motion behavior or physical touch.",
        "Chromium emulation · 390×844 · dark · prefers-reduced-motion: reduce"));
    behavior.install = claim(true, "verified", evidence("install-artifact", source.registryPath, "Pinned consumer recipe and file bytes were checked."));
  }
  for (const probe of tests.probes) {
    support[probe.capability] = claim(true, "verified",
      evidence("browser-test", probe.locator, probe.notes, probe.profile));
  }
  if (metadata.acceptance?.consumerBuilt && behavior.install.status === "unknown") {
    behavior.install = claim(true, "verified", evidence("install-artifact", source.registryPath, "Recorded successful consumer build and matching installation bytes."));
  }
  if (metadata.sourceKind === "html") behavior.nativeProps = claim(false, "unsupported", catalogRef);
  else if (ast.nativeProps) behavior.nativeProps = claim(true, "observed", astRef("nativeProps", "A typed props parameter is present. Verify the specific props before integration."));
  if (ast.clientBoundary) behavior.clientBoundary = claim(true, "observed", astRef("clientBoundary", "The pinned entry declares a client boundary."));
  const graphics = ["webgl", "canvas-2d"].find(name => ast[name]);
  const units = metadata.renderCost === "heavy" ? 3 : metadata.sourceKind === "html" ? 2 : 1;
  return {
    schemaVersion: 1, indexVersion: 1, taxonomyVersion: 1, id, title, provider, editionOrdinal, addedSequence, category,
    availability: "ready", integrationKind: metadata.sourceKind === "html" ? "html-iframe" : "react", source, dependencies, fingerprint,
    curated, identity: catalogRef, semantic, support, behavior, visualAcceptance: "pending",
    performance: {
      measuredCost: unknown(),
      schedulerUnits: claim(units, "observed", evidence("catalog", "studio/sources/gallery.tsx", "Studio scheduling units are not a CPU or GPU benchmark.")),
      graphics: graphics ? claim(graphics, "observed", astRef(graphics, "The pinned source requests this graphics context.")) : unknown(),
    },
  };
}

export function evidencePath(vault) { return resolve(vault, "evidence"); }
