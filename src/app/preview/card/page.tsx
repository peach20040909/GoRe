// 디자인 확인용: /preview/card — 매개체 4종 × 혼자/함께 카드 미리보기
import { MemoryCard, type Medium } from "@/components/MemoryCard";

const SAMPLES: { medium: Medium; color: string; pattern: string; shape: "single" | "pair"; glow: number; mine: string; ko: string; title: string; place: string }[] = [
  { medium: "lock", color: "#E07A5F", pattern: "약속", shape: "pair", glow: 0.8, mine: "Together in every season.", ko: "모든 계절에 함께하길", title: "폭포 앞의 약속", place: "홍제폭포" },
  { medium: "bottle", color: "#87CEEB", pattern: "waterfall", shape: "single", glow: 0.5, mine: "To me, one year later", ko: "1년 뒤의 나에게", title: "물가에 띄운 편지", place: "홍제폭포" },
  { medium: "paper", color: "#8D6E63", pattern: "별", shape: "single", glow: 0.4, mine: "지금의 시절을 기억하며", ko: "지금의 시절을 기억하며", title: "원고지 한 장", place: "윤동주기념관" },
  { medium: "beacon", color: "#F2A541", pattern: "불씨", shape: "pair", glow: 0.9, mine: "멀리 있는 엄마에게", ko: "멀리 있는 엄마에게", title: "산 너머로 보내는 소식", place: "안산 봉수대" },
];

export default function CardPreview() {
  return (
    <div className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
      {SAMPLES.map((s) => (
        <MemoryCard
          key={s.medium}
          medium={s.medium}
          card={{ color: s.color, shape: s.shape, pattern: s.pattern, glow: s.glow }}
          engraving={{ mine: s.mine, ko: s.ko }}
          title={s.title}
          placeName={s.place}
          date="2026. 11. 6."
          className="w-full"
        />
      ))}
    </div>
  );
}
