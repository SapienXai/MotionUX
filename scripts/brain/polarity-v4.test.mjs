import assert from "node:assert/strict";
import { test } from "node:test";
import { createBrain } from "../../src/brain/ranker.ts";
import { index } from "../../fixtures/agent/models.mjs";

const brain = createBrain(index);
const negatives = [
  "Do not add any motion to the keyboard error message.",
  "Keep the inline cancellation response static.",
  "No animation for the duplicate booking warning.",
  "Please leave the offline badge still; no transitions.",
  "Kart numarası hatasına hiçbir animasyon ekleme.",
  "Onay kutusunun uyarısı sabit kalsın.",
  "İptal hatasında animasyon kullanma.",
  "Eksik izin durumunda hareket istemiyorum.",
  "Don't animate the price confirmation.",
  "The retry error should remain static.",
  "Başarısız işlem bildiriminde animasyon olmasın.",
  "Form alanı hatası için hareket ekleme.",
];

for (const query of negatives) test("the integration recommendation respects stillness: " + query, () => {
  const result = brain.query("recommend", { schemaVersion: 1, query });
  assert.equal(result.decision, "no-motion");
});
