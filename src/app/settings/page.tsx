import { AppShell } from "@/components/app-shell";
import { AccountSettings } from "@/components/account-settings";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Account</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">Settings</h1>
        <p className="mt-2 text-sm text-zinc-500">Manage auth status and future inbox connection settings.</p>
      </div>

      <AccountSettings />
    </AppShell>
  );
}
