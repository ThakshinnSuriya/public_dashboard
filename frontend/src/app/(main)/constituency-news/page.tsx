
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ExternalLink,
  Newspaper,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

interface NewsArticle {
  id: number;
  headline: string;
  description: string;
  article_url: string;
  image_url: string;
  source: string;
  author: string;
  published_at: string | null;
  language: string;
}

interface NewsResponse {
  constituency: {
    id: number;
    name: string;
    state: string;
  };
  count: number;
  articles: NewsArticle[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function ConstituencyNewsPage() {
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Please log in to view constituency news.");
        return;
      }

      const response = await fetch(`${API_URL}/news/`, {
        method: "GET",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to fetch constituency news."
        );
      }

      setNews(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while fetching news."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const formatDate = (date: string | null) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#F7F9FC] p-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-[#1B4332]" />
            <h1 className="text-2xl font-bold text-gray-900">
              Constituency News
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Latest news and updates from your constituency.
          </p>
        </div>

        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh News
        </button>
      </div>

      {/* Constituency Information */}
      {news && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Showing news for
          </p>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {news.constituency.name}
              </h2>
              <p className="text-sm text-gray-500">
                {news.constituency.state}
              </p>
            </div>

            <div className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
              {news.count} Articles
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white">
          <RefreshCw className="h-8 w-8 animate-spin text-[#1B4332]" />
          <p className="mt-3 text-sm text-gray-500">
            Fetching constituency news...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />

          <div>
            <h3 className="font-semibold text-red-800">
              Unable to load news
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              onClick={fetchNews}
              className="mt-3 text-sm font-semibold text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading &&
        !error &&
        news &&
        news.articles.length === 0 && (
          <div className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center">
            <Newspaper className="h-10 w-10 text-gray-300" />

            <h3 className="mt-4 font-semibold text-gray-800">
              No news articles available
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              New articles will appear here when they are collected.
            </p>
          </div>
        )}

      {/* News Articles */}
      {!loading && !error && news && news.articles.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {news.articles.map((article) => (
            <article
              key={article.id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-md"
            >
              {/* Article Image */}
              {article.image_url ? (
                <div className="h-48 overflow-hidden bg-gray-100">
                  <img
                    src={article.image_url}
                    alt={article.headline}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-100">
                  <Newspaper className="h-12 w-12 text-gray-300" />
                </div>
              )}

              <div className="space-y-3 p-5">
                {/* Source and Language */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
                    {article.source}
                  </span>

                  <span className="text-xs uppercase text-gray-400">
                    {article.language === "ta"
                      ? "Tamil"
                      : article.language === "en"
                        ? "English"
                        : article.language}
                  </span>
                </div>

                {/* Headline */}
                <h2 className="line-clamp-3 text-lg font-semibold leading-snug text-gray-900">
                  {article.headline}
                </h2>

                {/* Description */}
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                  {article.description ||
                    "No description available for this article."}
                </p>

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(article.published_at)}
                </div>

                {/* Read More */}
                <div className="border-t border-gray-100 pt-3">
                  <a
                    href={article.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4332] transition hover:text-green-700"
                  >
                    Read Full Article
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
