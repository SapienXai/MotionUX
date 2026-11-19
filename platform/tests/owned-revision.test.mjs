import assert from "node:assert/strict";
import { test } from "node:test";
import { manualDocument } from "../packages/build-core/model.ts";
import { applyOwnedRevision, ownedRevisionContext } from "../packages/build-core/source/owned-revision.ts";

const textEdit = { page: "p-overview", block: "b-blank-title", field: "title", value: "Workshop notes" };
const proposal = (...changes) => ({ changes, explanation: "" });

test("owned revision changes existing editable text and retains exact project structure", () => {
  const original = manualDocument("blank-app");
  const { document, routes } = applyOwnedRevision(original, proposal(textEdit));
  assert.deepEqual(routes, ["/"]);
  assert.equal(document.pages[0].blocks[0].props.title, textEdit.value);
  assert.notEqual(original.pages[0].blocks[0].props.title, textEdit.value);
  document.pages[0].blocks[0].props.title = original.pages[0].blocks[0].props.title;
  assert.deepEqual(document, original);
  assert.equal(ownedRevisionContext(original)[0].blocks[0].id, textEdit.block);
});

test("owned revision rejects unavailable fields, duplicate edits, structural requests and out-of-scope IDs", () => {
  const document = manualDocument("blank-app");
  for (const changes of [
    [],
    [{ ...textEdit, block: "b-unknown" }],
    [{ ...textEdit, field: "cta" }],
    [{ ...textEdit, field: "dataBinding" }],
    [{ ...textEdit, value: "x".repeat(73) }],
    [textEdit, textEdit],
    [{ page: "p-overview", block: null, field: "title", value: "Notes", route: "/unauthorized" }],
  ]) assert.throws(() => applyOwnedRevision(document, proposal(...changes)), { status: 422 });
});
