"use client";
import { useState, useRef } from "react";

// ── 타입 ─────────────────────────────────────────────────
interface QuoteData {
  hospitalName: string;
  contactName: string;
  phone: string;
  email: string;
  quoteNumber: string;
  quoteDate: string;
  shootDate: string | null;
  validUntil: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number; note: string }[];
  supplyAmount: number;
  discountAmount: number;
  vat: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  memos: string | null;
}

// ── 컬러 ─────────────────────────────────────────────────
const C = {
  teal: "#155855", orange: "#E85D2C",
  bg: "#EDF5F3", surface: "#FFFFFF", border: "#C8DDD9",
  muted: "#5A7470", hint: "#9BB5B0", txt: "#1C2B28", mint: "#EAF4F2",
};

export default function ContractPage() {
  const [step,     setStep]     = useState<1|2|3>(1);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Step1 — PDF 업로드
  const [file,      setFile]      = useState<File | null>(null);
  const [quote,     setQuote]     = useState<QuoteData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step2 — 계약서
  const [contractHtml, setContractHtml] = useState("");
  const [editingQuote, setEditingQuote] = useState<QuoteData | null>(null);

  // Step3 — 메일 발송
  const [toEmail,    setToEmail]    = useState("");
  const [toName,     setToName]     = useState("");
  const [mailMsg,    setMailMsg]    = useState("");
  const [sendResult, setSendResult] = useState("");
  const [sending,    setSending]    = useState(false);

  // ── Step1: PDF 분석 ─────────────────────────────────────
  const extractPdf = async () => {
    if (!file) { setError("견적서 PDF를 첨부해주세요"); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setQuote(data.quote);
      setEditingQuote(data.quote);
      setToEmail(data.quote.email || "");
      setToName(data.quote.contactName || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step2: 계약서 생성 ─────────────────────────────────
  const generateContract = async () => {
    if (!editingQuote) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote: editingQuote }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setContractHtml(data.html);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── PDF 다운로드 ────────────────────────────────────────
  const downloadPdf = () => {
    if (!contractHtml) return;
    const blob = new Blob([contractHtml], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `포토클리닉_계약서_${editingQuote?.hospitalName || ""}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => alert("Chrome으로 파일 열기 → ⌘P → PDF로 저장"), 300);
  };

  // ── 메일 발송 ───────────────────────────────────────────
  const sendMail = async () => {
    if (!toEmail) { setError("수신자 이메일을 입력해주세요"); return; }
    setSending(true); setError(""); setSendResult("");
    try {
      const res  = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toEmail,
          toName,
          hospitalName: editingQuote?.hospitalName || "",
          contractHtml,
          message: mailMsg,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSendResult("✓ 메일 발송 완료!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const fmt = (n: number) => (n || 0).toLocaleString("ko-KR");

  const iS: React.CSSProperties = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
    background: C.surface, color: C.txt, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.txt }}>

      {/* NAV */}
      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, height: 54,
                    padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 6px rgba(21,88,85,.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#E85D2C"/>
            <circle cx="12" cy="12" r="11" fill="#155855" clipPath="url(#ncc)"/>
            <defs><clipPath id="ncc"><rect x="12" y="0" width="12" height="24"/></clipPath></defs>
            <circle cx="12" cy="12" r="7" fill="#EB8F22"/>
            <circle cx="12" cy="12" r="7" fill="#569082" clipPath="url(#ncc)"/>
            <circle cx="12" cy="12" r="3" fill="white"/>
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>PHOTO CLINIC</div>
            <div style={{ fontSize: 9, color: C.hint }}>계약서 자동 생성</div>
          </div>
        </div>
        {/* 견적서 링크 */}
        <a href="https://photoclinic-quote.vercel.app/photoclinic" target="_blank"
          style={{ fontSize: 11, color: C.muted, textDecoration: "none", border: `1px solid ${C.border}`,
                   padding: "5px 12px", borderRadius: 8 }}>
          견적서 생성 →
        </a>
      </nav>

      {/* 스텝 인디케이터 */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 28px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 0 }}>
          {[
            ["1", "견적서 업로드"],
            ["2", "계약서 확인"],
            ["3", "발송"],
          ].map(([num, label], i) => {
            const sn = i + 1;
            const active  = step === sn;
            const done    = step > sn;
            return (
              <div key={num} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: done ? C.teal : active ? C.orange : C.border,
                    color: done || active ? "#fff" : C.muted,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {done ? "✓" : num}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 400,
                                  color: active ? C.orange : done ? C.teal : C.muted }}>
                    {label}
                  </span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: done ? C.teal : C.border, margin: "0 12px" }}/>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── STEP 1: PDF 업로드 ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ background: C.mint, padding: "14px 22px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.teal }}>견적서 PDF 업로드</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  포토클리닉 견적서 PDF를 첨부하면 내용을 자동으로 읽어옵니다
                </div>
              </div>
              <div style={{ padding: "22px" }}>
                <div onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                  style={{ border: `2px dashed ${file ? C.teal : C.border}`, borderRadius: 12,
                           padding: "32px 20px", textAlign: "center", cursor: "pointer",
                           background: file ? "#F0FAF8" : C.bg }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: file ? C.teal : C.muted }}>
                    {file ? `✓ ${file.name}` : "클릭 또는 드래그"}
                  </div>
                  <div style={{ fontSize: 11, color: C.hint, marginTop: 4 }}>PDF · 최대 10MB</div>
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}/>

                {error && <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF0EB",
                                         border: `1px solid #FACCB8`, borderRadius: 8, fontSize: 12, color: C.orange }}>
                  ⚠ {error}
                </div>}

                <button onClick={extractPdf} disabled={loading || !file}
                  style={{ width: "100%", height: 48, marginTop: 16, background: loading ? C.hint : C.teal,
                           color: "#fff", border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700,
                           cursor: loading || !file ? "not-allowed" : "pointer", fontFamily: "inherit",
                           display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loading ? <><Spin color="#fff"/>견적서 분석 중...</> : "🔍 견적서 내용 분석"}
                </button>
              </div>
            </div>

            {/* 분석 결과 */}
            {quote && editingQuote && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ background: C.mint, padding: "14px 22px", borderBottom: `1px solid ${C.border}`,
                               display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>✓ 분석 완료 — 내용 확인 및 수정</div>
                </div>
                <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      ["병원명", "hospitalName"],
                      ["담당자", "contactName"],
                      ["연락처", "phone"],
                      ["이메일", "email"],
                      ["견적번호", "quoteNumber"],
                      ["촬영예정일", "shootDate"],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>
                          {label}
                        </label>
                        <input
                          value={(editingQuote as any)[key] || ""}
                          onChange={e => setEditingQuote(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          style={iS}/>
                      </div>
                    ))}
                  </div>

                  {/* 금액 요약 */}
                  <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px",
                                  display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                    {[
                      ["공급가액", editingQuote.supplyAmount],
                      ["할인금액", editingQuote.discountAmount],
                      ["부가세", editingQuote.vat],
                      ["최종금액", editingQuote.totalAmount],
                    ].map(([label, val]) => (
                      <div key={label as string} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.hint, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: label === "최종금액" ? C.teal : C.txt }}>
                          {fmt(val as number)}원
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 항목 목록 */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>촬영 항목</div>
                    {editingQuote.items?.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0",
                                             borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                        <span style={{ flex: 1, fontWeight: 500 }}>{item.name}</span>
                        <span style={{ color: C.muted }}>{fmt(item.subtotal)}원</span>
                        <span style={{ color: C.hint, fontSize: 11 }}>{item.note}</span>
                      </div>
                    ))}
                  </div>

                  {error && <div style={{ padding: "10px 14px", background: "#FFF0EB",
                                           border: `1px solid #FACCB8`, borderRadius: 8, fontSize: 12, color: C.orange }}>
                    ⚠ {error}
                  </div>}

                  <button onClick={() => { setStep(2); generateContract(); }}
                    disabled={loading}
                    style={{ height: 48, background: loading ? C.hint : C.orange, color: "#fff",
                             border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700,
                             cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
                             display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {loading ? <><Spin color="#fff"/>계약서 생성 중...</> : "📝 계약서 자동 생성 →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: 계약서 생성 중 ── */}
        {step === 2 && loading && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                         padding: "60px 32px", textAlign: "center" }}>
            <Spin size={40} color={C.teal}/>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.teal, marginTop: 18, marginBottom: 8 }}>
              AI 계약서 작성 중...
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>
              견적 내용을 바탕으로 조항·특약사항을<br/>자동으로 작성하고 있습니다
            </div>
          </div>
        )}

        {/* ── STEP 3: 계약서 완성 + 발송 ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* 계약서 미리보기 */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ background: C.mint, padding: "14px 22px", borderBottom: `1px solid ${C.border}`,
                             display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>✓ 계약서 생성 완료</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{editingQuote?.hospitalName} 촬영 계약서</div>
                </div>
                <button onClick={downloadPdf}
                  style={{ height: 36, padding: "0 16px", background: C.teal, color: "#fff",
                           border: "none", borderRadius: 9, fontSize: 12, fontWeight: 700,
                           cursor: "pointer", fontFamily: "inherit" }}>
                  📄 HTML 다운로드
                </button>
              </div>
              {/* 계약서 미리보기 iframe */}
              <div style={{ padding: "16px", background: "#F8FAFA" }}>
                <div style={{ fontSize: 11, color: C.hint, marginBottom: 8 }}>
                  미리보기 · 실제 PDF는 다운로드 후 Chrome에서 ⌘P → PDF로 저장
                </div>
                <iframe
                  srcDoc={contractHtml}
                  style={{ width: "100%", height: 480, border: `1px solid ${C.border}`,
                           borderRadius: 8, background: "#fff" }}
                  title="계약서 미리보기"/>
              </div>
            </div>

            {/* 메일 발송 */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ background: C.mint, padding: "14px 22px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>📧 메일로 발송</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  계약서 파일이 첨부된 이메일을 병원에 발송합니다
                </div>
              </div>
              <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>
                      수신 이메일 *
                    </label>
                    <input value={toEmail} onChange={e => setToEmail(e.target.value)}
                      placeholder="hospital@email.com" style={iS}/>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>
                      담당자명
                    </label>
                    <input value={toName} onChange={e => setToName(e.target.value)}
                      placeholder="홍길동 원장님" style={iS}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>
                    메일 본문 (선택)
                  </label>
                  <textarea value={mailMsg} onChange={e => setMailMsg(e.target.value)} rows={3}
                    placeholder="포토클리닉 촬영 계약서를 발송드립니다. 내용 확인 후 서명하여 회신 부탁드립니다."
                    style={{ ...iS, resize: "vertical" }}/>
                </div>

                {error && <div style={{ padding: "10px 14px", background: "#FFF0EB",
                                         border: `1px solid #FACCB8`, borderRadius: 8, fontSize: 12, color: C.orange }}>
                  ⚠ {error}
                </div>}

                {sendResult && <div style={{ padding: "12px 16px", background: "#EAF4F2",
                                              border: `1px solid ${C.teal}`, borderRadius: 8,
                                              fontSize: 13, fontWeight: 700, color: C.teal }}>
                  {sendResult}
                </div>}

                <button onClick={sendMail} disabled={sending || !toEmail}
                  style={{ height: 48, background: sending ? C.hint : C.orange, color: "#fff",
                           border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700,
                           cursor: sending || !toEmail ? "not-allowed" : "pointer", fontFamily: "inherit",
                           display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {sending ? <><Spin color="#fff"/>발송 중...</> : "📨 계약서 메일 발송"}
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setStep(1); setContractHtml(""); setSendResult(""); }}
                    style={{ flex: 1, height: 38, background: C.surface, border: `1px solid ${C.border}`,
                             borderRadius: 9, fontSize: 12, fontWeight: 700, color: C.muted,
                             cursor: "pointer", fontFamily: "inherit" }}>
                    ← 처음으로
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Spin({ size = 14, color = "#155855" }: { size?: number; color?: string }) {
  return (
    <div style={{ width: size, height: size,
                  border: `${Math.max(2, Math.floor(size / 7))}px solid rgba(0,0,0,.1)`,
                  borderTopColor: color, borderRadius: "50%",
                  animation: "spin .6s linear infinite", flexShrink: 0 }}/>
  );
}
