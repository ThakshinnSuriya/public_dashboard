"use client";

import { Loader2, Pencil, Save, UserRound, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

// ======================================================================
// Types
// ======================================================================

type OrganizationType =
  | "independent"
  | "political_party"
  | "company"
  | "education"
  | "other";

type UserType =
  | "mla"
  | "mp"
  | "mayor"
  | "councillor"
  | "corporator"
  | "party_chief"
  | "analyst";

type Constituency = {
  id: number;
  name: string;
  state: string;
  type: string;
};

/** GET /api/profile/ and PUT /api/profile/ response. */
type Profile = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone_number: string;
  user_type: UserType | "";
  organization_type: OrganizationType | "";
  organization_name: string;
  designation: string;
  constituencies: Constituency[];
  active_constituency: Constituency | null;
  is_completed: boolean;
};

/** Editable draft held in the form. Never mutated until the user saves. */
type ProfileForm = {
  full_name: string;
  phone_number: string;
  user_type: UserType | "";
  organization_type: OrganizationType | "";
  organization_name: string;
  designation: string;
  constituencies: Constituency[];
  active_constituency: Constituency | null;
};

/** PUT /api/profile/ request body. */
type ProfilePayload = {
  full_name: string;
  phone_number: string;
  user_type: UserType;
  organization_type: OrganizationType;
  organization_name: string;
  designation: string;
  constituency_ids: number[];
  active_constituency_id: number | null;
};

type FieldName =
  | "full_name"
  | "phone_number"
  | "organization_type"
  | "user_type"
  | "organization_name"
  | "designation"
  | "constituencies"
  | "active_constituency";

type FieldErrors = Partial<Record<FieldName, string>>;

// ======================================================================
// Business rules (must match the backend rules)
// ======================================================================

/**
 * Profile business rules (frontend mirror of backend core/profile_rules.py).
 * Pure functions only: no React, no network.
 */

type Option<T extends string> = { value: T; label: string };

const ORGANIZATION_TYPES: Option<OrganizationType>[] = [
  { value: "independent", label: "Independent Researcher" },
  { value: "political_party", label: "Political Party" },
  { value: "company", label: "Company / Agency" },
  { value: "education", label: "Educational Institution" },
  { value: "other", label: "Other" },
];

// const POLITICAL_PARTY_USER_TYPES: Option<UserType>[] = [
//   { value: "mla", label: "MLA" },
//   { value: "mp", label: "MP" },
//   { value: "mayor", label: "Mayor" },
//   { value: "councillor", label: "Councillor" },
//   { value: "corporator", label: "Corporator" },
//   { value: "party_chief", label: "Party Chief" },
//   { value: "analyst", label: "Political Analyst" },
// ];
const POLITICAL_PARTY_USER_TYPES: Option<UserType>[] = [
  { value: "mla", label: "MLA" },

  { value: "party_chief", label: "Party Chief" },
  { value: "analyst", label: "Political Analyst" },
];

const OTHER_ORGANIZATION_USER_TYPES: Option<UserType>[] = [
  { value: "analyst", label: "Political Analyst" },
];

const MULTI_CONSTITUENCY_USER_TYPES: UserType[] = ["party_chief", "analyst"];

function userTypeLabel(value: string): string {
  return (
    POLITICAL_PARTY_USER_TYPES.find((o) => o.value === value)?.label ?? ""
  );
}

function organizationTypeLabel(value: string): string {
  return ORGANIZATION_TYPES.find((o) => o.value === value)?.label ?? "";
}

/** User types selectable for an organization type ([] until one is chosen). */
function allowedUserTypes(
  organizationType: OrganizationType | ""
): Option<UserType>[] {
  if (!organizationType) return [];
  return organizationType === "political_party"
    ? POLITICAL_PARTY_USER_TYPES
    : OTHER_ORGANIZATION_USER_TYPES;
}

function isUserTypeAllowed(
  organizationType: OrganizationType | "",
  userType: UserType | ""
): boolean {
  return allowedUserTypes(organizationType).some((o) => o.value === userType);
}

function allowsMultipleConstituencies(userType: UserType | ""): boolean {
  return userType !== "" && MULTI_CONSTITUENCY_USER_TYPES.includes(userType);
}

