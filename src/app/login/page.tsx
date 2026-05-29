import { Globe2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { LoginActions } from "@/components/login-actions";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f8faf7]">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
          <div className="flex items-center gap-3 text-sm font-semibold text-zinc-900">
            <span className="grid size-9 place-items-center rounded-md bg-teal-700 text-white">
              <Globe2 size={18} aria-hidden="true" />
            </span>
            Import Export AI Assistant
          </div>

          <div className="max-w-2xl py-16">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Email automation MVP
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
              Turn trade emails into clean reply drafts.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
              Review buyer inquiries, supplier quotes, missing details, risks, and AI-prepared replies from one focused workspace.
            </p>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Read emails", icon: Mail },
                { label: "Check risks", icon: ShieldCheck },
                { label: "Approve drafts", icon: LockKeyhole },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <item.icon className="mb-4 text-teal-700" size={22} aria-hidden="true" />
                  <p className="text-sm font-medium text-zinc-900">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-zinc-500">Supabase PostgreSQL and Google OAuth ready for the next build step.</p>
        </div>

        <div className="flex items-center border-t border-zinc-200 bg-white px-6 py-8 sm:px-10 lg:border-l lg:border-t-0">
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-zinc-950">Login</h2>
              <p className="mt-2 text-sm text-zinc-500">Prototype access for the MVP dashboard.</p>
            </div>

            <LoginActions />

            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Google OAuth is connected through Supabase Auth. Gmail inbox access is still not connected.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
