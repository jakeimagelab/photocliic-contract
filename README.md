# 포토클리닉 계약서 자동 생성기

## 기능
1. 견적서 PDF 업로드 → Claude AI가 내용 자동 추출
2. 추출된 견적 내용 확인·수정
3. AI 계약서 자동 생성 (조항·특약 포함)
4. HTML 다운로드 (→ Chrome 인쇄로 PDF 변환)
5. Resend API로 병원에 메일 발송

## 환경변수 설정

`.env.local.example`을 `.env.local`로 복사 후 키 입력:

```
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000/contract
```

## Vercel 배포

1. GitHub에 push
2. Vercel import
3. Environment Variables 설정:
   - ANTHROPIC_API_KEY
   - RESEND_API_KEY

## photoclinic-ai 대시보드 연결

대시보드에서 이 앱으로 링크 추가:
```
https://photoclinic-contract.vercel.app/contract
```
