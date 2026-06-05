import { Globe2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { LoginActions } from "@/components/login-actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
            <span className="grid size-9 place-items-center rounded-lg bg-teal-700 text-white shadow-sm">
              <Globe2 size={18} aria-hidden="true" />
            </span>
            Import Export AI Assistant
          </div>

          <div className="max-w-2xl py-16">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Email automation MVP
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Turn trade emails into clean reply drafts.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Review buyer inquiries, supplier quotes, missing details, risks, and AI-prepared replies from one focused workspace.
            </p>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Read emails", icon: Mail },
                { label: "Check risks", icon: ShieldCheck },
                { label: "Approve drafts", icon: LockKeyhole },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <item.icon className="mb-4 text-teal-700" size={22} aria-hidden="true" />
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-400">Secure trade operations workspace powered by Supabase and Google OAuth.</p>
        </div>

        <div className="flex items-center border-t border-slate-200 bg-white px-6 py-8 sm:px-10 lg:border-l lg:border-t-0">
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
              <p className="mt-2 text-sm text-slate-500">Continue to your trade operations workspace.</p>
            </div>

            <LoginActions />

            <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Google OAuth is secured through Supabase Auth. Gmail permissions are managed after login.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
