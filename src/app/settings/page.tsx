import { AppShell } from "@/components/app-shell";
import { AccountSettings } from "@/components/account-settings";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Account</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage authentication, inbox connection, and trade workspace preferences.</p>
      </div>

      <AccountSettings />
    </AppShell>
  );
}
