import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import { getAdminDashboard } from "../lib/api";

export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("spaceren_user");
    const token = localStorage.getItem("spaceren_token");
    if (!raw || !token) {
      router.replace("/login");
      return;
    }
    const u = JSON.parse(raw);
    if (!u.is_admin) {
      router.replace("/dashboard");
      return;
    }
    setUser(u);
  }, []);

  useEffect(() => {
    if (!user) return;
    getAdminDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const statCard = (label, value, color) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {statCard("Total Subscribers", data.total_subscribers, "text-blue-600")}
              {statCard("Active Subscriptions", data.active_subscriptions, "text-green-600")}
              {statCard("Monthly Recurring Revenue", `£${data.monthly_recurring_revenue}`, "text-purple-600")}
              {statCard(
                "Occupied / Vacant",
                `${data.occupied_spaces} / ${data.vacant_spaces}`,
                data.vacant_spaces > 0 ? "text-amber-600" : "text-green-600"
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
              {data.recent_transactions.length === 0 ? (
                <p className="text-gray-400">No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-3 pr-4">Amount</th>
                        <th className="py-3 pr-4">Currency</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-100">
                          <td className="py-3 pr-4 font-medium">£{(tx.amount / 100).toFixed(2)}</td>
                          <td className="py-3 pr-4 uppercase">{tx.currency}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tx.status === "success"
                                  ? "bg-green-100 text-green-700"
                                  : tx.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-red-500">Failed to load dashboard data.</p>
        )}
      </main>
    </div>
  );
}
