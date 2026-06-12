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
  assert.match(classifier, /typeof candidate\.category !== "string"/);
  assert.match(classifier, /throw new AiProviderError\("AI provider returned invalid classification JSON\."\)/);
  assert.match(classifier, /snippet: normalizeEmailSnippet\(body\)/);
  assert.doesNotMatch(classifier, /JSON\.parse\(outputText\)/);

  assert.match(jsonHelper, /trimmed\.match\(/);
  assert.match(jsonHelper, /\^\s*```/);
  assert.match(jsonHelper, /candidate\.indexOf\("\{"\)/);
  assert.match(jsonHelper, /candidate\.lastIndexOf\("\}"\)/);
  assert.match(jsonHelper, /catch\s*{/);
  assert.match(jsonHelper, /return null/);
});

test("classification API preserves provider failures and returns safe summary JSON", () => {
  const route = source("src/app/api/ai/classify-emails/route.ts");

  assert.match(route, /\.or\("category\.is\.null,category\.eq\.unclassified,classification_status\.eq\.retry"\)/);
  assert.match(route, /isAiRateLimitError\(classificationError\)/);
  assert.match(route, /partial:\s*true/);
  assert.match(route, /rateLimited:\s*true/);
  assert.match(route, /retryAfterSeconds/);
  assert.match(route, /classification_status:\s*"retry"/);
  assert.match(route, /classification_status:\s*"classified"/);
  assert.match(route, /tradeEmails/);
  assert.match(route, /otherEmails/);
  assert.match(route, /failed/);
  assert.match(route, /classification_confidence:\s*classification\.confidence/);
  assert.match(route, /classification_reason:\s*classification\.reason/);
  assert.match(route, /ok:\s*true/);
  assert.match(route, /message:\s*"Unable to fetch emails for classification\."/);
  assert.doesNotMatch(route, /error:\s*"classification_failed"/);
  assert.doesNotMatch(route, /category:\s*"other" as const/);
  assert.doesNotMatch(route, /\{\s*error:\s*"email_fetch_failed",\s*message:\s*emailError\.message/);
  assert.doesNotMatch(route, /\{\s*error:\s*"classification_update_failed",\s*message:\s*updateError\.message/);
});

test("classification metadata columns are present in Supabase schema", () => {
  const schema = source("supabase/schema.sql");
  const migration = source("supabase/migrations/20260612120000_add_email_classification_metadata.sql");
  const retryMigration = source("supabase/migrations/20260612133000_add_classification_retry_status.sql");

  assert.match(schema, /classification_confidence numeric/);
  assert.match(schema, /classification_reason text/);
  assert.match(schema, /classification_status text/);
  assert.match(schema, /classification_status in \('classified', 'retry', 'unclassified'\)/);
  assert.match(migration, /add column if not exists classification_confidence numeric/);
  assert.match(migration, /add column if not exists classification_reason text/);
  assert.doesNotMatch(migration, /classification_status/);
  assert.match(retryMigration, /add column if not exists classification_status text/);
  assert.match(retryMigration, /email_messages_classification_status_check/);
  assert.match(retryMigration, /classification_status in \('classified', 'retry', 'unclassified'\)/);
  assert.match(retryMigration, /classification_reason = 'Unable to classify confidently\.'/);
  assert.match(retryMigration, /classification_confidence = 0/);
});

test("classification frontend reports trade and other counts from a safe JSON response", () => {
  const button = source("src/components/emails/classify-emails-button.tsx");

  assert.match(button, /readJsonResponse\(response\)/);
  assert.match(button, /tradeEmails/);
  assert.match(button, /otherEmails/);
  assert.match(button, /data\?\.partial && data\.message/);
  assert.match(button, /Classified \$\{classified\} emails: \$\{tradeEmails\} trade emails and \$\{otherEmails\} other emails\./);
  assert.doesNotMatch(button, /await response\.json\(\)/);
});
