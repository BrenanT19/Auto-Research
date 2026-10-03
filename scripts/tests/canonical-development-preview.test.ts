import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEVELOPMENT_PREVIEW_MANIFEST,
  getDevelopmentPreviewManifest,
} from "../../artifacts/api-server/src/lib/canonical-development-preview";

test("only the reviewed first vehicle is allowed in the development preview", () => {
  assert.deepEqual(getDevelopmentPreviewManifest({ NODE_ENV: "development" }), [
    { configurationId: 2, identityClaimId: 7 },
  ]);
  assert.equal(DEVELOPMENT_PREVIEW_MANIFEST.length, 1);
});

test("preview entries fail closed outside development and in all published environments", () => {
  for (const NODE_ENV of [undefined, "", "test", "production"]) {
    assert.deepEqual(getDevelopmentPreviewManifest({ NODE_ENV }), []);
  }
  for (const REPLIT_DEPLOYMENT of ["1", "true", "0"]) {
    assert.deepEqual(getDevelopmentPreviewManifest({ NODE_ENV: "development", REPLIT_DEPLOYMENT }), []);
  }
});