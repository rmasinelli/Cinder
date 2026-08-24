import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("an invalid persisted session is cleared during startup", () => {
  assert.match(app,/error: sessionError/);
  assert.match(app,/if \(sessionError\)[\s\S]*signOut\(\{scope:"local"\}\)/);
});

test("public auth RPCs cannot inherit a stale bearer token", () => {
  assert.match(app,/async function preparePublicAuthRequest\(\)/);
  assert.match(app,/await supabase\.auth\.signOut\(\{scope:"local"\}\)/);
  for (const handler of ["handleSignIn","handleJoin","handleReset"]) {
    assert.match(app,new RegExp(`async function ${handler}\\(\\)[\\s\\S]*?await preparePublicAuthRequest\\(\\)`));
  }
});
