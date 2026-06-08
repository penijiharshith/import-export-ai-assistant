import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("classifier handles malformed model JSON with a safe fallback", () => {
  const classifier = source("src/lib/ai/classify-email.ts");

  assert.match(classifier, /function parseClassification/);
  assert.match(classifier, /try\s*{/);
  assert.match(classifier, /JSON\.parse\(outputText\)/);
  assert.match(classifier, /catch\s*{/);
  assert.match(classifier, /return normalizeClassification\(null\)/);
});

test("classification API returns generic JSON errors instead of leaking backend details", () => {
  const route = source("src/app/api/ai/classify-emails/route.ts");

  assert.match(route, /error:\s*"classification_failed"/);
  assert.match(route, /message:\s*"Unable to classify emails\."/);
  assert.match(route, /message:\s*"Unable to save email classification\."/);
  assert.match(route, /message:\s*"Unable to fetch emails for classification\."/);
  assert.doesNotMatch(route, /message:\s*emailError\.message/);
  assert.doesNotMatch(route, /message:\s*updateError\.message/);
});
