import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const migrationPath = path.join(root, "supabase/migrations/20260607181326_add_core_rls_policies.sql");
const migration = fs.readFileSync(migrationPath, "utf8");

const userDataTables = [
  "users_profile",
  "email_messages",
  "extracted_trade_details",
  "ai_drafts",
  "ai_action_suggestions",
  "follow_ups",
  "supplier_quotes",
];

function routeSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walkSource(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".next", ".git"].includes(entry.name)) return [];
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSource(fullPath);
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

test("migration enables RLS for every user-data table", () => {
  for (const table of userDataTables) {
    assert.match(
      migration,
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      `${table} must enable RLS`,
    );
  }
});

test("migration revokes anonymous CRUD on every user-data table", () => {
  for (const table of userDataTables) {
    assert.match(
      migration,
      new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon`, "i"),
      `${table} must revoke anonymous access`,
    );
  }
});

test("migration has explicit ownership policies for every user-data table", () => {
  const ownershipMarkers = {
    users_profile: ["users_profile_select_own", "id = auth.uid()"],
    email_messages: ["email_messages_select_own", "user_id = auth.uid()"],
    extracted_trade_details: ["extracted_trade_details_select_own_email", "where email_messages.id = extracted_trade_details.email_id"],
    ai_drafts: ["ai_drafts_select_own_email", "where email_messages.id = ai_drafts.email_id"],
    ai_action_suggestions: ["ai_action_suggestions_select_own", "where email_messages.id = ai_action_suggestions.email_id"],
    follow_ups: ["follow_ups_select_own", "where email_messages.id = follow_ups.email_id"],
    supplier_quotes: ["supplier_quotes_select_own", "where email_messages.id = supplier_quotes.email_id"],
  };

  for (const [table, markers] of Object.entries(ownershipMarkers)) {
    for (const marker of markers) {
      assert.ok(migration.includes(marker), `${table} missing ownership marker: ${marker}`);
    }
  }
});

test("child-table policies reference owned parent email rows", () => {
  for (const table of ["extracted_trade_details", "ai_drafts", "ai_action_suggestions", "follow_ups", "supplier_quotes"]) {
    assert.ok(
      migration.includes(`email_messages.id = ${table}.email_id`)
      && migration.includes("email_messages.user_id = auth.uid()"),
      `${table} policy must reference parent email owner`,
    );
  }
});

test("browser and source code do not use Supabase service-role key", () => {
  const sourceFiles = walkSource(path.join(root, "src"));
  const offenders = sourceFiles.filter((filePath) => {
    const text = fs.readFileSync(filePath, "utf8");
    return text.includes("SUPABASE_SERVICE_ROLE_KEY");
  });

  assert.deepEqual(offenders, []);
});

test("draft mutation routes constrain final updates by verified draft id and email id", () => {
  const routes = [
    "src/app/api/drafts/[id]/route.ts",
    "src/app/api/drafts/[id]/approve/route.ts",
    "src/app/api/drafts/[id]/needs-revision/route.ts",
    "src/app/api/drafts/[id]/send/route.ts",
  ];

  for (const route of routes) {
    const source = routeSource(route);
    assert.ok(source.includes(".eq(\"email_messages.user_id\", user.id)"), `${route} must pre-check ownership`);
    assert.ok(source.includes(".eq(\"id\", draft.id)"), `${route} must update verified draft id`);
    assert.ok(source.includes(".eq(\"email_id\", draft.email_id)"), `${route} must update verified email id`);
  }
});

test("draft mutation routes do not return raw backend error messages", () => {
  const routes = [
    "src/app/api/drafts/[id]/route.ts",
    "src/app/api/drafts/[id]/approve/route.ts",
    "src/app/api/drafts/[id]/needs-revision/route.ts",
    "src/app/api/drafts/[id]/send/route.ts",
  ];

  for (const route of routes) {
    const source = routeSource(route);
    assert.equal(/message:\s*[a-zA-Z]+Error\.message/.test(source), false, `${route} must not expose raw error.message`);
    assert.equal(/const message = error instanceof Error/.test(source), false, `${route} must not pass raw caught error to client`);
  }
});
