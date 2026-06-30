import { useRouter } from "next/router";
import Link from "next/link";

export default function Sidebar({ user }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("spaceren_token");
    localStorage.removeItem("spaceren_user");
    router.push("/");
  };

  const linkClass = (path) =>
    `block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      router.pathname === path
        ? "bg-blue-600 text-white"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col p-6">
      <Link href="/" className="text-2xl font-bold tracking-tight mb-10">
        SpaceRent
      </Link>

      <nav className="flex-1 space-y-1">
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          Dashboard
        </Link>
        <Link href="/spaces" className={linkClass("/spaces")}>
          Browse Spaces
        </Link>
        {user?.is_admin && (
          <Link href="/admin" className={linkClass("/admin")}>
            Admin
          </Link>
        )}
      </nav>

      <div className="pt-6 border-t border-white/10">
        <p className="text-sm text-gray-400 truncate">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="mt-3 w-full px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-red-500/20 hover:text-red-300 transition"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}
