import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "포토클리닉 계약서 생성기",
  description: "병원 전문 브랜드 촬영 계약서를 자동으로 생성합니다.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Noto Sans KR', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