// ---------------------------------------------------------------- conversion

function emptyForm(): ProfileForm {
  return {
    full_name: "",
    phone_number: "",
    user_type: "",
    organization_type: "",
    organization_name: "",
    designation: "",
    constituencies: [],
    active_constituency: null,
  };
}

/** Defensive: guarantees the shape the UI relies on even if the API omits something. */
function normalizeProfile(raw: unknown): Profile {
  const r = (raw ?? {}) as Partial<Profile>;
  const constituencies = Array.isArray(r.constituencies) ? r.constituencies : [];
  return {
    id: Number(r.id ?? 0),
    username: r.username ?? "",
    email: r.email ?? "",
    full_name: r.full_name ?? "",
    phone_number: r.phone_number ?? "",
    user_type: r.user_type ?? "",
    organization_type: r.organization_type ?? "",
    organization_name: r.organization_name ?? "",
    designation: r.designation ?? "",
    constituencies,
    active_constituency: r.active_constituency ?? null,
    is_completed: Boolean(r.is_completed),
  };
}

function toForm(profile: Profile): ProfileForm {
  // A stored user type that is not valid for the stored organization type
  // (e.g. a brand-new profile that still has the model default) is shown as unset.
  const userType = isUserTypeAllowed(profile.organization_type, profile.user_type)
    ? profile.user_type
    : "";
  return normalizeSelection({
    full_name: profile.full_name,
    phone_number: profile.phone_number,
    user_type: userType,
    organization_type: profile.organization_type,
    organization_name: profile.organization_name,
    designation: profile.designation,
    constituencies: profile.constituencies,
    active_constituency: profile.active_constituency,
  });
}

function toPayload(form: ProfileForm): ProfilePayload {
  return {
    full_name: form.full_name.trim(),
    phone_number: form.phone_number.trim(),
    user_type: form.user_type as UserType,
    organization_type: form.organization_type as OrganizationType,
    organization_name: form.organization_name.trim(),
    designation: form.designation.trim(),
    constituency_ids: form.constituencies.map((c) => c.id),
    active_constituency_id: form.active_constituency?.id ?? null,
  };
}

// ------------------------------------------------- constituency invariants

/**
 * Restores the invariants after any change:
 *  - single-constituency roles hold at most one constituency, and it is the active one
 *  - multi roles: active is one of the assigned ones, else the first, else null
 */
function normalizeSelection(form: ProfileForm): ProfileForm {
  const list = form.constituencies;
  const activeStillAssigned = list.some(
    (c) => c.id === form.active_constituency?.id
  );
  const activeInList = activeStillAssigned
    ? list.find((c) => c.id === form.active_constituency?.id)!
    : null;

  const isSingleRole = form.user_type !== "" && !allowsMultipleConstituencies(form.user_type);

  if (isSingleRole) {
    const kept = activeInList ?? list[0] ?? null;
    return {
      ...form,
      constituencies: kept ? [kept] : [],
      active_constituency: kept,
    };
  }
  return { ...form, active_constituency: activeInList ?? list[0] ?? null };
}

type Transition = { form: ProfileForm; notice: string | null };

function changeOrganizationType(
  form: ProfileForm,
  organizationType: OrganizationType | ""
): Transition {
  const next: ProfileForm = { ...form, organization_type: organizationType };
  const options = allowedUserTypes(organizationType);

  if (form.user_type === "" ) {
    // Nothing to lose: if there is only one possible role, pick it.
    if (options.length === 1) next.user_type = options[0].value;
    return { form: normalizeSelection(next), notice: null };
  }

  if (isUserTypeAllowed(organizationType, form.user_type)) {
    return { form: normalizeSelection(next), notice: null };
  }

  next.user_type = "";
  return {
    form: normalizeSelection(next),
    notice: `User type was reset because "${userTypeLabel(
      form.user_type
    )}" is not available for this organization type. Choose a user type to continue.`,
  };
}

function changeUserType(
  form: ProfileForm,
  userType: UserType | ""
): Transition {
  const next = normalizeSelection({ ...form, user_type: userType });
  let notice: string | null = null;

  if (next.constituencies.length < form.constituencies.length) {
    const dropped = form.constituencies.length - next.constituencies.length;
    notice = `${userTypeLabel(userType)} can have only one constituency. Kept ${
      next.constituencies[0]?.name
    } and removed ${dropped} other${dropped > 1 ? "s" : ""} from this draft. Cancel to restore them.`;
  }
  return { form: next, notice };
}

