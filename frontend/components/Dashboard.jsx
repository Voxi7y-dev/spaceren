import { useEffect, useState } from "react";
import { getMe, listSpaces } from "../lib/api";
import SpaceCard from "./SpaceCard";

export default function DashboardView({ user }) {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSpaces()
      .then(setSpaces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rented = spaces.filter((s) => s.current_tenant_id === user.id);
  const available = spaces.filter((s) => s.status === "vacant");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user.display_name || "User"}</h1>
      <p className="text-gray-500 mb-8">Manage your rented spaces and browse available ones.</p>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Your Rented Spaces</h2>
        {rented.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            You haven&apos;t rented any spaces yet.
            <br />
            <a href="/spaces" className="text-blue-600 hover:underline mt-2 inline-block">
              Browse spaces
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rented.map((s) => (
              <SpaceCard key={s.id} space={s} user={user} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Available Spaces</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {available.map((s) => (
              <SpaceCard key={s.id} space={s} user={user} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
