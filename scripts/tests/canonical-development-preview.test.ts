import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEVELOPMENT_PREVIEW_MANIFEST,
  getDevelopmentPreviewManifest,
} from "../../artifacts/api-server/src/lib/canonical-development-preview";
import { validateCanonicalManifest } from "../../artifacts/api-server/src/lib/canonical-policy";

test("development allows the reviewed pilot plus the explicit 30-identity U.S. batch", () => {
  assert.deepEqual(getDevelopmentPreviewManifest({ NODE_ENV: "development" }), DEVELOPMENT_PREVIEW_MANIFEST);
  assert.deepEqual(DEVELOPMENT_PREVIEW_MANIFEST[0], { configurationId: 2, identityClaimId: 7 });
  assert.equal(DEVELOPMENT_PREVIEW_MANIFEST.length, 31);
  validateCanonicalManifest(DEVELOPMENT_PREVIEW_MANIFEST);
});

test("preview entries fail closed outside development and in all published environments", () => {
  for (const NODE_ENV of [undefined, "", "test", "production"]) {
    assert.deepEqual(getDevelopmentPreviewManifest({ NODE_ENV }), []);
  }
  for (const REPLIT_DEPLOYMENT of ["1", "true", "0"]) {
    assert.deepEqual(getDevelopmentPreviewManifest({ NODE_ENV: "development", REPLIT_DEPLOYMENT }), []);
  }
});