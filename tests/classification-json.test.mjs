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
  const jsonHelper = source("src/lib/ai/json.ts");

  assert.match(classifier, /function parseClassification/);
  assert.match(classifier, /parseJsonObject\(outputText\)/);
  assert.match(classifier, /return normalizeClassification\(parseJsonObject\(outputText\)\)/);
  assert.match(classifier, /payment_issue/);
  assert.match(classifier, /normalized === "payment"/);
  assert.doesNotMatch(classifier, /JSON\.parse\(outputText\)/);

  assert.match(jsonHelper, /trimmed\.match\(/);
  assert.match(jsonHelper, /\^\s*```/);
  assert.match(jsonHelper, /candidate\.indexOf\("\{"\)/);
  assert.match(jsonHelper, /candidate\.lastIndexOf\("\}"\)/);
  assert.match(jsonHelper, /catch\s*{/);
  assert.match(jsonHelper, /return null/);
});

test("classification API falls back per email and returns safe summary JSON", () => {
  const route = source("src/app/api/ai/classify-emails/route.ts");

  assert.match(route, /fallbackCount \+= 1/);
  assert.match(route, /category:\s*"other" as const/);
  assert.match(route, /tradeEmails/);
  assert.match(route, /otherEmails/);
  assert.match(route, /failed/);
  assert.match(route, /fallbackCount/);
  assert.match(route, /classification_confidence:\s*classification\.confidence/);
  assert.match(route, /classification_reason:\s*classification\.reason/);
  assert.match(route, /ok:\s*true/);
  assert.match(route, /message:\s*"Unable to fetch emails for classification\."/);
  assert.doesNotMatch(route, /error:\s*"classification_failed"/);
  assert.doesNotMatch(route, /\{\s*error:\s*"email_fetch_failed",\s*message:\s*emailError\.message/);
  assert.doesNotMatch(route, /\{\s*error:\s*"classification_update_failed",\s*message:\s*updateError\.message/);
});

test("classification metadata columns are present in Supabase schema", () => {
  const schema = source("supabase/schema.sql");
  const migration = source("supabase/migrations/20260612120000_add_email_classification_metadata.sql");

  assert.match(schema, /classification_confidence numeric/);
  assert.match(schema, /classification_reason text/);
  assert.match(migration, /add column if not exists classification_confidence numeric/);
  assert.match(migration, /add column if not exists classification_reason text/);
});

test("classification frontend reports trade and other counts from a safe JSON response", () => {
  const button = source("src/components/emails/classify-emails-button.tsx");

  assert.match(button, /readJsonResponse\(response\)/);
  assert.match(button, /tradeEmails/);
  assert.match(button, /otherEmails/);
  assert.match(button, /Classified \$\{classified\} emails: \$\{tradeEmails\} trade emails and \$\{otherEmails\} other emails\./);
  assert.doesNotMatch(button, /await response\.json\(\)/);
});
