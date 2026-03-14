import { useState, useEffect } from "react";
import emailjs from '@emailjs/browser';
const SUPABASE_URL = "https://hsdqjwkilcojzcxzhmco.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZHFqd2tpbGNvanpjeHpobWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDk1MTEsImV4cCI6MjA4ODk4NTUxMX0.AI2yJFvQUqPsZ6AvCfsQVXMRzPtpEU0ikD5S1SSfRsc";

const db = {
  async getAll() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reservations?select=*&order=date,time`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    return r.json();
  },
  async insert(data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/reservations`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async delete(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
  }
};

const TABLES = [
  { id: 1,  seats: 2, minGuests: 1, label: "Makarna Bar 1", zone: "Bar" },
  { id: 2,  seats: 2, minGuests: 1, label: "Makarna Bar 2", zone: "Bar" },
  { id: 3,  seats: 2, minGuests: 1, label: "Pizza Bar 1",   zone: "Bar" },
  { id: 4,  seats: 2, minGuests: 1, label: "Pizza Bar 2",   zone: "Bar" },
  { id: 5,  seats: 4, minGuests: 3, label: "Ahşap Masa",    zone: "İç Mekan" },
  { id: 6,  seats: 6, minGuests: 4, label: "Metal Masa",    zone: "İç Mekan" },
  { id: 7,  seats: 3, minGuests: 1, label: "Yeşil Masa",    zone: "İç Mekan" },
  { id: 8,  seats: 3, minGuests: 1, label: "Rome",          zone: "Giriş" },
  { id: 9,  seats: 3, minGuests: 1, label: "Firenze",       zone: "Giriş" },
  { id: 10, seats: 3, minGuests: 1, label: "Bologna",       zone: "Giriş" },
];

const TIME_SLOTS = ["12:00","12:30","13:00","13:30","14:00","14:30","18:00","18:30","19:00","19:30","20:00","20:30"];

const C = {
  bg: "#0e0c0a", bgDeep: "#0a0908", bgCard: "#141210",
  gold: "#c8a96e", text: "#e8e0d4", textMid: "#6b5e4e", textDim: "#3a3028",
  border: "#2a2318", borderLight: "#1e1a16",
};

const serif = "'Georgia', 'Times New Roman', serif";
const sans = "'Helvetica Neue', Arial, sans-serif";

const isMonday = (d: string) => new Date(d + "T12:00:00").getDay() === 1;
const getDefaultDate = () => { const d = new Date(); if (d.getDay() === 1) d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };
const today = () => new Date().toISOString().split("T")[0];
const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const isTableAvailable = (tableId: number, date: string, time: string, duration: number, reservations: any[]) => {
  const reqStart = TIME_SLOTS.indexOf(time);
  const reqEnd = reqStart + duration * 2;
  return !reservations.some(r => {
    if (r.table_id !== tableId || r.date !== date) return false;
    const rStart = TIME_SLOTS.indexOf(r.time);
    const rEnd = rStart + r.duration * 2;
    return reqStart < rEnd && reqEnd > rStart;
  });
};

const getAvailableTables = (date: string, time: string, guests: number, duration: number, reservations: any[]) =>
  TABLES.filter(t => t.seats >= guests && guests >= t.minGuests && isTableAvailable(t.id, date, time, duration, reservations));

