
"use client";

import { useEffect, useState } from "react";

type ApiResponse = {
  status: string;
  message: string;
  service: string;
  timestamp: string;
};

export default function BackendTestPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkBackend() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
          throw new Error("NEXT_PUBLIC_API_URL is not configured.");
        }

        const response = await fetch(`${apiUrl}/api/health/`);

        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const result: ApiResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the backend."
        );
      } finally {
        setLoading(false);
      }
    }

    checkBackend();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F9FC] p-8 text-[#0F172A]">
      <div className="mx-auto max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-6">
        <h1 className="text-2xl font-bold">
          Political Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Django backend connection test
        </p>

        {loading && (
          <p className="mt-6">Connecting to backend...</p>
        )}

        {!loading && data && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <h2 className="font-semibold text-green-800">
              Backend connected successfully
            </h2>

            <p className="mt-2">{data.message}</p>
            <p className="mt-1 text-sm">Service: {data.service}</p>
            <p className="mt-1 break-all text-sm">
              Server time: {data.timestamp}
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <h2 className="font-semibold text-red-800">
              Connection failed
            </h2>
            <p className="mt-2 break-words">{error}</p>
            <p className="mt-2 text-sm">
              Check that Django is running and the API URL is correct.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
