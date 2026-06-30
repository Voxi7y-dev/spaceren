import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import SpaceCard from "../components/SpaceCard";
import { listSpaces } from "../lib/api";

export default function Spaces() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("spaceren_user");
    const token = localStorage.getItem("spaceren_token");
    if (!raw || !token) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(raw));
  }, []);

  useEffect(() => {
    if (!user) return;
    listSpaces()
      .then(setSpaces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold mb-8">Available Spaces</h1>
        {loading ? (
          <p className="text-gray-500">Loading spaces...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((s) => (
              <SpaceCard key={s.id} space={s} user={user} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
