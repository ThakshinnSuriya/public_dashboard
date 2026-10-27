"use client";

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
} from "lucide-react";
import { X, ChevronDown } from "lucide-react";
import raw2021 from "@/data/tn-legislative-assembly/2021/detailed-results.json";
import raw2026 from "@/data/tn-legislative-assembly/2026/detailed-results.json";

/* ────────────────────────────────────────────────────────────────────────── */
/* Election registry (replace with the export from src/data/elections.ts)      */
/* ────────────────────────────────────────────────────────────────────────── */

interface ElectionSource {
  year: number;
  label: string;
  raw: unknown;
}

const ELECTIONS: ElectionSource[] = [
  { year: 2026, label: "Tamil Nadu Legislative Assembly 2026", raw: raw2026 },
  { year: 2021, label: "Tamil Nadu Legislative Assembly 2021", raw: raw2021 },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* Theme                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

const C = {
  green: "#1B4332",
  gold: "#E9B44C",
  bg: "#F7F9FC",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  positive: "#16A34A",
  neutral: "#D97706",
  negative: "#DC2626",
};

const FIELD =
  "h-9 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#64748B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C]";
const BTN =
  "inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C] disabled:cursor-not-allowed disabled:opacity-50";

const nf = new Intl.NumberFormat("en-IN");
const fmt = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));
const fmtPct = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : `${n.toFixed(d)}%`;

/* ────────────────────────────────────────────────────────────────────────── */
/* Data adapter — the only place that knows about raw JSON key names           */
/* ────────────────────────────────────────────────────────────────────────── */

type Rec = Record<string, unknown>;

const COLS = {
  consNo: ["constituencyno", "constituencynumber", "acno", "acnumber", "constno", "constituencyid"],
  consName: ["constituencyname", "constituency", "acname"],
  candidate: ["candidatename", "candidate", "nameofcandidate", "name"],
  sex: ["sex", "gender"],
  age: ["age"],
  category: ["category", "cat"],
  party: ["party", "partyname", "politicalparty"],
  symbol: ["symbol"],
  general: ["generalvotes", "general", "evmvotes"],
  postal: ["postalvotes", "postal"],
  total: ["totalvotes", "total", "votes", "totalvotesreceived"],
  pct: ["votepercentage", "votepercent", "voteshare", "percentage", "pct", "ofvotes"],
  electors: ["totalelectors", "electors", "totalelectorsinconstituency"],
} as const;

