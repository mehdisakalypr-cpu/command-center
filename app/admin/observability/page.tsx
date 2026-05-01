import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Observabilité portfolio — Command Center",
  description: "Ki Sense : couverture des protocoles transverses (pre-push 4-layer / watermark / bespoke démo / HTTPS) sur tous les SaaS portfolio.",
};

type Row = {
  slug: string;
  has_pre_push_hook: boolean;
  pre_push_layers: number;
  has_watermark: boolean;
  demo_lines: number;
  demo_bespoke: boolean;
  https_status: string;
  score: number;
  captured_at: string;
};

async function loadLatestCoverage(): Promise<{ rows: Row[]; capturedAt: string | null }> {
  const sb = createSupabaseAdmin();
  // Get the most recent captured_at then fetch all rows from that batch
  const { data: latest } = await sb
    .from("portfolio_coverage")
    .select("captured_at")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.captured_at) return { rows: [], capturedAt: null };
  const { data: rows } = await sb
    .from("portfolio_coverage")
    .select("slug,has_pre_push_hook,pre_push_layers,has_watermark,demo_lines,demo_bespoke,https_status,score,captured_at")
    .eq("captured_at", latest.captured_at)
    .order("score", { ascending: true });
  return { rows: (rows as Row[] | null) ?? [], capturedAt: latest.captured_at };
}

export default async function ObservabilityPage() {
  const { rows, capturedAt } = await loadLatestCoverage();
  const total = rows.length;
  const healthy = rows.filter((r) => r.score >= 4).length;
  const coveragePct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const summary = { timestamp: capturedAt ?? undefined, total, healthy, coverage_pct: coveragePct };
  const sortedRows = [...rows].sort((a, b) => a.score - b.score || a.slug.localeCompare(b.slug));

  return (
    <main style={{ padding: "32px 24px", maxWidth: 1280, margin: "0 auto", color: "#F8FAFC" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ fontSize: 13, color: "#A78BFA", textDecoration: "none" }}>← Admin</Link>
      </div>

      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#A78BFA", marginBottom: 8 }}>
          Observabilité — Ki Sense
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 6px" }}>Couverture portfolio</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: 0 }}>
          Audit /root/monitor/portfolio-coverage-audit.sh · 5 critères : pre-push hook · 4 layers · watermark · démo bespoke · HTTPS live.
          {summary.timestamp ? ` Dernier audit : ${new Date(summary.timestamp).toLocaleString("fr-FR")}.` : " Aucun audit encore exécuté."}
        </p>
      </header>

      {summary.total ? (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
          <Stat label="SaaS audités" value={String(summary.total)} sub="repos /var/www/* avec .git + app/" color="#A78BFA" />
          <Stat label="Healthy (≥4/5)" value={String(summary.healthy ?? 0)} sub="conformes aux 4-5 protocoles" color="#10B981" />
          <Stat label="Drifts" value={String((summary.total ?? 0) - (summary.healthy ?? 0))} sub="à remettre en conformité" color="#EF4444" />
          <Stat label="Couverture" value={`${summary.coverage_pct ?? 0}%`} sub="ratio healthy / total" color="#06B6D4" />
        </section>
      ) : (
        <section style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: 18, marginBottom: 24, fontSize: 14 }}>
          ⚠️ Pas encore d&apos;audit exécuté. Lancer manuellement : <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 4 }}>bash /root/monitor/portfolio-coverage-audit.sh</code>
          {" "}— ou attendre le cron quotidien 6:30 UTC.
        </section>
      )}

      <section style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(124,58,237,0.12)" }}>
                <th style={th}>Slug</th>
                <th style={{ ...th, textAlign: "center" }}>Score</th>
                <th style={{ ...th, textAlign: "center" }}>Hook</th>
                <th style={{ ...th, textAlign: "center" }}>Layers</th>
                <th style={{ ...th, textAlign: "center" }}>Watermark</th>
                <th style={{ ...th, textAlign: "center" }}>Lines</th>
                <th style={{ ...th, textAlign: "center" }}>Bespoke</th>
                <th style={{ ...th, textAlign: "center" }}>HTTPS</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => (
                <tr key={r.slug} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", background: r.score >= 4 ? "rgba(16,185,129,0.04)" : r.score === 3 ? "rgba(245,158,11,0.04)" : "rgba(239,68,68,0.04)" }}>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <a href={`https://${r.slug}.gapup.io`} target="_blank" rel="noreferrer" style={{ color: "#06B6D4", textDecoration: "none" }}>
                      {r.slug}
                    </a>
                  </td>
                  <td style={{ ...td, textAlign: "center", fontWeight: 800, color: r.score >= 4 ? "#10B981" : r.score === 3 ? "#F59E0B" : "#EF4444" }}>
                    {r.score}/5
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>{r.has_pre_push_hook ? "✓" : "✗"}</td>
                  <td style={{ ...td, textAlign: "center" }}>{r.pre_push_layers}/4</td>
                  <td style={{ ...td, textAlign: "center" }}>{r.has_watermark ? "✓" : "—"}</td>
                  <td style={{ ...td, textAlign: "center", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{r.demo_lines}</td>
                  <td style={{ ...td, textAlign: "center" }}>{r.demo_bespoke ? "✓" : "—"}</td>
                  <td style={{ ...td, textAlign: "center", fontFamily: "ui-monospace, monospace", fontSize: 12, color: r.https_status === "200" ? "#10B981" : "#EF4444" }}>
                    {r.https_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 24, padding: 18, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
        💡 <strong>Gradient amélioration auto</strong> : la queue
        {" "}<code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 3 }}>/root/monitor/bespoke-demo-queue.txt</code>{" "}
        alimente le cron <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 3 }}>bespoke-demo-generator.sh</code>{" "}
        */20min — chaque slug drainé devient automatiquement +2 points (watermark + bespoke). Le score moyen monte sans intervention.
      </section>
    </main>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}40`, borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{sub}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "#A78BFA", textTransform: "uppercase", letterSpacing: 0.6 };
const td: React.CSSProperties = { padding: "10px 14px", color: "rgba(255,255,255,0.85)" };
