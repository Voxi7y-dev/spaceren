import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { uploadMedia } from "../lib/api";

export default function DragDropUpload({ spaceId }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          await uploadMedia(spaceId, file);
        }
        toast.success(`Uploaded ${acceptedFiles.length} file(s)`);
      } catch (err) {
        toast.error(err.response?.data?.detail || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [spaceId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
        isDragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400 bg-gray-50"
      }`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <p className="text-gray-500">Uploading...</p>
      ) : isDragActive ? (
        <p className="text-blue-600 font-medium">Drop files here...</p>
      ) : (
        <div>
          <p className="text-gray-600 font-medium">
            Drag &amp; drop files here, or click to select
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Any file type accepted — photos, PDFs, zips, logs, text files
          </p>
        </div>
      )}
    </div>
  );
}