const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[,%\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Flattens flat arrays or nested constituency → candidates structures. */
function flatten(rawData: unknown): Rec[] {
  const out: Rec[] = [];
  const walk = (node: unknown, parent: Rec, depth: number) => {
    if (depth > 4) return;
    if (Array.isArray(node)) {
      for (const item of node) if (isRec(item)) visit(item, parent, depth);
      return;
    }
    if (isRec(node)) {
      let found = false;
      for (const v of Object.values(node)) {
        if (Array.isArray(v) && v.some(isRec)) {
          found = true;
          walk(v, parent, depth + 1);
        }
      }
      if (!found) out.push({ ...parent, ...node });
    }
  };
  const visit = (item: Rec, parent: Rec, depth: number) => {
    const childArrays = Object.entries(item).filter(
      ([, v]) => Array.isArray(v) && v.length > 0 && v.every(isRec),
    );
    if (childArrays.length === 0) {
      out.push({ ...parent, ...item });
      return;
    }
    const scalars: Rec = {};
    for (const [k, v] of Object.entries(item)) if (!Array.isArray(v)) scalars[k] = v;
    for (const [, arr] of childArrays) walk(arr, { ...parent, ...scalars }, depth + 1);
  };
  walk(rawData, {}, 0);
  return out;
}

function pick(map: Map<string, unknown>, names: readonly string[]): unknown {
  for (const n of names) if (map.has(n)) return map.get(n);
  return undefined;
}

/* ── Party normalisation: explicit aliases, exact match only ─────────────── */

interface TrackedParty {
  key: string;
  label: string;
  color: string;
  aliases: string[]; // normalised: upper-case, alphanumerics only
}

const TRACKED_PARTIES: TrackedParty[] = [
  { key: "DMK", label: "DMK", color: "#B91C1C", aliases: ["DMK", "DRAVIDAMUNNETRAKAZHAGAM"] },
  { key: "AIADMK", label: "AIADMK", color: "#15803D", aliases: ["AIADMK", "ALLINDIAANNADRAVIDAMUNNETRAKAZHAGAM"] },
  { key: "TVK", label: "TVK", color: "#C58A12", aliases: ["TVK", "TAMILAGAVETTRIKAZHAGAM"] },
  { key: "NTK", label: "NTK", color: "#7C3AED", aliases: ["NTK", "NAAMTAMILARKATCHI", "NAMTAMILARKATCHI"] },
];

const aliasIndex = new Map<string, TrackedParty>();
for (const p of TRACKED_PARTIES) for (const a of p.aliases) aliasIndex.set(a, p);

const normParty = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

function resolveParty(label: string): { key: string; label: string; tracked: boolean; color: string } {
  const clean = label.trim();
  if (!clean) return { key: "UNKNOWN", label: "Unspecified party", tracked: false, color: C.muted };
  const hit = aliasIndex.get(normParty(clean));
  if (hit) return { key: hit.key, label: hit.label, tracked: true, color: hit.color };
  return { key: `RAW:${normParty(clean) || clean}`, label: clean, tracked: false, color: C.green };
}

const isNotaLabel = (s: string) => /(^|\b)nota(\b|$)|none of the above/i.test(s);

/* ── Model ───────────────────────────────────────────────────────────────── */

interface Row {
  id: string;
  consKey: string;
  consNo: string;
  consName: string;
  candidate: string;
  sex: string;
  age: number | null;
  category: string;
  party: string;
  partyKey: string;
  partyColor: string;
  symbol: string;
  votes: number;
  sourcePct: number | null;
  electors: number | null;
  isNota: boolean;
  /** votes ÷ constituency total recorded votes (incl. NOTA) × 100 */
  share: number;
}

interface Cons {
  key: string;
  no: string;
  name: string;
  rows: Row[]; // sorted by votes desc
  total: number;
  electors: number | null;
  turnout: number | null;
  leader: Row | null;
  runnerUp: Row | null;
  margin: number | null;
  marginPct: number | null;
  tie: boolean;
  notaVotes: number;
}

interface PartyStat {
  key: string;
  label: string;
  tracked: boolean;
  color: string;
  votes: number;
  seats: number;
  contested: number;
  avgShare: number;
}

interface Notes {
  sourceRecords: number;
  usedRecords: number;
  duplicatesRemoved: number;
  missingConstituency: number;
  missingVotes: number;
  notaRows: number;
  tiedConstituencies: number;
  constituenciesWithoutElectors: number;
  pctChecked: number;
  pctMatchInclNota: number;
  pctMatchExclNota: number;
}

interface Model {
  rows: Row[];
  cons: Cons[];
  parties: PartyStat[];
  totalVotes: number;
  notaVotes: number;
  totalElectors: number | null;
  turnout: number | null;
  notes: Notes;
}

function buildModel(rawData: unknown): Model {
  const records = flatten(rawData);
  const notes: Notes = {
    sourceRecords: records.length,
    usedRecords: 0,
    duplicatesRemoved: 0,
    missingConstituency: 0,
    missingVotes: 0,
    notaRows: 0,
    tiedConstituencies: 0,
    constituenciesWithoutElectors: 0,
    pctChecked: 0,
    pctMatchInclNota: 0,
    pctMatchExclNota: 0,
  };

  type Draft = Omit<Row, "share" | "id">;
  const seen = new Set<string>();
  const drafts: Draft[] = [];

  for (const rec of records) {
    const map = new Map<string, unknown>();
    for (const [k, v] of Object.entries(rec)) map.set(normKey(k), v);

    const consNo = toStr(pick(map, COLS.consNo));
    const consName = toStr(pick(map, COLS.consName));
    if (!consNo && !consName) {
      notes.missingConstituency++;
      continue;
    }

    const general = toNum(pick(map, COLS.general));
    const postal = toNum(pick(map, COLS.postal));
    let votes = toNum(pick(map, COLS.total));
    if (votes == null && (general != null || postal != null)) votes = (general ?? 0) + (postal ?? 0);
    if (votes == null) {
      notes.missingVotes++;
      continue;
    }

    const candidate = toStr(pick(map, COLS.candidate)) || "Unnamed candidate";
    const partyLabel = toStr(pick(map, COLS.party));
    const p = resolveParty(partyLabel);
    const nota = isNotaLabel(candidate) || isNotaLabel(partyLabel);
    const consKey = consNo || consName;

    const dupKey = `${consKey}|${candidate.toLowerCase()}|${p.key}|${votes}`;
    if (seen.has(dupKey)) {
      notes.duplicatesRemoved++;
      continue;
    }
    seen.add(dupKey);

    drafts.push({
      consKey,
      consNo: consNo || "—",
      consName: consName || `Constituency ${consNo}`,
      candidate,
      sex: toStr(pick(map, COLS.sex)),
      age: toNum(pick(map, COLS.age)),
      category: toStr(pick(map, COLS.category)),
      party: nota ? "NOTA" : p.label,
      partyKey: nota ? "NOTA" : p.key,
      partyColor: nota ? C.muted : p.color,
      symbol: toStr(pick(map, COLS.symbol)),
      votes,
      sourcePct: toNum(pick(map, COLS.pct)),
      electors: toNum(pick(map, COLS.electors)),
      isNota: nota,
    });
  }

  notes.usedRecords = drafts.length;

  // Group by constituency
  const groups = new Map<string, Draft[]>();
  for (const d of drafts) {
    const g = groups.get(d.consKey);
    if (g) g.push(d);
    else groups.set(d.consKey, [d]);
  }

  const allRows: Row[] = [];
  const cons: Cons[] = [];

  for (const [key, list] of groups) {
    const total = list.reduce((s, r) => s + r.votes, 0);
    const nonNotaTotal = list.filter((r) => !r.isNota).reduce((s, r) => s + r.votes, 0);
    const rows: Row[] = list
      .map((d, i) => ({
        ...d,
        id: `${key}-${i}`,
        share: total > 0 ? (d.votes / total) * 100 : 0,
      }))
      .sort((a, b) => b.votes - a.votes);

    for (const r of rows) {
      if (r.isNota) notes.notaRows++;
      if (r.sourcePct != null && total > 0) {
        notes.pctChecked++;
        if (Math.abs(r.sourcePct - (r.votes / total) * 100) <= 0.1) notes.pctMatchInclNota++;
        if (nonNotaTotal > 0 && Math.abs(r.sourcePct - (r.votes / nonNotaTotal) * 100) <= 0.1)
          notes.pctMatchExclNota++;
      }
    }

    const contenders = rows.filter((r) => !r.isNota);
    const leader = contenders[0] ?? null;
    const runnerUp = contenders[1] ?? null;
    const tie = !!leader && !!runnerUp && leader.votes === runnerUp.votes;
    const margin = leader && runnerUp ? leader.votes - runnerUp.votes : null;
    const electorVals = list.map((r) => r.electors).filter((v): v is number => v != null && v > 0);
    const electors = electorVals.length ? Math.max(...electorVals) : null;
    if (electors == null) notes.constituenciesWithoutElectors++;
    if (tie) notes.tiedConstituencies++;

    cons.push({
      key,
      no: list[0].consNo,
      name: list[0].consName,
      rows,
      total,
      electors,
      turnout: electors ? (total / electors) * 100 : null,
      leader,
      runnerUp,
      margin,
      marginPct: margin != null && total > 0 ? (margin / total) * 100 : null,
      tie,
      notaVotes: rows.filter((r) => r.isNota).reduce((s, r) => s + r.votes, 0),
    });
    allRows.push(...rows);
  }

  cons.sort((a, b) => {
    const an = parseFloat(a.no);
    const bn = parseFloat(b.no);
    if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
    return a.name.localeCompare(b.name);
  });

  // Party aggregation (NOTA excluded from party list, included in denominators)
  const pmap = new Map<string, PartyStat & { shareSum: number; contestedKeys: Set<string> }>();
  for (const r of allRows) {
    if (r.isNota) continue;
    let p = pmap.get(r.partyKey);
    if (!p) {
      const meta = resolveParty(r.party);
      p = {
        key: r.partyKey,
        label: r.party,
        tracked: meta.tracked,
        color: r.partyColor,
        votes: 0,
        seats: 0,
        contested: 0,
        avgShare: 0,
        shareSum: 0,
        contestedKeys: new Set<string>(),
      };
      pmap.set(r.partyKey, p);
    }
    p.votes += r.votes;
    // Count a party once per constituency even if the source has duplicate candidate rows.
    if (!p.contestedKeys.has(r.consKey)) {
      p.contestedKeys.add(r.consKey);
      p.contested += 1;
      p.shareSum += r.share;
    }
  }
  for (const c of cons) {
    if (c.leader && !c.tie) {
      const p = pmap.get(c.leader.partyKey);
      if (p) p.seats += 1;
    }
  }
  const parties: PartyStat[] = [...pmap.values()]
    .map(({ shareSum, contestedKeys: _contestedKeys, ...p }) => ({ ...p, avgShare: p.contested ? shareSum / p.contested : 0 }))
    .sort((a, b) => b.votes - a.votes);

  const totalVotes = cons.reduce((s, c) => s + c.total, 0);
  const notaVotes = cons.reduce((s, c) => s + c.notaVotes, 0);
  const allHaveElectors = cons.length > 0 && cons.every((c) => c.electors != null);
  const totalElectors = allHaveElectors ? cons.reduce((s, c) => s + (c.electors ?? 0), 0) : null;

  return {
    rows: allRows,
    cons,
    parties,
    totalVotes,
    notaVotes,
    totalElectors,
    turnout: totalElectors ? (totalVotes / totalElectors) * 100 : null,
    notes,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Small UI primitives                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

type SortDir = "asc" | "desc";

function compare(a: string | number | null, b: string | number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const r =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), undefined, { numeric: true });
  return dir === "asc" ? r : -r;
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28">
      <div className="mb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-[#0F172A]">
          {title}
        </h2>
        <p className="text-sm text-[#64748B]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Panel({ title, note, children, className = "" }: { title?: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm ${className}`}>
      {title && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
          {note && <p className="text-xs text-[#64748B]">{note}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-[#0F172A]">{value}</dd>
      <p className="mt-0.5 text-xs text-[#64748B]">{hint}</p>
    </div>
  );
}

interface BarItem {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
  detail: string;
}

function BarList({
  items,
  onSelect,
  selectedKey,
}: {
  items: BarItem[];
  onSelect?: (key: string) => void;
  selectedKey?: string | null;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-1.5">
      {items.map((i) => {
        const active = selectedKey === i.key;
        const body = (
          <>
            <span className="w-28 shrink-0 truncate text-left text-sm text-[#0F172A] sm:w-40" title={i.label}>
              {i.label}
            </span>
            <span className="relative h-5 flex-1 rounded bg-[#F1F5F9]">
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${(i.value / max) * 100}%`, backgroundColor: i.color, opacity: active || !selectedKey ? 1 : 0.45 }}
              />
            </span>
            <span className="w-28 shrink-0 text-right text-xs tabular-nums text-[#64748B]">{i.detail}</span>
          </>
        );
        return (
          <li key={i.key}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(i.key)}
                aria-pressed={active}
                title={`${i.label}: ${i.detail}`}
                className={`flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C] ${active ? "bg-[#F7F9FC]" : ""}`}
              >
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-1 py-0.5" title={`${i.label}: ${i.detail}`}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Histogram({ bins, color = C.green }: { bins: { label: string; count: number }[]; color?: string }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label={bins.map((b) => `${b.label}: ${b.count}`).join(", ")}>
      {bins.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${b.count}`}>
          <span className="text-xs tabular-nums text-[#64748B]">{b.count}</span>
          <div className="w-full rounded-t" style={{ height: `${(b.count / max) * 100}px`, minHeight: b.count ? 2 : 0, backgroundColor: color }} />
          <span className="text-[10px] leading-tight text-[#64748B]">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function SortTh<K extends string>({
  label,
  k,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  k: K;
  sort: { key: K; dir: SortDir };
  onSort: (k: K) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === k;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide text-[#64748B] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C]"
      >
        {label}
        {active ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden />}
      </button>
    </th>
  );
}

function SearchBox({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[#64748B]" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${FIELD} w-full pl-8 sm:w-64`} />
    </label>
  );
}

function PartyChip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page shell: sticky year selector + section navigation                       */
/* ────────────────────────────────────────────────────────────────────────── */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "parties", label: "Parties" },
  { id: "constituencies", label: "Constituencies" },
  { id: "candidates", label: "Candidates" },
];

export default function HistoricalAnalyticsPage() {
  const [year, setYear] = useState<number>(2026);
  const [active, setActive] = useState("overview");
  const election = ELECTIONS.find((e) => e.year === year);

  const goTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-[#F7F9FC] text-[#0F172A]">
      <div className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-base font-semibold sm:text-lg">Historical Analytics</h1>
            <p className="hidden text-xs text-[#64748B] md:block">
              Explore election outcomes, party performance, constituencies, and candidate results.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Page sections" className="flex gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(s.id)}
                  aria-current={active === s.id ? "true" : undefined}
                  className={`rounded-md px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C] ${active === s.id ? "bg-[#1B4332] text-white" : "text-[#64748B] hover:bg-[#F7F9FC] hover:text-[#0F172A]"}`}
                >
                  {s.label}
                </button>
              ))}
            </nav>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-[#64748B]">Election year</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={FIELD}>
                {ELECTIONS.map((e) => (
                  <option key={e.year} value={e.year}>
                    {e.year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6">
        {election ? (
          <Workspace key={election.year} election={election} />
        ) : (
          <Panel>
            <p className="flex items-center gap-2 text-sm text-[#64748B]">
              <AlertTriangle className="h-4 w-4 text-[#D97706]" aria-hidden /> No election datasets are configured.
            </p>
          </Panel>
        )}
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Workspace (remounted on year change, so all filters reset automatically)    */
/* ────────────────────────────────────────────────────────────────────────── */

function Workspace({ election }: { election: ElectionSource }) {
  const result = useMemo(() => {
    try {
      return { model: buildModel(election.raw), error: null as string | null };
    } catch (e) {
      return { model: null, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }, [election]);

  const [selectedParty, setSelectedParty] = useState<string | null>("NTK");

  if (result.error || !result.model) {
    return (
      <Panel>
        <p className="flex items-center gap-2 text-sm text-[#DC2626]">
          <AlertTriangle className="h-4 w-4" aria-hidden /> Could not process the {election.year} dataset: {result.error}
        </p>
      </Panel>
    );
  }

  const model = result.model;

  if (model.rows.length === 0) {
    return (
      <Panel>
        <p className="flex items-center gap-2 text-sm text-[#64748B]">
          <Info className="h-4 w-4" aria-hidden /> No usable candidate records were found for {election.year}. The
          adapter (<code>COLS</code>) may need to be updated for this file&apos;s field names.
        </p>
      </Panel>
    );
  }

  return (
    <>
      <p className="text-sm text-[#64748B]">{election.label}</p>
      <Overview model={model} onSelectParty={setSelectedParty} selectedParty={selectedParty} />
      <PartySection model={model} selected={selectedParty} onSelect={setSelectedParty} />
      <ConstituencySection model={model} />
      <CandidateSection model={model} />
    </>
  );
}
interface MarginBinDef { id: string; label: string; title: string; lo: number; hi: number }

const MARGIN_BINS: MarginBinDef[] = [
  { id: "lt1k", label: "<1k", title: "under 1,000", lo: 0, hi: 1000 },
  { id: "1-5k", label: "1–5k", title: "1,000 – 4,999", lo: 1000, hi: 5000 },
  { id: "5-10k", label: "5–10k", title: "5,000 – 9,999", lo: 5000, hi: 10000 },
  { id: "10-20k", label: "10–20k", title: "10,000 – 19,999", lo: 10000, hi: 20000 },
  { id: "20-30k", label: "20–30k", title: "20,000 – 29,999", lo: 20000, hi: 30000 },
  { id: "30k+", label: "30k+", title: "30,000 and above", lo: 30000, hi: Infinity },
];

interface MarginBin extends MarginBinDef { items: Cons[] }

function MarginHistogram({ bins, selectedId, onSelect }: { bins: MarginBin[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const max = Math.max(1, ...bins.map((b) => b.items.length));
  return (
    <div role="group" aria-label="Winning margin distribution. Select a bar to list its constituencies." className="flex h-44 items-end gap-2">
      {bins.map((b) => {
        const active = selectedId === b.id;
        const n = b.items.length;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            aria-pressed={active}
            aria-label={`Margin ${b.title} votes: ${n} constituencies`}
            title={`${b.title} votes · ${n} constituencies`}
            className={`flex h-full flex-1 flex-col items-center justify-end gap-1 rounded px-0.5 pb-1 hover:bg-[var(--ha-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ha-accent)] ${active ? "bg-[var(--ha-bg)] ring-1 ring-[var(--ha-primary)]" : ""}`}
          >
            <span className={`text-xs tabular-nums ${active ? "font-semibold text-[var(--ha-text)]" : "text-[var(--ha-muted)]"}`}>{n}</span>
            <span
              className="w-full rounded-t"
              style={{
                height: `${(n / max) * 100}px`,
                minHeight: n ? 2 : 0,
                backgroundColor: active ? "var(--ha-accent)" : "var(--ha-primary)",
                opacity: selectedId && !active ? 0.45 : 1,
              }}
            />
            <span className={`text-[10px] leading-tight ${active ? "font-semibold text-[var(--ha-text)]" : "text-[var(--ha-muted)]"}`}>{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}
type MarginSortKey = "no" | "name" | "winner" | "winnerParty" | "winnerVotes" | "runner" | "runnerParty" | "runnerVotes" | "margin";

function marginValue(c: Cons, k: MarginSortKey): string | number | null {
  switch (k) {
    case "no": return parseFloat(c.no) || null;
    case "name": return c.name;
    case "winner": return c.leader?.candidate ?? null;
    case "winnerParty": return c.leader?.party ?? null;
    case "winnerVotes": return c.leader?.votes ?? null;
    case "runner": return c.runnerUp?.candidate ?? null;
    case "runnerParty": return c.runnerUp?.party ?? null;
    case "runnerVotes": return c.runnerUp?.votes ?? null;
    case "margin": return c.margin;
  }
}

function MarginDrilldown({ bin, all, excluded, onClear }: { bin: MarginBin | null; all: Cons[]; excluded: number; onClear: () => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: MarginSortKey; dir: SortDir }>({ key: "margin", dir: "asc" });
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggleSort = (key: MarginSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: ["margin", "winnerVotes", "runnerVotes"].includes(key) ? "desc" : "asc" }));

  const source = bin ? bin.items : all;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source
      .filter((c) =>
        !q ||
        c.no.toLowerCase().startsWith(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.leader?.candidate.toLowerCase().includes(q) ?? false) ||
        (c.runnerUp?.candidate.toLowerCase().includes(q) ?? false) ||
        (c.leader?.party.toLowerCase().includes(q) ?? false) ||
        (c.runnerUp?.party.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => compare(marginValue(a, sort.key), marginValue(b, sort.key), sort.dir));
  }, [source, query, sort]);

  const heading = bin ? `Constituencies with a winning margin of ${bin.title} votes` : "All constituencies by winning margin";

  return (
    <div className="mt-4 scroll-mt-28 rounded-lg border border-[var(--ha-border)] bg-[var(--ha-surface)] p-4 shadow-sm" aria-live="polite">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{heading}</h3>
          <p className="text-xs text-[var(--ha-muted)]">
            {fmt(rows.length)} of {fmt(source.length)} shown. Margin = highest-vote minus second-highest non-NOTA candidate.
            {excluded > 0 && ` ${excluded} constituencies are excluded (fewer than two valid candidates).`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchBox value={query} onChange={setQuery} label="Search the margin results" placeholder="Constituency, candidate, party…" />
          {bin && (
            <button type="button" onClick={onClear} className={BTN}>
              <X className="h-4 w-4" aria-hidden /> Show all
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--ha-muted)]">
          {source.length === 0 ? "No constituencies fall in this margin range." : "No constituencies match your search."}
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 bg-[var(--ha-surface)] shadow-[0_1px_0_var(--ha-border)]">
              <tr>
                <SortTh label="No." k="no" sort={sort} onSort={toggleSort} />
                <SortTh label="Constituency" k="name" sort={sort} onSort={toggleSort} />
                <SortTh label="Winner" k="winner" sort={sort} onSort={toggleSort} />
                <SortTh label="Party" k="winnerParty" sort={sort} onSort={toggleSort} />
                <SortTh label="Votes" k="winnerVotes" sort={sort} onSort={toggleSort} align="right" />
                <SortTh label="Runner-up" k="runner" sort={sort} onSort={toggleSort} />
                <SortTh label="Party" k="runnerParty" sort={sort} onSort={toggleSort} />
                <SortTh label="Votes" k="runnerVotes" sort={sort} onSort={toggleSort} align="right" />
                <SortTh label="Margin" k="margin" sort={sort} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const open = openKey === c.key;
                return (
                  <Fragment key={c.key}>
                    <tr className={`border-t border-[var(--ha-border)] hover:bg-[var(--ha-bg)] ${open ? "bg-[var(--ha-bg)]" : ""}`}>
                      <td className="px-3 py-2 tabular-nums text-[var(--ha-muted)]">{c.no}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setOpenKey(open ? null : c.key)}
                          aria-expanded={open}
                          className="inline-flex items-center gap-1 rounded text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ha-accent)]"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
                          {c.name}
                        </button>
                      </td>
                      <td className="px-3 py-2">{c.leader?.candidate ?? "—"}</td>
                      <td className="px-3 py-2">{c.leader ? <PartyChip label={c.leader.party} color={c.leader.partyColor} /> : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(c.leader?.votes)}</td>
                      <td className="px-3 py-2">{c.runnerUp?.candidate ?? "—"}</td>
                      <td className="px-3 py-2">{c.runnerUp ? <PartyChip label={c.runnerUp.party} color={c.runnerUp.partyColor} /> : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(c.runnerUp?.votes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {fmt(c.margin)}
                        {c.tie && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-[var(--ha-neu)]">Tie</span>}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t border-[var(--ha-border)] bg-[var(--ha-bg)]">
                        <td colSpan={9} className="px-4 py-3">
                          <p className="mb-2 text-xs text-[var(--ha-muted)]">
                            {fmt(c.total)} votes recorded (incl. NOTA). Share = votes ÷ {fmt(c.total)}.
                          </p>
                          <BarList
                            items={c.rows.map((r) => ({
                              key: r.id,
                              label: r.isNota ? `${r.candidate} (NOTA)` : `${r.candidate} · ${r.party}`,
                              value: r.votes,
                              pct: r.share,
                              color: r.partyColor,
                              detail: `${fmt(r.votes)} · ${fmtPct(r.share, 1)}`,
                            }))}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
/* ────────────────────────────────────────────────────────────────────────── */
/* Section 1 — Overview                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function Overview({ model, onSelectParty, selectedParty }: { model: Model; onSelectParty: (k: string) => void; selectedParty: string | null }) {
  const { notes } = model;

  const [binId, setBinId] = useState<string | null>(null);
  const drillRef = useRef<HTMLDivElement>(null);

  const { bins, eligible, excluded } = useMemo(() => {
    const eligible = model.cons.filter((c) => c.margin != null); // needs 2+ non-NOTA candidates
    const bins: MarginBin[] = MARGIN_BINS.map((b) => ({
      ...b,
      items: eligible.filter((c) => (c.margin as number) >= b.lo && (c.margin as number) < b.hi),
    }));
    return { bins, eligible, excluded: model.cons.length - eligible.length };
  }, [model.cons]);

  const selectedBin = bins.find((b) => b.id === binId) ?? null; // stale ids resolve to null
  const selectBin = (id: string) => {
    setBinId((cur) => (cur === id ? null : id));
    requestAnimationFrame(() => drillRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const turnoutBins = useMemo(() => {
    const edges = [
      { label: "<60%", lo: 0, hi: 60 },
      { label: "60–65", lo: 60, hi: 65 },
      { label: "65–70", lo: 65, hi: 70 },
      { label: "70–75", lo: 70, hi: 75 },
      { label: "75–80", lo: 75, hi: 80 },
      { label: "80%+", lo: 80, hi: Infinity },
    ];
    return edges.map((e) => ({
      label: e.label,
      count: model.cons.filter((c) => c.turnout != null && c.turnout >= e.lo && c.turnout < e.hi).length,
    }));
  }, [model.cons]);

  const hasTurnout = model.cons.some((c) => c.turnout != null);
  const topParties = model.parties.slice(0, 8);

  return (
    <Section id="overview" title="Election overview" description="Headline figures computed from the bundled candidate-level dataset.">
      <dl className="grid grid-cols-2 divide-x divide-y divide-[#E2E8F0] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-sm sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        <Kpi label="Constituencies" value={fmt(model.cons.length)} hint="Distinct constituencies in data" />
        <Kpi label="Candidates" value={fmt(model.rows.filter((r) => !r.isNota).length)} hint="Excludes NOTA rows" />
        <Kpi label="Parties" value={fmt(model.parties.length)} hint="Distinct labels, NOTA excluded" />
        <Kpi label="Votes recorded" value={fmt(model.totalVotes)} hint={`Incl. NOTA (${fmt(model.notaVotes)})`} />
        <Kpi label="Registered electors" value={fmt(model.totalElectors)} hint={model.totalElectors == null ? "Not available for all constituencies" : "Sum of per-constituency electors"} />
        <Kpi label="Turnout" value={fmtPct(model.turnout)} hint="Votes recorded ÷ electors" />
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Party share of recorded votes" note="Share = party votes ÷ all recorded votes incl. NOTA. Click a party to inspect it below.">
          <BarList
            items={topParties.map((p) => ({
              key: p.key,
              label: p.label,
              value: p.votes,
              pct: model.totalVotes ? (p.votes / model.totalVotes) * 100 : 0,
              color: p.color,
              detail: `${fmtPct(model.totalVotes ? (p.votes / model.totalVotes) * 100 : 0, 1)} · ${fmt(p.votes)}`,
            }))}
            onSelect={onSelectParty}
            selectedKey={selectedParty}
          />
        </Panel>

        <div className="grid gap-4">
          <Panel title="Winning margin distribution" note="Constituencies by (leader votes − runner-up votes), NOTA excluded. Select a bar to list its constituencies.">
            <MarginHistogram bins={bins} selectedId={selectedBin?.id ?? null} onSelect={selectBin} />
          </Panel>
          {hasTurnout && (
            <Panel title="Constituency turnout distribution" note="Constituencies by votes recorded ÷ electors.">
              <Histogram bins={turnoutBins} color={C.gold} />
            </Panel>
          )}
        </div>
      </div>
      <div ref={drillRef} className="scroll-mt-28">
        <MarginDrilldown bin={selectedBin} all={eligible} excluded={excluded} onClear={() => setBinId(null)} />
      </div>

      <details className="mt-4 rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm shadow-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C]">
          <Info className="h-4 w-4 text-[#64748B]" aria-hidden /> Data notes and limitations
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[#64748B]">
          <li>Figures are computed from the files bundled with this app. They have not been verified against official results.</li>
          <li>Winners are the highest-vote non-NOTA candidates, not official declarations. Tied constituencies ({notes.tiedConstituencies}) are shown as ties and award no seat.</li>
          <li>
            {fmt(notes.usedRecords)} of {fmt(notes.sourceRecords)} source records used. Removed: {notes.duplicatesRemoved} exact duplicates, {notes.missingVotes} with no vote count,{" "}
            {notes.missingConstituency} with no constituency.
          </li>
          <li>
            Source vote percentages: {notes.pctChecked} checked; {notes.pctMatchInclNota} match votes ÷ total incl. NOTA, {notes.pctMatchExclNota} match votes ÷ total excl. NOTA (±0.1 pp).
            Displayed shares are recomputed using the incl.-NOTA denominator.
          </li>
          <li>Electors are taken as the largest value found per constituency. {notes.constituenciesWithoutElectors} constituencies have none, in which case turnout is not shown.</li>
          <li>Party grouping uses explicit aliases for tracked parties (DMK, AIADMK, TVK, NTK); all other labels are kept as written. No alliances are inferred.</li>
        </ul>
      </details>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Section 2 — Party performance                                               */
/* ────────────────────────────────────────────────────────────────────────── */

type PartySortKey = "label" | "votes" | "share" | "seats" | "contested" | "avgShare";

function PartySection({ model, selected, onSelect }: { model: Model; selected: string | null; onSelect: (k: string | null) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: PartySortKey; dir: SortDir }>({ key: "votes", dir: "desc" });

  const toggleSort = (key: PartySortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "label" ? "asc" : "desc" }));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = model.parties.filter((p) => !q || p.label.toLowerCase().includes(q));
    const val = (p: PartyStat): string | number =>
      sort.key === "label" ? p.label : sort.key === "share" ? (model.totalVotes ? (p.votes / model.totalVotes) * 100 : 0) : sort.key === "votes" ? p.votes : p[sort.key];
    return [...filtered].sort((a, b) => compare(val(a), val(b), sort.dir));
  }, [model.parties, query, sort]);

  const party = model.parties.find((p) => p.key === selected) ?? null;

  const footprint = useMemo(() => {
    if (!party) return [];
    return model.cons
      .map((c) => {
        const contenders = c.rows.filter((r) => !r.isNota);
        const idx = contenders.findIndex((r) => r.partyKey === party.key);
        return idx < 0 ? null : { cons: c, row: contenders[idx], position: idx + 1, won: idx === 0 && !c.tie };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.row.votes - a.row.votes);
  }, [model.cons, party]);

  return (
    <Section id="parties" title="Party performance" description="Parties ranked by total votes. Seats are derived from candidate-level results (highest-vote candidate per constituency).">
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Party table</h3>
            <SearchBox value={query} onChange={setQuery} label="Search parties" placeholder="Search party…" />
          </div>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#64748B]">No parties match &ldquo;{query}&rdquo;.</p>
          ) : (
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_#E2E8F0]">
                  <tr>
                    <SortTh label="Party" k="label" sort={sort} onSort={toggleSort} />
                    <SortTh label="Votes" k="votes" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Share" k="share" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Seats" k="seats" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Contested" k="contested" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Avg share" k="avgShare" sort={sort} onSort={toggleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.key} className={`border-t border-[#E2E8F0] ${selected === p.key ? "bg-[#F7F9FC]" : ""}`}>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onSelect(selected === p.key ? null : p.key)}
                          aria-pressed={selected === p.key}
                          className="rounded text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C]"
                        >
                          <PartyChip label={p.label} color={p.color} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(p.votes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(model.totalVotes ? (p.votes / model.totalVotes) * 100 : 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.seats}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.contested}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(p.avgShare, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-[#64748B]">
            Share = party votes ÷ all recorded candidate votes, including NOTA. Avg share = mean of the party candidate&apos;s constituency share across distinct constituencies contested. Values are dataset-derived and should be validated against the official election report.
          </p>
        </Panel>

        <Panel className="lg:col-span-2" title="Seats won" note="Click a bar to inspect the party's constituencies.">
          <BarList
            items={model.parties
              .filter((p) => p.seats > 0)
              .sort((a, b) => b.seats - a.seats)
              .slice(0, 10)
              .map((p) => ({
                key: p.key,
                label: p.label,
                value: p.seats,
                pct: model.cons.length ? (p.seats / model.cons.length) * 100 : 0,
                color: p.color,
                detail: `${p.seats} of ${model.cons.length}`,
              }))}
            onSelect={(k) => onSelect(selected === k ? null : k)}
            selectedKey={selected}
          />
        </Panel>
      </div>

      <Panel className="mt-4" title={party ? `${party.label} across constituencies` : "Party footprint"} note={party ? `${footprint.length} constituencies contested · ${party.seats} seats by highest votes` : undefined}>
        {!party ? (
          <p className="py-6 text-center text-sm text-[#64748B]">Select a party from the table or charts to see its constituency-level results.</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_#E2E8F0]">
                <tr className="text-left text-xs uppercase tracking-wide text-[#64748B]">
                  <th className="px-3 py-2 font-semibold">Constituency</th>
                  <th className="px-3 py-2 font-semibold">Candidate</th>
                  <th className="px-3 py-2 text-right font-semibold">Votes</th>
                  <th className="px-3 py-2 text-right font-semibold">Share</th>
                  <th className="px-3 py-2 text-right font-semibold">Position</th>
                </tr>
              </thead>
              <tbody>
                {footprint.map((f) => (
                  <tr key={f.row.id} className="border-t border-[#E2E8F0]">
                    <td className="px-3 py-2">
                      <span className="text-[#64748B]">{f.cons.no}</span> {f.cons.name}
                    </td>
                    <td className="px-3 py-2">{f.row.candidate}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(f.row.votes)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(f.row.share)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${f.won ? "bg-green-50 text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                        {f.won ? "Leading" : `#${f.position}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Section 3 — Constituency explorer                                           */
/* ────────────────────────────────────────────────────────────────────────── */

type ConsSortKey = "no" | "name" | "party" | "winnerVotes" | "runnerVotes" | "margin" | "marginPct" | "turnout";

function consValue(c: Cons, k: ConsSortKey): string | number | null {
  switch (k) {
    case "no": return parseFloat(c.no) || null;
    case "name": return c.name;
    case "party": return c.leader?.party ?? null;
    case "winnerVotes": return c.leader?.votes ?? null;
    case "runnerVotes": return c.runnerUp?.votes ?? null;
    case "margin": return c.margin;
    case "marginPct": return c.marginPct;
    case "turnout": return c.turnout;
  }
}

function ConstituencySection({ model }: { model: Model }) {
  const [query, setQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [sort, setSort] = useState<{ key: ConsSortKey; dir: SortDir }>({ key: "no", dir: "asc" });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const toggleSort = (key: ConsSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" || key === "party" || key === "no" ? "asc" : "desc" }));

  const leadingParties = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of model.cons) if (c.leader) m.set(c.leader.partyKey, c.leader.party);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [model.cons]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return model.cons
      .filter((c) => (!q || c.no.toLowerCase() === q || c.no.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)) && (!partyFilter || c.leader?.partyKey === partyFilter))
      .sort((a, b) => compare(consValue(a, sort.key), consValue(b, sort.key), sort.dir));
  }, [model.cons, query, partyFilter, sort]);

  const selected = model.cons.find((c) => c.key === selectedKey) ?? null;
  const hasTurnout = model.cons.some((c) => c.turnout != null);

  return (
    <Section id="constituencies" title="Constituency analysis" description="Search, sort and open any constituency. Margin = leader votes − runner-up votes (NOTA excluded). Share = votes ÷ constituency votes incl. NOTA.">
      <div className="grid gap-4 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SearchBox value={query} onChange={setQuery} label="Search constituency by number or name" placeholder="Number or name…" />
            <label>
              <span className="sr-only">Filter by leading party</span>
              <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className={FIELD}>
                <option value="">All leading parties</option>
                {leadingParties.map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            <span className="ml-auto text-xs text-[#64748B]">{rows.length} of {model.cons.length}</span>
          </div>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#64748B]">No constituencies match the current filters.</p>
          ) : (
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_#E2E8F0]">
                  <tr>
                    <SortTh label="No." k="no" sort={sort} onSort={toggleSort} />
                    <SortTh label="Constituency" k="name" sort={sort} onSort={toggleSort} />
                    <SortTh label="Leading party" k="party" sort={sort} onSort={toggleSort} />
                    <SortTh label="Winner" k="winnerVotes" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Runner-up" k="runnerVotes" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Margin" k="margin" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Margin %" k="marginPct" sort={sort} onSort={toggleSort} align="right" />
                    {hasTurnout && <SortTh label="Turnout" k="turnout" sort={sort} onSort={toggleSort} align="right" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.key} className={`border-t border-[#E2E8F0] hover:bg-[#F7F9FC] ${selectedKey === c.key ? "bg-[#F7F9FC]" : ""}`}>
                      <td className="px-3 py-2 tabular-nums text-[#64748B]">{c.no}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedKey(c.key)}
                          aria-pressed={selectedKey === c.key}
                          className="rounded text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9B44C]"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {c.leader ? <PartyChip label={c.leader.party} color={c.leader.partyColor} /> : "—"}
                        {c.tie && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-[#D97706]">Tie</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(c.leader?.votes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(c.runnerUp?.votes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(c.margin)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c.marginPct, 1)}</td>
                      {hasTurnout && <td className="px-3 py-2 text-right tabular-nums">{fmtPct(c.turnout, 1)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-2" title={selected ? `${selected.no} · ${selected.name}` : "Constituency detail"} note={selected ? `${fmt(selected.total)} votes recorded${selected.electors ? ` · ${fmt(selected.electors)} electors` : ""}${selected.turnout != null ? ` · turnout ${fmtPct(selected.turnout, 1)}` : ""}` : undefined}>
          {!selected ? (
            <p className="py-10 text-center text-sm text-[#64748B]">Select a constituency name in the table to inspect every candidate&apos;s result.</p>
          ) : (
            <>
              {selected.tie && (
                <p className="mb-3 flex items-center gap-2 rounded bg-amber-50 p-2 text-xs text-[#D97706]">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> The top two candidates have equal votes in this dataset.
                </p>
              )}
              <BarList
                items={selected.rows.map((r) => ({
                  key: r.id,
                  label: r.candidate,
                  value: r.votes,
                  pct: r.share,
                  color: r.partyColor,
                  detail: `${fmt(r.votes)} · ${fmtPct(r.share, 1)}`,
                }))}
              />
              <ul className="mt-3 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] text-xs text-[#64748B]">
                {selected.rows.map((r, i) => (
                  <li key={r.id} className="flex justify-between gap-2 py-1.5">
                    <span>{i + 1}. {r.candidate}</span>
                    <span>{r.party}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </Section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Section 4 — Candidate results                                               */
/* ────────────────────────────────────────────────────────────────────────── */

type CandSortKey = "candidate" | "party" | "cons" | "votes" | "share";
const PAGE_SIZE = 25;

function CandidateSection({ model }: { model: Model }) {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("");
  const [consKey, setConsKey] = useState("");
  const [sort, setSort] = useState<{ key: CandSortKey; dir: SortDir }>({ key: "votes", dir: "desc" });
  const [page, setPage] = useState(1);

  const partyOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of model.rows) m.set(r.partyKey, r.party);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [model.rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const val = (r: Row): string | number =>
      sort.key === "candidate" ? r.candidate : sort.key === "party" ? r.party : sort.key === "cons" ? r.consName : sort.key === "votes" ? r.votes : r.share;
    return model.rows
      .filter((r) => (!q || r.candidate.toLowerCase().includes(q)) && (!party || r.partyKey === party) && (!consKey || r.consKey === consKey))
      .sort((a, b) => compare(val(a), val(b), sort.dir));
  }, [model.rows, query, party, consKey, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: CandSortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "votes" || key === "share" ? "desc" : "asc" }));
    setPage(1);
  };
  const reset = () => {
    setQuery("");
    setParty("");
    setConsKey("");
    setPage(1);
  };
  const filtersActive = !!(query || party || consKey);

  return (
    <Section id="candidates" title="Candidate results" description="Every candidate record, including NOTA. Share = votes ÷ constituency votes incl. NOTA; source % is shown where the dataset provides it.">
      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} label="Search candidate name" placeholder="Candidate name…" />
          <label>
            <span className="sr-only">Filter by party</span>
            <select value={party} onChange={(e) => { setParty(e.target.value); setPage(1); }} className={`${FIELD} max-w-[12rem]`}>
              <option value="">All parties</option>
              {partyOptions.map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by constituency</span>
            <select value={consKey} onChange={(e) => { setConsKey(e.target.value); setPage(1); }} className={`${FIELD} max-w-[14rem]`}>
              <option value="">All constituencies</option>
              {model.cons.map((c) => (
                <option key={c.key} value={c.key}>{c.no} · {c.name}</option>
              ))}
            </select>
          </label>
          {filtersActive && (
            <button type="button" onClick={reset} className={BTN}>Clear filters</button>
          )}
          <span className="ml-auto text-xs text-[#64748B]" aria-live="polite">{fmt(filtered.length)} records</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#64748B]">No candidates match the current filters.</p>
            <button type="button" onClick={reset} className={`${BTN} mt-3`}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="shadow-[0_1px_0_#E2E8F0]">
                  <tr>
                    <SortTh label="Candidate" k="candidate" sort={sort} onSort={toggleSort} />
                    <SortTh label="Party" k="party" sort={sort} onSort={toggleSort} />
                    <SortTh label="Constituency" k="cons" sort={sort} onSort={toggleSort} />
                    <SortTh label="Votes" k="votes" sort={sort} onSort={toggleSort} align="right" />
                    <SortTh label="Share" k="share" sort={sort} onSort={toggleSort} align="right" />
                    <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-[#64748B]">Source %</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id} className="border-t border-[#E2E8F0] hover:bg-[#F7F9FC]">
                      <td className="px-3 py-2 font-medium">{r.candidate}</td>
                      <td className="px-3 py-2"><PartyChip label={r.party} color={r.partyColor} /></td>
                      <td className="px-3 py-2"><span className="text-[#64748B]">{r.consNo}</span> {r.consName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(r.votes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(r.share)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#64748B]">{fmtPct(r.sourcePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav aria-label="Candidate pagination" className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-[#64748B]">
                {fmt((safePage - 1) * PAGE_SIZE + 1)}–{fmt(Math.min(safePage * PAGE_SIZE, filtered.length))} of {fmt(filtered.length)}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className={BTN} onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
                </button>
                <span className="text-sm tabular-nums">Page {safePage} / {pages}</span>
                <button type="button" className={BTN} onClick={() => setPage(safePage + 1)} disabled={safePage >= pages} aria-label="Next page">
                  Next <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </nav>
          </>
        )}
      </Panel>
    </Section>
  );
}