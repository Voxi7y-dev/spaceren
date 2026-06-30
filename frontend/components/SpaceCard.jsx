import { useState } from "react";
import CheckoutModal from "./CheckoutModal";
import SpaceCustomizer from "./SpaceCustomizer";

export default function SpaceCard({ space, user }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const isRentedByMe = space.current_tenant_id === user.id;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold">{space.name}</h3>
          <span
            className={`shrink-0 ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              space.status === "vacant"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {space.status === "vacant" ? "Vacant" : "Rented"}
          </span>
        </div>

        {space.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-3">{space.description}</p>
        )}

        {space.custom_metadata && Object.keys(space.custom_metadata).length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Metadata</p>
            <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto max-h-20">
              {JSON.stringify(space.custom_metadata, null, 1)}
            </pre>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">From</p>
            <p className="text-lg font-bold">
              £1<span className="text-sm font-normal text-gray-400">/month</span>
            </p>
          </div>

          <div className="flex gap-2">
            {isRentedByMe ? (
              <button
                onClick={() => setShowCustomize(true)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium transition"
              >
                Customize
              </button>
            ) : space.status === "vacant" ? (
              <button
                onClick={() => setShowCheckout(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                Rent Now
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal space={space} onClose={() => setShowCheckout(false)} />
      )}
      {showCustomize && (
        <SpaceCustomizer space={space} onClose={() => setShowCustomize(false)} />
      )}
    </>
  );
}
