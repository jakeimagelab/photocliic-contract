import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY 미설정" }, { status: 500 });

  const body  = await req.json();
  const quote = body.quote;

  const fmtNum = (n: number) => n?.toLocaleString("ko-KR") || "0";
  const today  = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const prompt = `당신은 병원 전문 촬영 계약 전문가입니다.
아래 견적 정보를 바탕으로 계약서 각 조항을 구체적으로 작성해주세요.

견적 정보:
- 병원명: ${quote.hospitalName}
- 진료과: ${quote.dept || "병원"}
- 담당자: ${quote.contactName}
- 촬영예정일: ${quote.shootDate || "협의"}
- 계약금액: ${fmtNum(quote.totalAmount)}원 (VAT 포함)
- 선금: ${fmtNum(quote.depositAmount)}원
- 잔금: ${fmtNum(quote.balanceAmount)}원
- 촬영 항목: ${quote.items?.map((i: any) => i.name).join(", ")}
- 메모: ${quote.memos || "없음"}

아래 JSON 형식으로만 응답하세요 (마크다운 없이 순수 JSON):
{
  "scope": "촬영 범위 상세 — 포함 항목, 납품 파일 형식(JPG/RAW), 납품 수량 기준, 보정 범위 명시 (4~6줄)",
  "deliverables": "납품물 상세 — 파일 해상도, 포맷, 전달 방법(클라우드 링크 등), 보관 기간 (3~4줄)",
  "schedule": "일정 상세 — 촬영 준비사항, 촬영 당일 진행 순서, 보정 기간, 최종 납품 기한 (4~5줄)",
  "payment": "결제 조건 상세 — 입금 계좌, 입금 기한, 연체 시 처리, 영수증 발행 (3~4줄)",
  "copyright": "저작권 상세 — 을의 저작권 보유, 갑의 사용 범위(SNS/홈페이지/인쇄물), 상업적 재판매 금지, 포트폴리오 활용 동의 (4~5줄)",
  "cancellation": "취소·변경 규정 — 촬영 30일 전/14일 전/7일 전/3일 전/당일 단계별 위약금 비율 명시, 을의 귀책 사유 시 환불 조건 (5~6줄)",
  "retake": "재촬영·수정 조항 — 무상 수정 범위(색보정 1회), 추가 수정 시 별도 비용, 재촬영 인정 사유와 불인정 사유 구분 (4~5줄)",
  "confidential": "비밀유지 조항 — 촬영 결과물 미공개 기간, SNS 업로드 사전 동의, 병원 내부 정보 보호 (3~4줄)",
  "dispute": "분쟁 해결 — 관할 법원, 협의 우선 원칙, 계약 해석 기준 (2~3줄)",
  "special": "특약사항 — 이 병원의 촬영 항목과 진료과 특성을 반영한 구체적 특약 (4~5줄)"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ ok: false, error: `OpenAI API 오류: ${res.status}` }, { status: 500 });
  }

  const data = await res.json();
  const txt  = data.choices?.[0]?.message?.content || "";

  try {
    const s = txt.indexOf("{");
    const e = txt.lastIndexOf("}");
    if (s < 0 || e < 0) throw new Error("JSON 없음");
    const clauses = JSON.parse(txt.slice(s, e + 1));
    const contractHtml = buildContractHtml(quote, clauses, today);
    return NextResponse.json({ ok: true, clauses, html: contractHtml });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "JSON 파싱 실패", raw: txt }, { status: 500 });
  }
}

function fmt(n: number) {
  return (n || 0).toLocaleString("ko-KR");
}

function buildContractHtml(quote: any, c: any, today: string): string {
  const itemRows = (quote.items || []).map((item: any, i: number) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E8EEF0;color:#5A7470;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8EEF0;font-weight:600;">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8EEF0;text-align:center;color:#5A7470;">${item.qty || 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8EEF0;text-align:right;">${fmt(item.unitPrice)}원</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8EEF0;text-align:right;font-weight:700;color:#155855;">${fmt(item.subtotal)}원</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E8EEF0;color:#9BB5B0;font-size:10px;">${item.note || ""}</td>
    </tr>`).join("");

  const section = (num: string, title: string, content: string) => `
  <div class="section">
    <h3><span class="art">${num}</span>${title}</h3>
    <div class="clause">${content}</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>포토클리닉 촬영 계약서 · ${quote.hospitalName}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Noto Sans KR',sans-serif;color:#1C2B28;background:#fff;
       padding:40px 52px;font-size:12px;line-height:1.8;max-width:900px;margin:0 auto;}

  /* 헤더 */
  .header{display:flex;justify-content:space-between;align-items:flex-start;
          margin-bottom:32px;padding-bottom:18px;border-bottom:2.5px solid #155855;}
  .logo-area .brand{font-size:14px;font-weight:700;color:#155855;letter-spacing:1.5px;}
  .logo-area .sub{font-size:10px;color:#9BB5B0;margin-top:3px;}
  .doc-info{text-align:right;}
  .doc-info .title{font-size:24px;font-weight:700;color:#1C2B28;letter-spacing:4px;}
  .doc-info .meta{font-size:11px;color:#6B8B87;margin-top:5px;line-height:1.6;}

  /* 당사자 */
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;}
  .party{border:1px solid #C8DDD9;border-radius:10px;padding:14px 16px;background:#FAFCFC;}
  .party h3{font-size:10px;font-weight:700;color:#9BB5B0;text-transform:uppercase;
            letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #E8EEF0;}
  .party .row{display:flex;gap:10px;padding:3px 0;font-size:11px;}
  .party .k{color:#6B8B87;min-width:52px;flex-shrink:0;}
  .party .v{font-weight:600;color:#1C2B28;}

  /* 섹션 */
  .section{margin-bottom:22px;}
  .section h3{font-size:12px;font-weight:700;color:#155855;margin-bottom:8px;
              padding-bottom:6px;border-bottom:1px solid #C8DDD9;
              display:flex;align-items:center;gap:8px;}
  .art{display:inline-block;background:#155855;color:#fff;font-size:9px;font-weight:700;
       padding:2px 7px;border-radius:10px;letter-spacing:.03em;flex-shrink:0;}
  .clause{background:#F8FAFE;border-left:3px solid #155855;padding:12px 16px;
          border-radius:0 8px 8px 0;font-size:11px;line-height:1.9;color:#2C3E3D;
          white-space:pre-line;}

  /* 항목 테이블 */
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;}
  th{background:#EAF4F2;padding:8px 12px;text-align:left;font-size:10px;
     font-weight:700;color:#155855;border-bottom:2px solid #C8DDD9;}

  /* 금액 */
  .amount-wrap{display:flex;justify-content:flex-end;margin-top:4px;}
  .amount-box{min-width:280px;}
  .amt-row{display:flex;justify-content:space-between;padding:5px 0;
           font-size:12px;border-bottom:.5px solid #EEF4F3;}
  .amt-row .lbl{color:#6B8B87;}
  .amt-row .val{font-weight:600;}
  .amt-total{display:flex;justify-content:space-between;padding:9px 0;
             font-size:15px;font-weight:700;color:#155855;
             border-top:2px solid #155855;margin-top:2px;}

  /* 결제 박스 */
  .pay-boxes{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;}
  .pay-box{border:1px solid #C8DDD9;border-radius:8px;padding:14px;text-align:center;background:#FAFCFC;}
  .pay-box .pt{font-size:10px;color:#9BB5B0;margin-bottom:4px;}
  .pay-box .pa{font-size:20px;font-weight:700;color:#155855;}
  .pay-box .ps{font-size:10px;color:#9BB5B0;margin-top:3px;}

  /* 효력 문구 */
  .effect-box{background:#EAF4F2;border:1px solid #C8DDD9;border-radius:8px;
              padding:13px 16px;margin:28px 0 20px;font-size:11px;
              color:#2C3E3D;line-height:1.9;text-align:center;}

  /* 서명 */
  .sign-area{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:8px;}
  .sign-box{border:1px solid #C8DDD9;border-radius:10px;padding:18px 20px;}
  .sign-box h4{font-size:11px;font-weight:700;color:#6B8B87;margin-bottom:14px;
               padding-bottom:6px;border-bottom:1px solid #EEF4F3;}
  .sl{display:flex;gap:8px;align-items:center;margin-bottom:10px;}
  .sl .sk{font-size:11px;color:#9BB5B0;min-width:48px;}
  .sl .sv{font-size:12px;font-weight:600;color:#1C2B28;border-bottom:1px solid #C8DDD9;
          flex:1;padding-bottom:2px;min-height:20px;}
  .stamp{margin-top:14px;height:64px;border:1px dashed #C8DDD9;border-radius:6px;
         display:flex;align-items:center;justify-content:center;
         font-size:10px;color:#C8DDD9;}

  /* 푸터 */
  .footer{margin-top:28px;text-align:center;font-size:10px;color:#9BB5B0;
          padding-top:14px;border-top:1px solid #EEF4F3;}

  @media print{
    body{padding:20px 28px;}
    @page{size:A4;margin:1.2cm;}
    .section{page-break-inside:avoid;}
  }
</style>
</head>
<body>

<div class="header">
  <div class="logo-area">
    <div class="brand">PHOTO CLINIC</div>
    <div class="sub">제이크이미지연구소 · 병원 전문 브랜드 촬영</div>
    <div class="sub" style="margin-top:1px;">사업자번호: 000-00-00000 · 서울시 ○○구 ○○로 000</div>
  </div>
  <div class="doc-info">
    <div class="title">촬 영 계 약 서</div>
    <div class="meta">
      계약일: ${today}<br>
      견적번호: ${quote.quoteNumber || ("PC-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-001")}
    </div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <h3>발주자 (갑)</h3>
    <div class="row"><span class="k">병원명</span><span class="v">${quote.hospitalName || "-"}</span></div>
    <div class="row"><span class="k">담당자</span><span class="v">${quote.contactName || "-"}</span></div>
    <div class="row"><span class="k">연락처</span><span class="v">${quote.phone || "-"}</span></div>
    <div class="row"><span class="k">이메일</span><span class="v">${quote.email || "-"}</span></div>
    <div class="row"><span class="k">주소</span><span class="v">&nbsp;</span></div>
  </div>
  <div class="party">
    <h3>수탁자 (을)</h3>
    <div class="row"><span class="k">상호</span><span class="v">포토클리닉 (제이크이미지연구소)</span></div>
    <div class="row"><span class="k">대표자</span><span class="v">정연호</span></div>
    <div class="row"><span class="k">연락처</span><span class="v">010-0000-0000</span></div>
    <div class="row"><span class="k">이메일</span><span class="v">photoclinic@email.com</span></div>
    <div class="row"><span class="k">계좌</span><span class="v">○○은행 000-000-000000 (예금주: 정연호)</span></div>
  </div>
</div>

${section("제1조", "계약 목적 및 촬영 범위", c.scope || "")}

<div class="section">
  <h3><span class="art">제2조</span>촬영 항목 및 계약 금액</h3>
  <table>
    <thead>
      <tr>
        <th style="width:28px;">No.</th>
        <th>항목명</th>
        <th style="width:48px;text-align:center;">수량</th>
        <th style="width:100px;text-align:right;">단가</th>
        <th style="width:110px;text-align:right;">소계</th>
        <th style="width:80px;">비고</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="amount-wrap">
    <div class="amount-box">
      <div class="amt-row"><span class="lbl">공급가액</span><span class="val">${fmt(quote.supplyAmount)}원</span></div>
      ${quote.discountAmount > 0 ? `<div class="amt-row"><span class="lbl">할인금액</span><span class="val" style="color:#E85D2C;">-${fmt(quote.discountAmount)}원</span></div>` : ""}
      <div class="amt-row"><span class="lbl">부가세 (10%)</span><span class="val">${fmt(quote.vat)}원</span></div>
      <div class="amt-total"><span>최종 계약금액</span><span>${fmt(quote.totalAmount)}원</span></div>
    </div>
  </div>
</div>

<div class="section">
  <h3><span class="art">제3조</span>결제 조건</h3>
  <div class="clause">${c.payment || ""}</div>
  <div class="pay-boxes">
    <div class="pay-box">
      <div class="pt">계약금 (선금 50%)</div>
      <div class="pa">${fmt(quote.depositAmount)}원</div>
      <div class="ps">계약 체결 시 납부 · 촬영 일정 확정 조건</div>
    </div>
    <div class="pay-box">
      <div class="pt">잔금 (50%)</div>
      <div class="pa">${fmt(quote.balanceAmount)}원</div>
      <div class="ps">촬영 완료 후 파일 전달 전 납부</div>
    </div>
  </div>
</div>

${section("제4조", "납품물 및 전달 방식", c.deliverables || "")}
${section("제5조", "촬영 일정 및 납품 기한", c.schedule || "")}
${section("제6조", "저작권 및 사용권", c.copyright || "")}
${section("제7조", "취소 및 변경 규정", c.cancellation || "")}
${section("제8조", "재촬영 및 수정 요청", c.retake || "")}
${section("제9조", "비밀유지 및 결과물 공개", c.confidential || "")}
${section("제10조", "분쟁 해결", c.dispute || "")}
${section("제11조", "특약사항", (c.special || "") + (quote.memos ? `\n\n【메모】 ${quote.memos}` : ""))}

<div class="effect-box">
  위 계약의 성립을 증명하기 위하여 본 계약서를 2부 작성하고, 각 1부씩 보관합니다.<br>
  <strong>${today}</strong>
</div>

<div class="sign-area">
  <div class="sign-box">
    <h4>발주자 (갑)</h4>
    <div class="sl"><span class="sk">병원명</span><span class="sv">${quote.hospitalName || ""}</span></div>
    <div class="sl"><span class="sk">담당자</span><span class="sv">${quote.contactName || ""}</span></div>
    <div class="sl"><span class="sk">서명일</span><span class="sv"></span></div>
    <div class="sl"><span class="sk">서명</span><span class="sv"></span></div>
    <div class="stamp">직인 / 서명</div>
  </div>
  <div class="sign-box">
    <h4>수탁자 (을)</h4>
    <div class="sl"><span class="sk">상호</span><span class="sv">포토클리닉 (제이크이미지연구소)</span></div>
    <div class="sl"><span class="sk">대표자</span><span class="sv">정연호</span></div>
    <div class="sl"><span class="sk">서명일</span><span class="sv">${today}</span></div>
    <div class="sl"><span class="sk">서명</span><span class="sv"></span></div>
    <div class="stamp">직인 / 서명</div>
  </div>
</div>

<div class="footer">
  PHOTO CLINIC · 제이크이미지연구소 · 병원 전문 브랜드 촬영 · @photoclinic_kr<br>
  본 계약서는 양 당사자가 서명한 시점부터 법적 효력이 발생합니다.
</div>

</body>
</html>`;
}
