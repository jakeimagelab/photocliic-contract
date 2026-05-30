import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY 미설정" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "파일 없음" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const base64      = Buffer.from(arrayBuffer).toString("base64");
  const mediaType   = file.type || "application/pdf";

  const prompt = `이 견적서 PDF에서 아래 정보를 추출해서 JSON으로만 응답하세요.
마크다운 없이 순수 JSON만 응답하세요.

{
  "hospitalName": "병원명",
  "contactName": "담당자명",
  "phone": "연락처",
  "email": "이메일",
  "quoteNumber": "견적번호",
  "quoteDate": "견적일 (YYYY-MM-DD)",
  "shootDate": "촬영예정일 (YYYY-MM-DD, 없으면 null)",
  "validUntil": "견적유효기간 (YYYY-MM-DD)",
  "items": [
    { "name": "항목명", "qty": 수량, "unitPrice": 단가, "subtotal": 소계, "note": "비고" }
  ],
  "supplyAmount": 공급가액(숫자),
  "discountAmount": 할인금액(숫자),
  "vat": 부가세(숫자),
  "totalAmount": 최종금액(숫자),
  "depositAmount": 선금(숫자),
  "balanceAmount": 잔금(숫자),
  "memos": "메모 내용 (없으면 null)"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64}` },
          },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ ok: false, error: `OpenAI API 오류: ${res.status} ${err}` }, { status: 500 });
  }

  const data = await res.json();
  const txt  = data.choices?.[0]?.message?.content || "";

  try {
    const s = txt.indexOf("{");
    const e = txt.lastIndexOf("}");
    if (s < 0 || e < 0) throw new Error("JSON 없음");
    const parsed = JSON.parse(txt.slice(s, e + 1));
    return NextResponse.json({ ok: true, quote: parsed });
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 파싱 실패", raw: txt }, { status: 500 });
  }
}
