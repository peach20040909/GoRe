// 기억 카드: AI가 정한 디자인 값(색·모양·문양·빛)과 각인 문구를 받아 코드(SVG)로 그림 (기획서 6-1 ②)
// 디자이너가 톤을 바꿀 땐 이 파일의 색·선 굵기만 고치면 됨. 매개체 그림은 MEDIUM_ART에서.

export type CardValues = { color: string; shape: "single" | "pair"; pattern: string; glow: number };
export type Medium = "lock" | "paper" | "beacon" | "bottle";

type Props = {
  card: CardValues;
  engraving: { mine: string; ko: string };
  title: string;
  placeName: string;
  date: string; // 표시용 문자열
  medium?: Medium;
  className?: string;
};

// 문양 키워드 → 4가지 문양 중 하나 (같은 키워드면 항상 같은 문양)
function patternKind(keyword: string) {
  let h = 0;
  for (const ch of keyword) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (["waves", "dots", "rays", "petals"] as const)[h % 4];
}

function Pattern({ kind, cx, cy, color }: { kind: string; cx: number; cy: number; color: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: "none", opacity: 0.55 };
  if (kind === "waves")
    return (
      <g {...s}>
        {[-14, 0, 14].map((dy) => (
          <path key={dy} d={`M${cx - 30} ${cy + dy} q 10 -8 20 0 t 20 0 t 20 0`} />
        ))}
      </g>
    );
  if (kind === "dots")
    return (
      <g fill={color} opacity={0.5}>
        {[-20, 0, 20].flatMap((dx) => [-14, 0, 14].map((dy) => <circle key={`${dx}${dy}`} cx={cx + dx} cy={cy + dy} r={3} />))}
      </g>
    );
  if (kind === "rays")
    return (
      <g {...s}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={cx + 8 * Math.cos(a)} y1={cy + 8 * Math.sin(a)} x2={cx + 24 * Math.cos(a)} y2={cy + 24 * Math.sin(a)} />;
        })}
      </g>
    );
  return (
    <g {...s}>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx={cx} cy={cy - 12} rx={6} ry={12} transform={`rotate(${i * 72} ${cx} ${cy})`} />
      ))}
    </g>
  );
}

// 매개체 하나를 (x, y) 중심에 그림
function MediumArt({ medium, x, y, color, kind }: { medium: Medium; x: number; y: number; color: string; kind: string }) {
  const body = { fill: "#ffffff", stroke: color, strokeWidth: 4 };
  if (medium === "paper")
    return (
      <g>
        <rect x={x - 50} y={y - 60} width={100} height={120} rx={6} {...body} />
        {[0, 1, 2, 3].map((r) => (
          <line key={r} x1={x - 40} x2={x + 40} y1={y - 35 + r * 24} y2={y - 35 + r * 24} stroke={color} opacity={0.35} />
        ))}
        <Pattern kind={kind} cx={x} cy={y + 10} color={color} />
      </g>
    );
  if (medium === "beacon")
    return (
      <g>
        <path d={`M${x} ${y - 60} C ${x + 40} ${y - 10}, ${x + 30} ${y + 40}, ${x} ${y + 50} C ${x - 30} ${y + 40}, ${x - 40} ${y - 10}, ${x} ${y - 60} Z`} {...body} />
        <Pattern kind={kind} cx={x} cy={y + 10} color={color} />
      </g>
    );
  if (medium === "bottle")
    return (
      <g>
        <rect x={x - 12} y={y - 70} width={24} height={22} rx={4} {...body} />
        <rect x={x - 38} y={y - 48} width={76} height={110} rx={22} {...body} />
        <Pattern kind={kind} cx={x} cy={y + 8} color={color} />
      </g>
    );
  return (
    <g>
      <path d={`M${x - 26} ${y - 20} v -18 a 26 26 0 0 1 52 0 v 18`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
      <rect x={x - 44} y={y - 22} width={88} height={78} rx={14} {...body} />
      <Pattern kind={kind} cx={x} cy={y + 16} color={color} />
    </g>
  );
}

export function MemoryCard({ card, engraving, title, placeName, date, medium = "lock", className }: Props) {
  const kind = patternKind(card.pattern);
  const glow = Math.max(0, Math.min(1, card.glow));
  const pair = card.shape === "pair";
  return (
    <svg viewBox="0 0 320 440" className={className} role="img" aria-label={`${title} — ${engraving.mine}`}>
      <rect width="320" height="440" rx="24" fill={card.color} />
      <rect x="12" y="12" width="296" height="416" rx="16" fill="#ffffff" opacity="0.82" />
      {/* 빛: 감정 강도만큼 매개체 뒤가 밝아짐 */}
      <circle cx="160" cy="190" r={70 + 40 * glow} fill={card.color} opacity={0.15 + 0.35 * glow} />
      {pair ? (
        <>
          <MediumArt medium={medium} x={128} y={190} color={card.color} kind={kind} />
          <MediumArt medium={medium} x={192} y={198} color={card.color} kind={kind} />
        </>
      ) : (
        <MediumArt medium={medium} x={160} y={190} color={card.color} kind={kind} />
      )}
      <text x="160" y="56" textAnchor="middle" fontSize="18" fontWeight="700" fill="#17181a">
        {title}
      </text>
      <text x="160" y="318" textAnchor="middle" fontSize="15" fill="#17181a">
        {engraving.mine}
      </text>
      {engraving.ko && engraving.ko !== engraving.mine && (
        <text x="160" y="342" textAnchor="middle" fontSize="13" fill="#6b6f76">
          {engraving.ko}
        </text>
      )}
      <line x1="40" x2="280" y1="372" y2="372" stroke={card.color} opacity="0.5" />
      <text x="160" y="398" textAnchor="middle" fontSize="12" fill="#6b6f76">
        {placeName} · {date}
      </text>
    </svg>
  );
}
