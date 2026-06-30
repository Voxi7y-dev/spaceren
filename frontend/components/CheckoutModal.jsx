import { useState } from "react";
import toast from "react-hot-toast";
import { createCheckout } from "../lib/api";

export default function CheckoutModal({ space, onClose }) {
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(false);

  const price = period === "month" ? 1 : 12;

  const handleRent = async () => {
    setLoading(true);
    try {
      const data = await createCheckout(space.id, period);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-2">Rent {space.name}</h2>
        <p className="text-gray-500 text-sm mb-6">Choose your billing period.</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setPeriod("month")}
            className={`p-5 rounded-xl border-2 text-left transition ${
              period === "month"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-2xl font-bold">£1</p>
            <p className="text-sm text-gray-500">per month</p>
          </button>
          <button
            onClick={() => setPeriod("year")}
            className={`p-5 rounded-xl border-2 text-left transition ${
              period === "year"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="text-2xl font-bold">£12</p>
            <p className="text-sm text-gray-500">per year</p>
          </button>
        </div>

        <button
          onClick={handleRent}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
        >
          {loading ? "Redirecting to Stripe..." : `Pay £${price} — Rent Now`}
        </button>

        <p className="mt-4 text-xs text-gray-400 text-center">
          You will be redirected to Stripe to complete payment.
          <br />
          Cancel anytime.
        </p>
      </div>
    </div>
  );
}
