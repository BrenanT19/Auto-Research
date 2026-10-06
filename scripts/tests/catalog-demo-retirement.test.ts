import assert from "node:assert/strict";
import test from "node:test";
import {
  getEligibleReplacement,
  getRetiredDemoSlugs,
  type EligibleCatalogIdentity,
} from "../../artifacts/api-server/src/lib/catalog-demo-retirement";

const silverado: EligibleCatalogIdentity = {
  id: "chevrolet-silverado-1500-2024-lt-us-trim-identity",
  makeSlug: "chevrolet", model: "Silverado 1500", year: 2024, trim: "LT", isDemo: false,
};
const enclave = ["Essence", "Premium", "Avenir"].map((trim) => ({
  id: `buick-enclave-2024-${trim.toLowerCase()}-us-trim-identity`,
  makeSlug: "buick", model: "Enclave", year: 2024, trim, isDemo: false,
}));

test("an unavailable or ineligible canonical replacement leaves the legacy demo visible", () => {
  assert.equal(getRetiredDemoSlugs([]).size, 0);
  for (const invalid of [
    { ...silverado, isDemo: true }, { ...silverado, year: 2023 },
    { ...silverado, trim: "LTZ" }, { ...silverado, model: "Silverado 2500HD" },
    { ...silverado, makeSlug: "gmc" }, { ...silverado, id: "different-configuration" },
  ]) assert.equal(getRetiredDemoSlugs([invalid]).size, 0);
});

test("an exact accepted year/model/trim replacement retires only its own demo", () => {
  assert.deepEqual([...getRetiredDemoSlugs([silverado])], ["chevrolet-silverado-1500-2024-lt"]);
  assert.equal(getEligibleReplacement("chevrolet-silverado-1500-2024-lt", [silverado]), silverado.id);
  assert.equal(getEligibleReplacement("gmc-sierra-1500-2024-elevation", [silverado]), undefined);
});

test("invalid Enclave Preferred is never redirected to a different real trim", () => {
  assert.equal(getEligibleReplacement("buick-enclave-2024-preferred", enclave), undefined);
  assert.equal(getRetiredDemoSlugs(enclave.slice(0, 2)).size, 0);
  assert.deepEqual([...getRetiredDemoSlugs(enclave)], ["buick-enclave-2024-preferred"]);
  assert.equal(getRetiredDemoSlugs(enclave.map((row) => ({ ...row, year: 2023 }))).size, 0);
});
