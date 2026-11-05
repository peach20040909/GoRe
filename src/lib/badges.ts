// 수집 배지 12종 (Figma 04 수집 · 장소 배지). 배지에 연결된 장소에 고리를 하나라도 남기면 획득.
// places: 우리 DB의 place slug. 디자인의 모티프 장소가 DB에 없으면 성격이 가까운 장소에 연결함.
export type Badge = { id: string; name: string; category: string; motif: string; description: string; places: string[] };

export const BADGES: Badge[] = [
  { id: "namsan", name: "남산의 능선", category: "자연·경관", motif: "남산 · N서울타워", places: ["ansan-beacon"],
    description: "겹겹이 이어진 능선과 둥근 달을 담았어요. 오늘 남긴 마음을 기억하는 배지예요." },
  { id: "hongje", name: "홍제의 물결", category: "자연·경관", motif: "홍제폭포", places: ["hongje-falls"],
    description: "바위를 타고 떨어지는 홍제폭포의 물결을 담은 배지예요." },
  { id: "inwang", name: "인왕의 바위", category: "자연·경관", motif: "인왕산", places: [],
    description: "도심 가까이 우뚝 선 인왕산의 너른 바위를 담은 배지예요." },
  { id: "dancheong", name: "궁궐의 단청", category: "역사·문화유산", motif: "경복궁", places: ["gyeongbokgung"],
    description: "궁궐 처마 아래 고운 단청 무늬를 담은 배지예요." },
  { id: "hanok", name: "한옥의 처마", category: "역사·문화유산", motif: "은평역사한옥박물관", places: ["eunpyeong-hanok"],
    description: "부드럽게 들린 한옥 처마의 선을 담은 배지예요." },
  { id: "lotus", name: "연꽃의 결", category: "역사·문화유산", motif: "진관사", places: ["jingwansa"],
    description: "절 마당에 피어난 연꽃의 결을 담은 배지예요." },
  { id: "tower", name: "서울의 빛", category: "도시 명소", motif: "서대문형무소역사관", places: ["seodaemun-prison", "sinchon-station"],
    description: "밤에도 꺼지지 않는 서울의 빛을 담은 배지예요." },
  { id: "bridge", name: "한강의 연결", category: "도시 명소", motif: "서울함공원 · 한강", places: ["seoul-battleship", "oil-tank-t4"],
    description: "강 이쪽과 저쪽을 잇는 한강 다리를 담은 배지예요." },
  { id: "wall", name: "성곽의 길", category: "도시 명소", motif: "독립문", places: ["dongnimmun"],
    description: "돌을 하나하나 쌓아 올린 옛길의 시간을 담은 배지예요." },
  { id: "stage", name: "무대의 울림", category: "문화·예술공간", motif: "명동예술극장", places: ["myeongdong-theater", "sori-museum"],
    description: "막이 오르던 순간의 울림을 담은 배지예요." },
  { id: "book", name: "책 속의 산책", category: "문화·예술공간", motif: "명지대학교 · 핀슨관", places: ["demo-hall", "pinson-hall"],
    description: "책장 사이를 걷던 캠퍼스의 하루를 담은 배지예요." },
  { id: "craft", name: "공예의 손길", category: "문화·예술공간", motif: "서울공예박물관", places: ["craft-museum", "sdm-natural-history", "money-museum"],
    description: "손으로 빚고 엮은 공예의 결을 담은 배지예요." },
];

export const CATEGORIES = [...new Set(BADGES.map((b) => b.category))];
export const badgeArt = (id: string) => `/badges/${id}.svg`;

/** 내 기억 목록 → 배지별 첫 획득 기록 */
export function earnedBadges(mem: { placeSlug: string | null; placeName: string | null; createdAt: string }[]) {
  const first = new Map<string, { at: string; placeName: string }>();
  for (const m of [...mem].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    for (const b of BADGES)
      if (m.placeSlug && b.places.includes(m.placeSlug) && !first.has(b.id)) first.set(b.id, { at: m.createdAt, placeName: m.placeName ?? "" });
  return first;
}