function addConstituency(
  form: ProfileForm,
  constituency: Constituency
): ProfileForm {
  if (form.constituencies.some((c) => c.id === constituency.id)) return form;

  if (allowsMultipleConstituencies(form.user_type)) {
    return normalizeSelection({
      ...form,
      constituencies: [...form.constituencies, constituency],
    });
  }
  // Single-constituency roles: the new choice replaces the old one.
  return {
    ...form,
    constituencies: [constituency],
    active_constituency: constituency,
  };
}

function removeConstituency(form: ProfileForm, id: number): ProfileForm {
  return normalizeSelection({
    ...form,
    constituencies: form.constituencies.filter((c) => c.id !== id),
  });
}

function setActiveConstituency(form: ProfileForm, id: number): ProfileForm {
  const match = form.constituencies.find((c) => c.id === id);
  return match ? { ...form, active_constituency: match } : form;
}

// ---------------------------------------------------------------- validation

const PHONE_CHARS = /^\+?[0-9\s-]+$/;

function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!PHONE_CHARS.test(v)) return false;
  const digits = v.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

function validateForm(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.full_name.trim()) errors.full_name = "Enter your full name.";

  if (!form.phone_number.trim()) {
    errors.phone_number = "Enter your phone number.";
  } else if (!isValidPhone(form.phone_number)) {
    errors.phone_number =
      "Enter a valid phone number (7-15 digits; a leading + is allowed).";
  }

  if (!form.organization_type) {
    errors.organization_type = "Select an organization type.";
  }

  if (!form.user_type) {
    errors.user_type = form.organization_type
      ? "Select a user type."
      : "Select an organization type first.";
  } else if (!isUserTypeAllowed(form.organization_type, form.user_type)) {
    errors.user_type = "This user type is not available for the organization type.";
  }

  if (form.user_type) {
    const count = form.constituencies.length;
    if (allowsMultipleConstituencies(form.user_type)) {
      if (count < 1) errors.constituencies = "Select at least one constituency.";
    } else if (count !== 1) {
      errors.constituencies = `${userTypeLabel(form.user_type)} must have exactly one constituency.`;
    }
    if (
      count > 0 &&
      !form.constituencies.some((c) => c.id === form.active_constituency?.id)
    ) {
      errors.active_constituency =
        "Active constituency must be one of the assigned constituencies.";
    }
  } else if (form.constituencies.length === 0) {
    errors.constituencies = "Select at least one constituency.";
  }

  return errors;
}

// ======================================================================
// API client (DRF token auth)
// ======================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const TOKEN_KEY = "authToken";

