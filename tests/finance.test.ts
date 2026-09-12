import test from "node:test";
import assert from "node:assert/strict";
import { rupiah, totals, dateLabel } from "../src/lib/format";
import {
  transactionSchema,
  projectSchema,
  proofExtension,
  tokenSchema,
} from "../src/lib/validation";
test("balances use exact integers, including sums beyond JavaScript safe integers", () => {
  const rows = Array.from({ length: 1000 }, () => ({
    type: "income" as const,
    amount: "99999999999999",
  }));
  assert.equal(totals(rows).balance, 99999999999999000n);
  assert.equal(rupiah(totals(rows).balance), "Rp99.999.999.999.999.000");
});
test("negative balances and empty ledgers", () => {
  assert.equal(
    totals([
      { type: "income", amount: "2000000" },
      { type: "expense", amount: "2500000" },
    ]).balance,
    -500000n,
  );
  assert.equal(rupiah(-500000n), "−Rp500.000");
  assert.equal(totals([]).balance, 0n);
});
test("transaction validation rejects decimal, zero, impossible dates, and invalid category IDs", () => {
  const valid = {
    project_id: "00000000-0000-4000-8000-000000000001",
    category_id: "00000000-0000-4000-8000-000000000002",
    type: "income",
    transaction_date: "2026-09-12",
    amount: "2000000",
    description: "Dana awal",
  };
  assert.equal(transactionSchema.safeParse(valid).success, true);
  for (const patch of [
    { amount: "0" },
    { amount: "-1" },
    { amount: "1.1" },
    { amount: "1e9" },
    { amount: "100000000000000" },
    { transaction_date: "2026-02-30" },
    { category_id: "other-project" },
    { description: " " },
  ])
    assert.equal(
      transactionSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
});
test("project dates must be ordered", () => {
  assert.equal(
    projectSchema.safeParse({
      name: "CLC",
      description: "",
      start_date: "2026-10-15",
      end_date: "2026-10-10",
      status: "active",
    }).success,
    false,
  );
  assert.match(dateLabel("2026-03-31"), /31 Mar 2026/);
});
test("proof contents must match their declared MIME type", () => {
  assert.equal(
    proofExtension(new Uint8Array([255, 216, 255]), "image/jpeg"),
    "jpg",
  );
  assert.equal(
    proofExtension(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    ),
    "png",
  );
  assert.equal(
    proofExtension(new Uint8Array([37, 80, 68, 70, 45]), "application/pdf"),
    "pdf",
  );
  assert.throws(() =>
    proofExtension(
      new TextEncoder().encode("<script>alert(1)</script>"),
      "image/png",
    ),
  );
  assert.throws(() =>
    proofExtension(new Uint8Array([255, 216, 255]), "application/pdf"),
  );
  assert.equal(tokenSchema.safeParse("a".repeat(64)).success, true);
  assert.equal(tokenSchema.safeParse("guessable").success, false);
});
