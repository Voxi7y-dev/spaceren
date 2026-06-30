import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("spaceren_token"));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <span className="text-2xl font-bold tracking-tight">SpaceRent</span>
        <div className="flex gap-4">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition font-medium"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition font-medium"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center">
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight max-w-4xl">
          Rent a micro-space for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            £1/month
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-blue-200/80 max-w-2xl">
          List, customize, and rent micro-spaces. Store anything you want —
          physical, digital, or conceptual. No rules, no limits.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/spaces"
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-lg font-semibold transition shadow-xl shadow-blue-500/20"
          >
            Browse Spaces
          </Link>
          <Link
            href="/signup"
            className="px-8 py-4 rounded-xl border border-white/20 hover:bg-white/10 text-lg font-semibold transition"
          >
            Get Started Free
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left">
          {[
            { title: "Anything Goes", desc: "No restrictions on what you store. Use the JSONB metadata to define any structure you want." },
            { title: "Fixed Rate", desc: "£1/month or £12/year. No hidden fees, no surprises." },
            { title: "Full Automation", desc: "Stripe subscriptions handle billing. Webhooks keep your database in sync." },
          ].map((card) => (
            <div key={card.title} className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
              <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
              <p className="text-blue-200/70">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
