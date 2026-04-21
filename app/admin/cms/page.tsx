"use client";

import { useState, useEffect, useCallback } from "react";
import { CMS_SITES, type SiteDef, type CollectionDef, type SlotDef } from "@/lib/cms-collections";

type CmsRow = { id: string; site: string; collection: string; slug: string; field_type: string; value_en: string; value_fr: string; metadata: Record<string, unknown>; order: number; published: boolean; updated_at: string };
type HistoryEntry = { id: string; content_id: string; value_en: string; value_fr: string; changed_at: string };

export default function CmsPage() {
  const [activeSite, setActiveSite] = useState<SiteDef>(CMS_SITES[0]);
  const [activeColl, setActiveColl] = useState<CollectionDef>(CMS_SITES[0].collections[0]);
  const [rows, setRows] = useState<CmsRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { value_en: string; value_fr: string }>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [histSlug, setHistSlug] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const fetchRows = useCallback(async () => {
    const r = await fetch(`/api/admin/cms?site=${activeSite.key}&collection=${activeColl.key}`);
    const d = await r.json();
    if (Array.isArray(d)) setRows(d);
  }, [activeSite.key, activeColl.key]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function getVal(slot: SlotDef, lang: "en" | "fr"): string {
    const d = drafts[slot.slug];
    if (d) return lang === "en" ? d.value_en : d.value_fr;
    const row = rows.find(r => r.slug === slot.slug);
    if (row) return lang === "en" ? row.value_en : row.value_fr;
    return lang === "en" ? slot.default_en : slot.default_fr;
  }

  function isDirty(slug: string): boolean { return !!drafts[slug]; }

  function setDraft(slug: string, lang: "en" | "fr", val: string) {
    setDrafts(prev => {
      const cur = prev[slug] ?? {
        value_en: rows.find(r => r.slug === slug)?.value_en ?? activeColl.slots.find(s => s.slug === slug)?.default_en ?? "",
        value_fr: rows.find(r => r.slug === slug)?.value_fr ?? activeColl.slots.find(s => s.slug === slug)?.default_fr ?? "",
      };
      return { ...prev, [slug]: { ...cur, [lang === "en" ? "value_en" : "value_fr"]: val } };
    });
  }

  async function saveAll() {
    setSaving(true);
    for (const [slug, vals] of Object.entries(drafts)) {
      const slot = activeColl.slots.find(s => s.slug === slug);
      await fetch("/api/admin/cms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: activeSite.key, collection: activeColl.key, slug, field_type: slot?.field_type ?? "text", value_en: vals.value_en, value_fr: vals.value_fr, order: activeColl.slots.findIndex(s => s.slug === slug) }) });
    }
    const n = Object.keys(drafts).length;
    setDrafts({});
    await fetchRows();
    setSaving(false);
    showToast(`${n} entrée(s) publiée(s)`);
  }

  async function saveSingle(slug: string) {
    const vals = drafts[slug]; if (!vals) return;
    const slot = activeColl.slots.find(s => s.slug === slug);
    setSaving(true);
    await fetch("/api/admin/cms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: activeSite.key, collection: activeColl.key, slug, field_type: slot?.field_type ?? "text", value_en: vals.value_en, value_fr: vals.value_fr, order: activeColl.slots.findIndex(s => s.slug === slug) }) });
    setDrafts(prev => { const n = { ...prev }; delete n[slug]; return n; });
    await fetchRows();
    setSaving(false);
    showToast(`"${slot?.label}" publié`);
  }

  async function loadHistory(slug: string) {
    const row = rows.find(r => r.slug === slug);
    if (!row) { setHistory([]); setHistSlug(slug); return; }
    const r = await fetch(`/api/admin/cms/history?content_id=${row.id}`);
    const d = await r.json();
    setHistory(Array.isArray(d) ? d : []);
    setHistSlug(slug);
  }

  async function rollback(hid: string) {
    setSaving(true);
    await fetch("/api/admin/cms/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history_id: hid }) });
    setHistSlug(null); setHistory([]);
    if (histSlug) setDrafts(prev => { const n = { ...prev }; delete n[histSlug]; return n; });
    await fetchRows();
    setSaving(false);
    showToast("Version restaurée");
  }

  async function seedDefaults() {
    setSaving(true);
    for (const slot of activeColl.slots) {
      if (!rows.find(r => r.slug === slot.slug)) {
        await fetch("/api/admin/cms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: activeSite.key, collection: activeColl.key, slug: slot.slug, field_type: slot.field_type, value_en: slot.default_en, value_fr: slot.default_fr, order: activeColl.slots.indexOf(slot) }) });
      }
    }
    await fetchRows();
    setSaving(false);
    showToast("Valeurs par défaut initialisées");
  }

  const hasDirty = Object.keys(drafts).length > 0;

  // ── Styles ──────────────────────────────────────────────────────────────
  const S = {
    toast: { position: "fixed" as const, top: 16, right: isMobile ? 12 : 24, left: isMobile ? 12 : "auto", zIndex: 100, background: "#071425", border: "1px solid rgba(201,168,76,.4)", padding: "10px 18px", fontSize: ".72rem", color: "#C9A84C", boxShadow: "0 4px 24px rgba(0,0,0,.4)", textAlign: "center" as const },
    header: { background: "#071425", borderBottom: "1px solid rgba(201,168,76,.15)", padding: isMobile ? "10px 12px" : "12px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const } as React.CSSProperties,
    title: { fontSize: ".7rem", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#C9A84C", fontWeight: 600 },
    sub: { fontSize: ".6rem", color: "#5A6A7A" },
    // Site tab pill
    siteTab: (active: boolean) => ({
      padding: isMobile ? "10px 14px" : "8px 16px",
      fontSize: ".72rem",
      fontWeight: active ? 600 : 400,
      color: active ? "#C9A84C" : "#9BA8B8",
      background: active ? "rgba(201,168,76,.08)" : "transparent",
      border: active ? "1px solid rgba(201,168,76,.2)" : "1px solid rgba(255,255,255,.06)",
      borderRadius: isMobile ? 20 : 0,
      borderBottom: isMobile ? undefined : "none",
      cursor: "pointer",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap" as const,
      flexShrink: 0,
      minHeight: isMobile ? 44 : "auto",
    } as React.CSSProperties),
    // Collection pill / sidebar button
    collBtn: (active: boolean) => (isMobile ? {
      padding: "8px 14px",
      fontSize: ".72rem",
      color: active ? "#E8E0D0" : "#9BA8B8",
      background: active ? "rgba(255,255,255,.08)" : "transparent",
      border: active ? "1px solid rgba(255,255,255,.12)" : "1px solid rgba(255,255,255,.06)",
      borderRadius: 20,
      cursor: "pointer",
      fontFamily: "inherit",
      whiteSpace: "nowrap" as const,
      flexShrink: 0,
      minHeight: 44,
    } as React.CSSProperties : {
      display: "block",
      width: "100%",
      textAlign: "left" as const,
      padding: "8px 12px",
      fontSize: ".72rem",
      color: active ? "#E8E0D0" : "#9BA8B8",
      background: active ? "rgba(255,255,255,.06)" : "transparent",
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit",
    } as React.CSSProperties),
    card: (dirty: boolean) => ({ background: "#0A1A2E", border: `1px solid ${dirty ? "rgba(201,168,76,.4)" : "rgba(255,255,255,.06)"}`, padding: isMobile ? "12px" : "16px 18px", marginBottom: 10 } as React.CSSProperties),
    input: { width: "100%", padding: isMobile ? "10px 12px" : "8px 10px", background: "#071425", border: "1px solid rgba(255,255,255,.08)", color: "#E8E0D0", fontSize: isMobile ? ".8rem" : ".72rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
    textarea: { width: "100%", padding: isMobile ? "10px 12px" : "8px 10px", background: "#071425", border: "1px solid rgba(255,255,255,.08)", color: "#E8E0D0", fontSize: isMobile ? ".8rem" : ".72rem", fontFamily: "monospace", outline: "none", resize: "vertical" as const, minHeight: 60, boxSizing: "border-box" as const } as React.CSSProperties,
    goldBtn: { padding: isMobile ? "10px 16px" : "6px 14px", minHeight: isMobile ? 44 : "auto", background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.35)", color: "#C9A84C", fontSize: ".62rem", letterSpacing: ".08em", textTransform: "uppercase" as const, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
    smallBtn: { padding: isMobile ? "8px 12px" : "3px 8px", minHeight: isMobile ? 44 : "auto", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)", color: "#9BA8B8", fontSize: isMobile ? ".65rem" : ".58rem", cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
    badge: (color: string) => ({ fontSize: ".56rem", padding: "2px 6px", background: `${color}20`, color, letterSpacing: ".06em" } as React.CSSProperties),
    modal: { position: "fixed" as const, inset: 0, zIndex: 200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 20 },
    modalInner: { background: "#0A1A2E", border: "1px solid rgba(201,168,76,.2)", padding: isMobile ? "16px" : "24px", width: "100%", maxWidth: 500, maxHeight: "70vh", overflow: "auto" } as React.CSSProperties,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "#E8E0D0", fontFamily: "Inter, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', system-ui, sans-serif" }}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>CMS</span>
        <span style={S.sub}>Gestion de contenu multi-sites</span>
        {hasDirty && (
          <button onClick={saveAll} disabled={saving} style={{ ...S.goldBtn, marginLeft: isMobile ? 0 : "auto", ...(isMobile ? { width: "100%", marginTop: 6 } : {}) }}>
            {saving ? "Enregistrement..." : `Publier tout (${Object.keys(drafts).length})`}
          </button>
        )}
      </div>

      {/* Site tabs */}
      <div style={{
        display: "flex",
        gap: isMobile ? 8 : 0,
        borderBottom: isMobile ? "none" : "1px solid rgba(255,255,255,.06)",
        padding: isMobile ? "8px 12px" : "0 0 0 16px",
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling: "touch" as unknown as string,
        flexShrink: 0,
      } as React.CSSProperties}>
        {CMS_SITES.map(site => (
          <button key={site.key} onClick={() => { setActiveSite(site); setActiveColl(site.collections[0]); setDrafts({}); setHistSlug(null); }} style={S.siteTab(activeSite.key === site.key)}>
            <span>{site.icon}</span> {site.label}
          </button>
        ))}
      </div>

      {/* Mobile: collection pills */}
      {isMobile && (
        <div style={{
          display: "flex", gap: 8, padding: "8px 12px",
          overflowX: "auto", WebkitOverflowScrolling: "touch" as unknown as string,
          borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0,
        } as React.CSSProperties}>
          {activeSite.collections.map(c => (
            <button key={c.key} onClick={() => { setActiveColl(c); setDrafts({}); setHistSlug(null); }} style={S.collBtn(activeColl.key === c.key)}>
              {c.label}
              <span style={{ fontSize: ".56rem", color: "#5A6A7A", marginLeft: 4 }}>{c.slots.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main body: sidebar (desktop) + editor */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Collections sidebar — desktop only */}
        {!isMobile && (
          <div style={{ width: 170, borderRight: "1px solid rgba(255,255,255,.06)", padding: "8px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            {activeSite.collections.map(c => (
              <button key={c.key} onClick={() => { setActiveColl(c); setDrafts({}); setHistSlug(null); }} style={S.collBtn(activeColl.key === c.key)}>
                {c.label}
                <span style={{ fontSize: ".56rem", color: "#5A6A7A", marginLeft: 6 }}>{c.slots.length}</span>
              </button>
            ))}
            <div style={{ marginTop: "auto", padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
              <button onClick={seedDefaults} disabled={saving} style={{ ...S.smallBtn, width: "100%", fontSize: ".56rem" }}>
                Initialiser défauts
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px" : "16px 20px" }}>
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 700, color: "#E8E0D0" }}>{activeColl.label}</div>
              <div style={{ fontSize: ".58rem", color: "#5A6A7A" }}>{activeSite.label} · {activeColl.slots.length} champs</div>
            </div>
            {isMobile && (
              <button onClick={seedDefaults} disabled={saving} style={{ ...S.smallBtn, fontSize: ".58rem" }}>
                Initialiser défauts
              </button>
            )}
          </div>

          {activeColl.slots.map(slot => {
            const isPrev = previewSlug === slot.slug;
            return (
              <div key={slot.slug} style={S.card(isDirty(slot.slug))}>
                {/* Slot header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" as const }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 500, color: "#E8E0D0" }}>{slot.label}</span>
                  <span style={S.badge("#5A6A7A")}>{slot.field_type}</span>
                  {isDirty(slot.slug) && <span style={S.badge("#C9A84C")}>modifié</span>}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" as const }}>
                    <button onClick={() => setPreviewSlug(isPrev ? null : slot.slug)} style={S.smallBtn}>{isPrev ? "Fermer" : "Aperçu"}</button>
                    <button onClick={() => loadHistory(slot.slug)} style={S.smallBtn}>Historique</button>
                    {isDirty(slot.slug) && <button onClick={() => saveSingle(slot.slug)} disabled={saving} style={{ ...S.smallBtn, color: "#C9A84C", borderColor: "rgba(201,168,76,.3)" }}>Publier</button>}
                  </div>
                </div>

                {/* Preview */}
                {isPrev && (
                  <div style={{ marginBottom: 10, padding: "10px 12px", background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.08)" }}>
                    <div style={{ fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>Aperçu FR</div>
                    <div style={{ fontSize: ".72rem", color: "#E8E0D0", whiteSpace: "pre-wrap" }}>{getVal(slot, "fr")}</div>
                    <div style={{ fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4, marginTop: 8 }}>Aperçu EN</div>
                    <div style={{ fontSize: ".72rem", color: "#9BA8B8", whiteSpace: "pre-wrap" }}>{getVal(slot, "en")}</div>
                  </div>
                )}

                {/* FR / EN fields */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>FR</div>
                    {slot.field_type === "richtext" || slot.field_type === "json" ? (
                      <textarea value={getVal(slot, "fr")} onChange={e => setDraft(slot.slug, "fr", e.target.value)} style={S.textarea} />
                    ) : (
                      <input type={slot.field_type === "number" ? "number" : "text"} value={getVal(slot, "fr")} onChange={e => setDraft(slot.slug, "fr", e.target.value)} style={S.input} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: ".56rem", color: "#5A6A7A", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>EN</div>
                    {slot.field_type === "richtext" || slot.field_type === "json" ? (
                      <textarea value={getVal(slot, "en")} onChange={e => setDraft(slot.slug, "en", e.target.value)} style={S.textarea} />
                    ) : (
                      <input type={slot.field_type === "number" ? "number" : "text"} value={getVal(slot, "en")} onChange={e => setDraft(slot.slug, "en", e.target.value)} style={S.input} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History modal */}
      {histSlug && (
        <div style={S.modal} onClick={() => setHistSlug(null)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: ".8rem", fontWeight: 700, color: "#E8E0D0" }}>Historique — {activeColl.slots.find(s => s.slug === histSlug)?.label}</span>
              <button onClick={() => setHistSlug(null)} style={{ background: "none", border: "none", color: "#5A6A7A", cursor: "pointer", fontSize: "1.2rem", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: ".72rem", color: "#5A6A7A" }}>Aucun historique pour ce champ.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map(h => (
                  <div key={h.id} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontSize: ".62rem", color: "#5A6A7A" }}>
                        {new Date(h.changed_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button onClick={() => rollback(h.id)} disabled={saving} style={{ ...S.goldBtn, padding: isMobile ? "8px 14px" : "3px 10px", fontSize: ".56rem" }}>Restaurer</button>
                    </div>
                    <div style={{ fontSize: ".62rem", color: "#9BA8B8" }}>
                      <span style={{ color: "#5A6A7A" }}>FR:</span> {h.value_fr?.substring(0, 80)}{(h.value_fr?.length ?? 0) > 80 ? "..." : ""}
                    </div>
                    <div style={{ fontSize: ".62rem", color: "#5A6A7A", marginTop: 2 }}>
                      <span>EN:</span> {h.value_en?.substring(0, 80)}{(h.value_en?.length ?? 0) > 80 ? "..." : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
