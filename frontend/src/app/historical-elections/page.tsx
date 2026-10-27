
"use client";

import { useMemo, useState } from "react";
import { elections } from "@/data/elections";

type Candidate = {
  state: string;
  constituencyNumber: number;
  constituencyName: string;
  candidateName: string;
  sex: string;
  age: number;
  category: string;
  party: string;
  symbol: string;
  generalVotes: number;
  postalVotes: number;
  totalVotes: number;
  votePercentage: number;
  totalElectors: number;
};





const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

export default function HistoricalElectionsPage() {
  const [selectedYear, setSelectedYear] = useState(2021);

  const activeElection = elections.find(
    (election) => election.year === selectedYear
  )!;

  const candidates = activeElection.results as Candidate[];

  const [search, setSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState("All parties");
  const [page, setPage] = useState(1);

  
  
  const pageSize = 20;

  const parties = useMemo(
    () =>
      [...new Set(candidates.map((candidate) => candidate.party))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [candidates]
  );

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return candidates.filter((candidate) => {
      
      const matchesSearch =
        !query ||
        candidate.candidateName.toLowerCase().includes(query) ||
        candidate.constituencyName.toLowerCase().includes(query) ||
        candidate.party.toLowerCase().includes(query) ||
        candidate.symbol.toLowerCase().includes(query) ||
        String(candidate.constituencyNumber).includes(query);


      const matchesParty =
        selectedParty === "All parties" ||
        candidate.party === selectedParty;

      return matchesSearch && matchesParty;
    });
  }, [candidates, search, selectedParty]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCandidates.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleCandidates = filteredCandidates.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateParty(value: string) {
    setSelectedParty(value);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 ">
      <div>
        
        <div className="mb-4 flex items-center justify-end gap-3">
          <label
            htmlFor="election-year"
            className="text-sm font-medium text-slate-600"
          >
            Election year
          </label>

          <select
            id="election-year"
            value={selectedYear}
            onChange={(event) => {
              setSelectedYear(Number(event.target.value));
              setPage(1);
              setSelectedParty("All parties");
              setSearch("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            {elections.map((election) => (
              <option key={election.id} value={election.year}>
                {election.year} — {election.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm font-medium text-emerald-800">
          ELECTION DATA / HISTORICAL RECORDS
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Historical Election Results
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Explore candidate-level results from the 2021 Tamil Nadu
          Legislative Assembly election.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Constituencies</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">234</p>
          <p className="mt-1 text-xs text-slate-500">
            Tamil Nadu Assembly
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Candidate records</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(candidates.length)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Includes NOTA entries
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Political parties</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {parties.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Distinct party labels in the data
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Candidate results
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Search candidates or constituencies and filter by party.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px]">
            <input
              type="search"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search candidate or constituency..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={selectedParty}
              onChange={(event) => updateParty(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            >
              <option>All parties</option>
              {parties.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Showing {filteredCandidates.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            {"–"}
            {Math.min(currentPage * pageSize, filteredCandidates.length)} of{" "}
            {formatNumber(filteredCandidates.length)} records
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Constituency</th>
                <th className="px-5 py-3 font-semibold">Candidate</th>
                <th className="px-5 py-3 font-semibold">Party</th>
                <th className="px-5 py-3 font-semibold">Symbol</th>
                <th className="px-5 py-3 text-right font-semibold">Votes</th>
                <th className="px-5 py-3 text-right font-semibold">
                  Vote share
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleCandidates.map((candidate, index) => (
                <tr
                  key={`${candidate.constituencyNumber}-${candidate.candidateName}-${index}`}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">
                      {candidate.constituencyName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      AC {candidate.constituencyNumber}
                    </p>
                  </td>

                  <td className="px-5 py-4 font-medium text-slate-800">
                    {candidate.candidateName}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {candidate.party}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {candidate.symbol}
                  </td>

                  <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-900">
                    {formatNumber(candidate.totalVotes)}
                  </td>

                  <td className="px-5 py-4 text-right tabular-nums text-slate-700">
                    {Number(candidate.votePercentage).toFixed(2)}%
                  </td>
                </tr>
              ))}

              {visibleCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="font-medium text-slate-800">
                      No matching results
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or select a different party.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((previous) => Math.min(totalPages, previous + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Source: imported 2021,2026 Tamil Nadu Legislative Assembly detailed results.
      
      </p>
    </div>
  );
}
