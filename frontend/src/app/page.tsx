
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

      {/* Empty dashboard sections */}
      {dashboardSections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">
            {section.title}
          </h2>

          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
              section.id === 1
                ? "lg:grid-cols-4"
                : "lg:grid-cols-2"
            }`}
          >
            {(section.id === 1
              ? [1, 2, 3, 4]
              : [1, 2]
            ).map((card) => (
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
