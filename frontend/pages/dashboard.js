import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import DashboardView from "../components/Dashboard";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("spaceren_user");
    const token = localStorage.getItem("spaceren_token");
    if (!raw || !token) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(raw));
    setLoading(false);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8">
        <DashboardView user={user} />
      </main>
    </div>
  );
}