const inputStyle: React.CSSProperties = { background: "#141210", border: "1px solid #2a2318", color: "#e8e0d4", padding: "11px 14px", fontSize: 12, width: "100%", outline: "none", boxSizing: "border-box" };
const goldBtn: React.CSSProperties = { background: "#c8a96e", color: "#0e0c0a", border: "none", padding: "14px 28px", fontSize: 9, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", fontWeight: 600, width: "100%", marginTop: 8 };
const ghostBtn: React.CSSProperties = { background: "transparent", color: "#6b5e4e", border: "1px solid #2a2318", padding: "13px 20px", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" };

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 8, letterSpacing: 2.5, color: C.textMid, textTransform: "uppercase", marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

export default function App() {
  // ✅ URL'e göre view belirleniyor
  const isAdminPath = window.location.pathname === "/admin";
  const [view, setView] = useState(isAdminPath ? "admin" : "customer");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", guests: 2, date: getDefaultDate(), time: "", duration: 1, note: "" });
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adminDate, setAdminDate] = useState(today());
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState("");

  useEffect(() => {
    db.getAll().then(data => { setReservations(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const availableTables = form.date && form.time ? getAvailableTables(form.date, form.time, form.guests, form.duration, reservations) : [];

  const handleBook = async () => {
    if (!selectedTable) return;
    setSaving(true);
    const result = await db.insert({ name: form.name, phone: form.phone, guests: form.guests, table_id: selectedTable.id, date: form.date, time: form.time, duration: form.duration, status: "confirmed", note: form.note || "" });
    if (result && result[0]) {
      setReservations(prev => [...prev, result[0]]);
      setMyCode(`RES-${result[0].id}`);
      setSuccess(true); setStep(1);
      emailjs.send(
        "service_vse0fwr",
        "template_96ztvvr",
        {
          name: form.name,
          phone: form.phone,
          date: form.date,
          time: form.time,
          guests: form.guests,
          duration: form.duration,
          table: selectedTable.label,
          note: form.note || "—"
        },
        "pWUzrRJ3dE0_-UsYz"
      );
      setForm({ name: "", phone: "", guests: 2, date: getDefaultDate(), time: "", duration: 1, note: "" });
      setSelectedTable(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    await db.delete(id);
    setReservations(prev => prev.filter(r => r.id !== id));
  };

  const todayRes = reservations.filter(r => r.date === adminDate);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.gold, letterSpacing: 4, fontSize: 11 }}>Yükleniyor...</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: sans }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", borderBottom: `1px solid ${C.borderLight}` }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 26, fontWeight: 300, letterSpacing: 6, textTransform: "uppercase" }}>Il Sorrisino</div>
          <div style={{ fontSize: 8, letterSpacing: 4, color: C.textMid, textTransform: "uppercase", marginTop: 2 }}>One Bite. Endless Smiles.</div>
        </div>
        {/* ✅ Butonlar sadece admin sayfasında göster */}
        {isAdminPath && (
          <div style={{ display: "flex", gap: 4 }}>
            {[["customer", "Rezervasyon"], ["admin", "Yönetim"]].map(([v, l]) => (
              <button key={v} onClick={() => { setView(v); setSuccess(false); }} style={{
                background: view === v ? C.gold : "transparent",
                color: view === v ? C.bg : C.textMid,
                border: `1px solid ${view === v ? C.gold : C.border}`,
                padding: "7px 18px", fontSize: 9, letterSpacing: 2,
                textTransform: "uppercase", cursor: "pointer",
                fontWeight: view === v ? 600 : 400
              }}>{l}</button>
            ))}
          </div>
        )}
      </header>

      {view === "customer" ? (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 2rem" }}>
          {success ? (
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <div style={{ fontSize: 13, letterSpacing: 6, color: C.gold, marginBottom: 16 }}>✦ ✦ ✦</div>
              <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, marginBottom: 8 }}>Rezervasyonunuz Alındı</div>
              <div style={{ display: "inline-block", border: `1px solid ${C.gold}`, color: C.gold, padding: "6px 20px", fontSize: 10, letterSpacing: 3, marginBottom: 20 }}>KOD: {myCode}</div>
              <p style={{ color: C.textMid, fontSize: 11, letterSpacing: 1, lineHeight: 2, marginBottom: 28 }}>Sizi aramızda görmekten büyük mutluluk duyacağız.</p>
              <button onClick={() => setSuccess(false)} style={goldBtn}>Yeni Rezervasyon</button>
            </div>
          ) : (
            <div>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ fontSize: 9, letterSpacing: 5, color: C.gold, textTransform: "uppercase", marginBottom: 14 }}>Rezervasyon</div>
                <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 300, lineHeight: 1.2 }}>
                  Kısa Bir İtalya Kaçamağına <span style={{ fontStyle: "italic", color: C.gold }}>Hazır Mısın?</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "18px 0" }}>
                  <div style={{ height: 1, width: 60, background: `linear-gradient(to right, transparent, ${C.border})` }} />
                  <div style={{ width: 4, height: 4, background: C.gold, transform: "rotate(45deg)" }} />
                  <div style={{ height: 1, width: 60, background: `linear-gradient(to left, transparent, ${C.border})` }} />
                </div>
              </div>

              <div style={{ display: "flex", marginBottom: 32, borderBottom: `1px solid ${C.borderLight}` }}>
                {["Bilgiler", "Masa Seç", "Onayla"].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", paddingBottom: 12, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: step === i + 1 ? C.gold : C.textDim, borderBottom: step === i + 1 ? `1px solid ${C.gold}` : "1px solid transparent" }}>{i + 1}. {s}</div>
                ))}
              </div>

              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Row>
                    <Field label="Ad Soyad"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Adınız Soyadınız" /></Field>
                    <Field label="Telefon"><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xx xxx xx xx" /></Field>
                  </Row>
                  <Row>
                    <Field label="Tarih">
                      <input type="date" style={{ ...inputStyle, borderColor: isMonday(form.date) ? "#8a4040" : "#2a2318" }} value={form.date} min={today()} onChange={e => { if (!isMonday(e.target.value)) setForm(f => ({ ...f, date: e.target.value, time: "" })); }} />
                      {isMonday(form.date) && <div style={{ fontSize: 9, color: "#8a4040", marginTop: 5 }}>Pazartesi günleri kapalıyız.</div>}
                    </Field>
                    <Field label="Saat">
                      <select style={inputStyle} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}>
                        <option value="">Saat seçin</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </Row>
                  <Row>
                    <Field label="Kişi Sayısı">
                      <select style={inputStyle} value={form.guests} onChange={e => setForm(f => ({ ...f, guests: Number(e.target.value) }))}>
                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Kişi</option>)}
                      </select>
                    </Field>
                    <Field label="Süre">
                      <select style={inputStyle} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}>
                        <option value={1}>1 Saat</option>
                        <option value={2}>2 Saat</option>
                        <option value={3}>3 Saat</option>
                      </select>
                    </Field>
                  </Row>
                  <button onClick={() => setStep(2)} disabled={!form.name || !form.phone || !form.date || !form.time || isMonday(form.date)}
                    style={{ ...goldBtn, opacity: (!form.name || !form.phone || !form.date || !form.time || isMonday(form.date)) ? 0.3 : 1 }}>
                    Müsait Masaları Gör →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div style={{ background: C.bgDeep, border: `1px solid ${C.borderLight}`, padding: "10px 16px", fontSize: 10, color: C.textMid, textAlign: "center", marginBottom: 20 }}>
                    {formatDate(form.date)} · {form.time} · {form.guests} kişi · {form.duration} saat
                  </div>
                  {availableTables.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: C.textDim, fontSize: 11 }}>
                      — Bu saat için müsait masa yok —
                      <div><button onClick={() => setStep(1)} style={{ ...goldBtn, maxWidth: 220, margin: "20px auto 0" }}>← Farklı Saat Seç</button></div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                        {availableTables.map(t => (
                          <div key={t.id} onClick={() => setSelectedTable(t)} style={{ border: `1px solid ${selectedTable?.id === t.id ? C.gold : C.border}`, padding: "16px 18px", cursor: "pointer", background: selectedTable?.id === t.id ? C.bgCard : C.bg }}>
                            <div style={{ fontFamily: serif, fontSize: 17, color: selectedTable?.id === t.id ? C.gold : C.text, marginBottom: 4 }}>{t.label}</div>
                            <div style={{ fontSize: 9, letterSpacing: 1.5, color: C.textDim, textTransform: "uppercase" }}>{t.zone} · {t.seats} kişilik</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setStep(1)} style={ghostBtn}>← Geri</button>
                        <button onClick={() => setStep(3)} disabled={!selectedTable} style={{ ...goldBtn, flex: 1, marginTop: 0, opacity: selectedTable ? 1 : 0.3 }}>Devam Et →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && selectedTable && (
                <div>
                  <div style={{ border: `1px solid ${C.border}`, padding: 22, marginBottom: 16, background: C.bgDeep }}>
                    <div style={{ fontSize: 8, letterSpacing: 3, color: C.gold, textTransform: "uppercase", marginBottom: 16 }}>Rezervasyon Özeti</div>
                    {[["İsim", form.name], ["Telefon", form.phone], ["Tarih", formatDate(form.date)], ["Saat", `${form.time} (${form.duration} saat)`], ["Kişi", `${form.guests} kişi`], ["Masa", `${selectedTable.label} — ${selectedTable.zone}`]].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.borderLight}`, fontSize: 11 }}>
                        <span style={{ color: C.textMid }}>{k}</span>
                        <span style={{ color: C.text, fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <Field label="Özel Not (İsteğe Bağlı)">
                    <textarea style={{ ...inputStyle, height: 80, resize: "none", lineHeight: 1.6 }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Doğum günü, alerji, özel istek..." />
                  </Field>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button onClick={() => setStep(2)} style={ghostBtn}>← Geri</button>
                    <button onClick={handleBook} disabled={saving} style={{ ...goldBtn, flex: 1, marginTop: 0, opacity: saving ? 0.5 : 1 }}>{saving ? "Kaydediliyor..." : "Rezervasyonu Onayla"}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem" }}>
          {!adminAuth ? (
            <div style={{ maxWidth: 280, margin: "80px auto", textAlign: "center" }}>
              <div style={{ fontSize: 9, letterSpacing: 5, color: C.gold, textTransform: "uppercase", marginBottom: 20 }}>Yönetim Girişi</div>
              <input type="password" style={{ ...inputStyle, marginBottom: 8 }} placeholder="Şifre" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && setAdminAuth(adminPass === "admin123")} />
              <div style={{ color: C.textDim, fontSize: 9, marginBottom: 12 }}>Şifre: admin123</div>
              <button onClick={() => setAdminAuth(adminPass === "4948Luca")} style={goldBtn}>Giriş Yap</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: 4, color: C.gold, textTransform: "uppercase", marginBottom: 6 }}>Yönetim Paneli</div>
                  <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 300 }}>Rezervasyon Takvimi</div>
                </div>
                <input type="date" style={{ ...inputStyle, width: "auto" }} value={adminDate} onChange={e => setAdminDate(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
                {[["Rezervasyon", todayRes.length], ["Dolu Masa", new Set(todayRes.map(r => r.table_id)).size + " / " + TABLES.length], ["Misafir", todayRes.reduce((s, r) => s + r.guests, 0)]].map(([label, val]) => (
                  <div key={label} style={{ background: C.bgDeep, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                    <div style={{ fontSize: 8, letterSpacing: 2, color: C.textMid, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                    <div style={{ fontFamily: serif, fontSize: 32, color: C.gold, fontWeight: 300 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                {TABLES.map(table => {
                  const tableRes = todayRes.filter(r => r.table_id === table.id);
                  return (
                    <div key={table.id} style={{ border: `1px solid ${C.border}`, background: C.bgDeep }}>
                      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg }}>
                        <div>
                          <div style={{ fontFamily: serif, fontSize: 15, color: C.gold }}>{table.label}</div>
                          <div style={{ fontSize: 8, letterSpacing: 1.5, color: C.textDim, textTransform: "uppercase", marginTop: 1 }}>{table.zone}</div>
                        </div>
                        <div style={{ fontSize: 9, color: C.textDim }}>{table.seats} kişilik</div>
                      </div>
                      {tableRes.length === 0 ? (
                        <div style={{ padding: 16, fontSize: 9, color: C.textDim, textAlign: "center", letterSpacing: 2 }}>— boş —</div>
                      ) : tableRes.map(r => (
                        <div key={r.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.borderLight}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: 12, color: C.text, fontWeight: 500, marginBottom: 2 }}>{r.name}</div>
                              <div style={{ fontSize: 9, color: C.textMid }}>{r.time} · {r.guests} kişi · {r.phone}</div>
                              {r.note && <div style={{ fontSize: 9, color: C.textMid, fontStyle: "italic", marginTop: 4 }}>✦ {r.note}</div>}
                            </div>
                            <button onClick={() => handleDelete(r.id)} style={{ background: "transparent", border: "1px solid #3a1a1a", color: "#8a4040", padding: "3px 10px", fontSize: 9, cursor: "pointer" }}>İptal</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}