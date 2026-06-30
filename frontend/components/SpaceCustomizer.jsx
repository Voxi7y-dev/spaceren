import { useState } from "react";
import toast from "react-hot-toast";
import { customizeSpace, uploadMedia, cancelSubscription } from "../lib/api";
import DragDropUpload from "./DragDropUpload";

export default function SpaceCustomizer({ space, onClose }) {
  const [description, setDescription] = useState(space.description || "");
  const [metadataKey, setMetadataKey] = useState("");
  const [metadataVal, setMetadataVal] = useState("");
  const [metadata, setMetadata] = useState(space.custom_metadata || {});
  const [saving, setSaving] = useState(false);

  const addMetadata = () => {
    if (!metadataKey.trim()) return;
    setMetadata((prev) => ({ ...prev, [metadataKey.trim()]: metadataVal }));
    setMetadataKey("");
    setMetadataVal("");
  };

  const removeMetadata = (key) => {
    const next = { ...metadata };
    delete next[key];
    setMetadata(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await customizeSpace(space.id, {
        description: description || null,
        custom_metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });
      toast.success("Space updated");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll retain access until the period ends.")) return;
    try {
      await cancelSubscription(space.id);
      toast.success("Subscription canceled");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Cancel failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-6">Customize: {space.name}</h2>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item / Purpose Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Describe what this space holds — anything goes. e.g. 'Leftover lasagna storage', 'Minecraft server hosting'"
          />
        </div>

        {/* Tags / Custom Metadata */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Meta-Fields (Tags)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={metadataKey}
              onChange={(e) => setMetadataKey(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Key (e.g. 'color', 'purpose')"
            />
            <input
              value={metadataVal}
              onChange={(e) => setMetadataVal(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Value (e.g. 'blue', 'archival')"
            />
            <button
              onClick={addMetadata}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition"
            >
              Add
            </button>
          </div>
          {Object.keys(metadata).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(metadata).map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm"
                >
                  <strong>{k}:</strong> {String(v)}
                  <button
                    onClick={() => removeMetadata(k)}
                    className="ml-1 text-blue-400 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* File Uploads */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media &amp; File Uploads
          </label>
          <DragDropUpload spaceId={space.id} />
          {space.media_urls?.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Uploaded files</p>
              {space.media_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:underline truncate"
                >
                  {url.split("/").pop() || url}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium transition"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
}