class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;

  constructor(message: string, status = 0, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** DRF field names -> the names the form uses. */
const FIELD_MAP: Record<string, FieldName> = {
  full_name: "full_name",
  phone_number: "phone_number",
  organization_type: "organization_type",
  user_type: "user_type",
  organization_name: "organization_name",
  designation: "designation",
  constituency_ids: "constituencies",
  active_constituency_id: "active_constituency",
};

function asText(value: unknown): string {
  return Array.isArray(value) ? value.map(String).join(" ") : String(value);
}

function buildError(status: number, body: unknown): ApiError {
  if (status === 401) {
    return new ApiError("Your session has expired. Please log in again.", status);
  }
  if (status >= 500) {
    return new ApiError("The server hit an error. Your changes were not saved. Try again.", status);
  }

  const fieldErrors: FieldErrors = {};
  let message = "";

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.detail === "string") message = data.detail;
    else if (typeof data.error === "string") message = data.error;

    for (const [key, value] of Object.entries(data)) {
      const field = FIELD_MAP[key];
      if (field) fieldErrors[field] = asText(value);
      else if (key === "non_field_errors") message = asText(value);
    }
  }

  if (!message) {
    message = Object.keys(fieldErrors).length
      ? "Some fields need your attention."
      : "Something went wrong. Please try again.";
  }
  return new ApiError(message, status, fieldErrors);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) {
    throw new ApiError("You are not logged in. Please log in again.", 401);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Token ${token}`,
        ...init.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the server. Check your connection and try again.");
  }

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) throw buildError(response.status, body);
  return body as T;
}

async function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  return normalizeProfile(await request<unknown>("/profile/", { signal }));
}

async function saveProfile(payload: ProfilePayload): Promise<Profile> {
  return normalizeProfile(
    await request<unknown>("/profile/", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  );
}

async function searchConstituencies(
  query: string,
  signal?: AbortSignal
): Promise<Constituency[]> {
  const data = await request<unknown>(
    `/constituencies/search/?search=${encodeURIComponent(query)}`,
    { signal }
  );
  // Accept a plain array or a DRF-paginated { results: [] } response.
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: unknown[] }).results
      : null;
  if (!list) throw new ApiError("Unexpected response from constituency search.");
  return list as Constituency[];
}

// ======================================================================
// Constituency autocomplete
// ======================================================================

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

type SearchResult = { query: string; items: Constituency[]; error: string | null };

type Props = {
  selected: Constituency[];
  multiple: boolean;
  /** When set, the input is disabled and this text explains why. */
  disabledReason?: string;
  error?: string;
  inputClass: string;
  onAdd: (constituency: Constituency) => void;
  onRemove: (id: number) => void;
};

function ConstituencyPicker({
  selected,
  multiple,
  disabledReason,
  error,
  inputClass,
  onAdd,
  onRemove,
}: Props) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  // The latest completed search. It is only ever shown while its `query` still
  // equals what is typed, so results from an older query can never appear.
  const [result, setResult] = useState<SearchResult | null>(null);

  const trimmed = query.trim();
  const searchable = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const items = await searchConstituencies(trimmed, controller.signal);
        if (controller.signal.aborted) return;
        setResult({ query: trimmed, items, error: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        setResult({
          query: trimmed,
          items: [],
          error: err instanceof Error ? err.message : "Unable to search constituencies.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, retryCount]);

  const current = searchable && result?.query === trimmed ? result : null;
  const status: "idle" | "loading" | "error" | "empty" | "results" = !searchable
    ? "idle"
    : !current
      ? "loading"
      : current.error
        ? "error"
        : current.items.length === 0
          ? "empty"
          : "results";

  const items = current?.items ?? [];
  const activeIndex = items.length ? Math.min(highlight, items.length - 1) : -1;
  const isSelected = (id: number) => selected.some((c) => c.id === id);

  function choose(constituency: Constituency) {
    if (isSelected(constituency.id)) return;
    onAdd(constituency);
    setQuery("");
    setResult(null);
    setOpen(false);
    setHighlight(0);
  }

  function retry() {
    setResult(null);
    setRetryCount((n) => n + 1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setHighlight((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && status === "results") {
      e.preventDefault(); // never submit the profile form from the search box
      if (activeIndex >= 0) choose(items[activeIndex]);
    }
  }

  const showPanel = open && !disabledReason && (status !== "idle" || trimmed.length === 1);

  return (
    <div>
      <label htmlFor={`${uid}-input`} className="text-sm font-medium text-slate-700">
        Constituency <span className="text-red-500">*</span>
      </label>
      <p className="mt-0.5 text-xs text-slate-500" id={`${uid}-hint`}>
        {multiple
          ? "Search by name and add as many constituencies as you need."
          : "Search by name. Choosing another constituency replaces the current one."}
      </p>

      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <input
          id={`${uid}-input`}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-describedby={`${uid}-hint`}
          aria-invalid={Boolean(error)}
          aria-activedescendant={
            showPanel && activeIndex >= 0 ? `${uid}-opt-${items[activeIndex].id}` : undefined
          }
          autoComplete="off"
          disabled={Boolean(disabledReason)}
          value={query}
          placeholder={disabledReason ?? "Search constituency name..."}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
        />

        {showPanel && (
          <div
            // Keep focus in the input while clicking inside the panel.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {status === "idle" && (
              <p className="px-3 py-2.5 text-sm text-slate-500">
                Type at least {MIN_QUERY_LENGTH} letters to search.
              </p>
            )}

            {status === "loading" && (
              <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500" role="status">
                <Loader2 size={14} className="animate-spin" />
                Searching constituencies...
              </p>
            )}

            {status === "error" && (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm" role="alert">
                <span className="text-red-600">{current?.error}</span>
                <button
                  type="button"
                  onClick={retry}
                  className="shrink-0 rounded-md px-2 py-1 font-medium text-[#1B4332] hover:bg-green-50"
                >
                  Try again
                </button>
              </div>
            )}

            {status === "empty" && (
              <p className="px-3 py-2.5 text-sm text-slate-500" role="status">
                No constituency matches &ldquo;{trimmed}&rdquo;. Check the spelling or try fewer letters.
              </p>
            )}

            {status === "results" && (
              <ul id={listboxId} role="listbox" aria-label="Matching constituencies">
                {items.map((c, index) => {
                  const picked = isSelected(c.id);
                  return (
                    <li
                      key={c.id}
                      id={`${uid}-opt-${c.id}`}
                      role="option"
                      aria-selected={picked}
                      aria-disabled={picked}
                      onClick={() => choose(c)}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-3 py-2.5 text-sm last:border-0 ${
                        picked ? "cursor-not-allowed opacity-50" : ""
                      } ${index === activeIndex && !picked ? "bg-green-50" : ""}`}
                    >
                      <span>
                        <span className="font-medium text-slate-800">{c.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{c.state}</span>
                      </span>
                      {picked && <span className="text-xs text-green-700">Selected</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected constituencies">
          {selected.map((c) => (
            <li
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-50 py-1 pl-3 pr-1.5 text-xs font-medium text-[#1B4332]"
              title={c.state}
            >
              {c.name}
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                aria-label={`Remove ${c.name}`}
                className="rounded-full p-1 transition hover:bg-green-100 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1B4332]"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ======================================================================
// Profile section
// ======================================================================

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 aria-[invalid=true]:border-red-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ReadOnlyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

const NOT_PROVIDED = <span className="font-normal text-slate-400">Not provided</span>;

function ProfileSection() {
  const uid = useId();
  const [saved, setSaved] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");

  // Load the saved profile (and again whenever the user presses "Try again").
  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller.signal)
      .then((profile) => {
        setSaved(profile);
        setForm(toForm(profile));
        setEditing(!profile.is_completed);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : "Unable to load your profile.");
        setStatus("error");
      });
    return () => controller.abort();
  }, [reloadKey]);

  function retryLoad() {
    setStatus("loading");
    setLoadError("");
    setReloadKey((n) => n + 1);
  }

  function clearFieldError(...names: FieldName[]) {
    setFieldErrors((prev) => {
      if (!names.some((n) => prev[n])) return prev;
      const next = { ...prev };
      names.forEach((n) => delete next[n]);
      return next;
    });
  }

  function setText(
    field: "full_name" | "phone_number" | "organization_name" | "designation",
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  }

  function onOrganizationTypeChange(value: string) {
    const result = changeOrganizationType(form, value as OrganizationType | "");
    setForm(result.form);
    setNotice(result.notice ?? "");
    clearFieldError("organization_type", "user_type", "constituencies", "active_constituency");
  }

  function onUserTypeChange(value: string) {
    const result = changeUserType(form, value as UserType | "");
    setForm(result.form);
    setNotice(result.notice ?? "");
    clearFieldError("user_type", "constituencies", "active_constituency");
  }

  function startEditing() {
    if (!saved) return;
    setForm(toForm(saved));
    setEditing(true);
    setSuccess("");
    setSaveError("");
    setFieldErrors({});
    setNotice("");
  }

  function cancelEditing() {
    if (!saved) return;
    setForm(toForm(saved)); // discard every unsaved change
    setEditing(false);
    setSaveError("");
    setFieldErrors({});
    setNotice("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSuccess("");
    setSaveError("");

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveError("Fix the highlighted fields and save again.");
      return;
    }

    setSaving(true);
    try {
      const profile = await saveProfile(toPayload(form));
      setSaved(profile);
      setForm(toForm(profile));
      setEditing(false);
      setNotice("");
      setSuccess("Profile saved.");
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setSaveError(err.message);
      } else {
        setSaveError("Unable to save your profile. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const userTypeOptions = allowedUserTypes(form.organization_type);
  const multiple = allowsMultipleConstituencies(form.user_type);
  const heading = (
    <h2 id={`${uid}-heading`} className="text-base font-semibold text-slate-800">
      My Profile
    </h2>
  );

  // ------------------------------------------------------------ loading / error
  if (status === "loading") {
    return (
      <section aria-labelledby={`${uid}-heading`} className="space-y-3">
        {heading}
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500 shadow-sm" role="status">
          <Loader2 size={18} className="animate-spin" />
          Loading profile...
        </div>
      </section>
    );
  }

  if (status === "error" || !saved) {
    return (
      <section aria-labelledby={`${uid}-heading`} className="space-y-3">
        {heading}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" role="alert">
          <p className="text-sm text-red-600">{loadError || "Unable to load your profile."}</p>
          <button
            type="button"
            onClick={retryLoad}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-[#1B4332] hover:bg-green-50"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  // ------------------------------------------------------------------- ready
  const err = fieldErrors;

  return (
    <section aria-labelledby={`${uid}-heading`} className="space-y-3">
      {heading}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1B4332]/10 text-[#1B4332]">
              <UserRound size={24} />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                Welcome, {saved.username}
              </p>
              <p className="truncate text-xs text-slate-500">{saved.email}</p>
            </div>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#1B4332] transition hover:bg-green-50"
            >
              <Pencil size={15} />
              Edit profile
            </button>
          )}
        </div>

        {success && (
          <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">
            {success}
          </p>
        )}
        {saveError && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}
        {notice && editing && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="status">
            {notice}
          </p>
        )}

        {editing ? (
          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
            {!saved.is_completed && (
              <p className="text-sm text-slate-500">
                Complete your profile to personalise your dashboard.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full name" htmlFor={`${uid}-full_name`} required error={err.full_name}>
                <input
                  id={`${uid}-full_name`}
                  maxLength={150}
                  value={form.full_name}
                  onChange={(e) => setText("full_name", e.target.value)}
                  placeholder="Enter your full name"
                  aria-invalid={Boolean(err.full_name)}
                  aria-describedby={err.full_name ? `${uid}-full_name-error` : undefined}
                  className={inputClass}
                />
              </Field>

              <Field label="Phone number" htmlFor={`${uid}-phone`} required error={err.phone_number}>
                <input
                  id={`${uid}-phone`}
                  type="tel"
                  inputMode="tel"
                  maxLength={20}
                  value={form.phone_number}
                  onChange={(e) => setText("phone_number", e.target.value)}
                  placeholder="Enter your phone number"
                  aria-invalid={Boolean(err.phone_number)}
                  aria-describedby={err.phone_number ? `${uid}-phone-error` : undefined}
                  className={inputClass}
                />
              </Field>

              <Field label="Organization type" htmlFor={`${uid}-org_type`} required error={err.organization_type}>
                <select
                  id={`${uid}-org_type`}
                  value={form.organization_type}
                  onChange={(e) => onOrganizationTypeChange(e.target.value)}
                  aria-invalid={Boolean(err.organization_type)}
                  className={inputClass}
                >
                  <option value="">Select organization type</option>
                  {ORGANIZATION_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="User type" htmlFor={`${uid}-user_type`} required error={err.user_type}>
                <select
                  id={`${uid}-user_type`}
                  value={form.user_type}
                  disabled={!form.organization_type}
                  onChange={(e) => onUserTypeChange(e.target.value)}
                  aria-invalid={Boolean(err.user_type)}
                  className={inputClass}
                >
                  <option value="">
                    {form.organization_type ? "Select user type" : "Select organization type first"}
                  </option>
                  {userTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Organization name" htmlFor={`${uid}-org_name`} error={err.organization_name}>
                <input
                  id={`${uid}-org_name`}
                  maxLength={200}
                  value={form.organization_name}
                  onChange={(e) => setText("organization_name", e.target.value)}
                  placeholder="Enter organization name"
                  className={inputClass}
                />
              </Field>

              <Field label="Designation" htmlFor={`${uid}-designation`} error={err.designation}>
                <input
                  id={`${uid}-designation`}
                  maxLength={100}
                  value={form.designation}
                  onChange={(e) => setText("designation", e.target.value)}
                  placeholder="Enter your designation"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={multiple ? "" : "md:col-span-2"}>
                <ConstituencyPicker
                  selected={form.constituencies}
                  multiple={multiple}
                  disabledReason={form.user_type ? undefined : "Select a user type first"}
                  error={err.constituencies}
                  inputClass={inputClass}
                  onAdd={(c) => {
                    setForm((prev) => addConstituency(prev, c));
                    clearFieldError("constituencies", "active_constituency");
                  }}
                  onRemove={(id) => {
                    setForm((prev) => removeConstituency(prev, id));
                    clearFieldError("constituencies", "active_constituency");
                  }}
                />
              </div>

              {multiple && (
                <Field
                  label="Active constituency"
                  htmlFor={`${uid}-active`}
                  error={err.active_constituency}
                  hint="Your dashboard analytics use this constituency."
                >
                  <select
                    id={`${uid}-active`}
                    value={form.active_constituency?.id ?? ""}
                    disabled={form.constituencies.length === 0}
                    onChange={(e) => {
                      setForm((prev) => setActiveConstituency(prev, Number(e.target.value)));
                      clearFieldError("active_constituency");
                    }}
                    className={inputClass}
                  >
                    {form.constituencies.length === 0 && (
                      <option value="">Add a constituency first</option>
                    )}
                    {form.constituencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {!multiple && form.user_type && form.active_constituency && (
              <p className="text-xs text-slate-500">
                {form.active_constituency.name} is your active constituency.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#24563F] disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save profile"}
              </button>

              {saved.is_completed && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X size={16} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyRow label="Full name">{saved.full_name || NOT_PROVIDED}</ReadOnlyRow>
            <ReadOnlyRow label="Username">{saved.username || NOT_PROVIDED}</ReadOnlyRow>
            <ReadOnlyRow label="Email">
              <span className="break-all">{saved.email || NOT_PROVIDED}</span>
            </ReadOnlyRow>
            <ReadOnlyRow label="Phone number">{saved.phone_number || NOT_PROVIDED}</ReadOnlyRow>
            <ReadOnlyRow label="Organization type">
              {organizationTypeLabel(saved.organization_type) || NOT_PROVIDED}
            </ReadOnlyRow>
            <ReadOnlyRow label="Organization name">
              {saved.organization_name || NOT_PROVIDED}
            </ReadOnlyRow>
            <ReadOnlyRow label="User type">
              {userTypeLabel(saved.user_type) || NOT_PROVIDED}
            </ReadOnlyRow>
            <ReadOnlyRow label="Designation">{saved.designation || NOT_PROVIDED}</ReadOnlyRow>
            <ReadOnlyRow label="Active constituency">
              {saved.active_constituency?.name ?? NOT_PROVIDED}
            </ReadOnlyRow>
            <div className="border-b border-slate-100 pb-3 sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-slate-500">Assigned constituencies</dt>
              <dd className="mt-1.5">
                {saved.constituencies.length === 0 ? (
                  NOT_PROVIDED
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {saved.constituencies.map((c) => (
                      <li
                        key={c.id}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          c.id === saved.active_constituency?.id
                            ? "bg-[#1B4332] text-white"
                            : "bg-green-50 text-[#1B4332]"
                        }`}
                        title={c.id === saved.active_constituency?.id ? `${c.state} (active)` : c.state}
                      >
                        {c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}

// ======================================================================
// Dashboard page
// ======================================================================

const dashboardSections = [
  { id: 1, title: "Overview" },
  { id: 2, title: "Analytics" },
  { id: 3, title: "Recent Activity" },
  { id: 4, title: "Quick Access" },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Your workspace at a glance.
        </p>
      </div>

      {/* Profile: full-width section at the top */}
      <ProfileSection />

      {/* Dashboard sections */}
      {dashboardSections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            {section.title}
          </h2>

          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
              section.id === 1 ? "lg:grid-cols-4" : "lg:grid-cols-2"
            }`}
          >
            {/* The profile card used to occupy two of the four Overview slots. */}
            {(section.id === 1 ? [1, 2, 3, 4] : [1, 2]).map((card) => (
              <div
                key={card}
                className="min-h-32 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}