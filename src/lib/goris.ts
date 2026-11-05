// 고리(매개체) 18종 카탈로그. 출처: 팀 제작 자료(기록문화_타임캡슐_15종, 제작_레퍼런스.md)
// 파일: public/goris/<id>/sealed.webp · opened.webp · model.glb (Blender 원본에서 변환, 가장 긴 변 30cm)
import type { Medium } from "@/components/MemoryCard";

export type Gori = {
  no: number;
  id: string;
  name: string; // 고리 이름
  place: string; // 모티프 장소 (기본 고리는 "어디서나")
  placeSlug: string | null; // places 테이블 slug (DB에 등록된 장소만)
  description: string; // 상세정보 설명
  howToOpen: string; // 서비스에서 여닫는 방식
  cardShape: Medium; // 기억 카드 SVG에서 쓸 기본 모양
};

export const goriAsset = (id: string) => ({
  sealed: `/goris/${id}/sealed.webp`,
  opened: `/goris/${id}/opened.webp`,
  model: `/goris/${id}/model.glb`,
});

export const GORIS: Gori[] = [
  { no: 1, id: "sinchon-ticket", name: "경의선 왕복표", place: "구 신촌역사", placeSlug: "sinchon-station", cardShape: "paper",
    description: "구 신촌역사에서 출발하는 옛 기차표를 본뜬 고리예요. 신촌에서 찍은 사진과 그날의 이야기를 한 장의 왕복표에 담아보세요.",
    howToOpen: "‘신촌발’ 표가 받침 위를 밀어 덮고 안쪽 기록을 가려요." },
  { no: 2, id: "dino-box", name: "공룡 발굴함", place: "서대문자연사박물관", placeSlug: "sdm-natural-history", cardShape: "lock",
    description: "박물관 중앙홀의 아크로칸토사우루스 골격을 담은 발굴함이에요. 뚜껑을 열면 공룡 뼈와 함께 그날의 기록이 드러나요.",
    howToOpen: "퇴적층을 본뜬 상자의 덮개를 들어 골격을 드러내요." },
  { no: 3, id: "valve-t4", name: "비축 밸브", place: "문화비축기지 T4", placeSlug: "oil-tank-t4", cardShape: "lock",
    description: "문화비축기지의 둥근 석유탱크와 셔터를 작게 옮겼어요. 빨간 손바퀴를 돌리면 셔터가 열리고 안에 넣어 둔 기록을 볼 수 있어요.",
    howToOpen: "손바퀴를 돌리면 셔터가 열려요." },
  { no: 4, id: "periscope", name: "잠망경", place: "서울함공원", placeSlug: "seoul-battleship", cardShape: "lock",
    description: "서울함공원에 전시된 잠망경을 본떴어요. 한강을 바라보던 자리에서 눈에 들어온 장면을 사진으로 남겨보세요.",
    howToOpen: "본체가 올라오고 접안부 덮개가 옆으로 밀려요." },
  { no: 5, id: "jogakbo", name: "조각보 매듭", place: "서울공예박물관", placeSlug: "craft-museum", cardShape: "paper",
    description: "여러 색의 천 조각을 이어 만든 조각보에서 따왔어요. 매듭을 풀면 보자기 안에 싸 두었던 사진과 한 줄이 나타나요.",
    howToOpen: "천이 기록 카드 위로 모이고 가운데 매듭이 생겨요. 펼치면 카드를 볼 수 있어요." },
  { no: 6, id: "cassette", name: "카세트", place: "서울우리소리박물관", placeSlug: "sori-museum", cardShape: "lock",
    description: "우리소리를 담았던 카세트테이프와 투명 케이스를 본떴어요. 그날 들은 소리 중 기억하고 싶은 하나를 글로 남겨보세요.",
    howToOpen: "카세트를 담은 투명 케이스를 경첩으로 여닫아요." },
  { no: 7, id: "memory-vault", name: "기억 금고", place: "한국은행 화폐박물관", placeSlug: "money-museum", cardShape: "lock",
    description: "화폐박물관의 금고에서 따온 고리예요. 다이얼을 돌려 문을 열면 그날 넣어 둔 사진과 글이 나타나요.",
    howToOpen: "다이얼을 돌리고 측면 경첩을 열어 안쪽의 기록 묶음을 봐요." },
  { no: 8, id: "film-can", name: "필름 통", place: "명동예술극장", placeSlug: "myeongdong-theater", cardShape: "lock",
    description: "오래된 영화 필름 통에 명동예술극장의 아치형 창 모양을 더했어요. 오늘 본 공연에서 오래 기억하고 싶은 한 장면을 담아보세요.",
    howToOpen: "뚜껑을 들어 안쪽 릴을 드러내고 극장 창 모티프가 있는 필름이 나와요." },
  { no: 9, id: "giwa", name: "맞물림 기와", place: "은평역사한옥박물관", placeSlug: "eunpyeong-hanok", cardShape: "lock",
    description: "오목한 기와 두 장 사이를 둥근 기와 한 장이 덮는 한옥 지붕의 구조를 본떴어요. 가운데 기와를 밀면 그 아래 감춰 둔 기록이 나타나요.",
    howToOpen: "이음새를 덮는 볼록한 기와가 밀려 열리고 안쪽 기록을 보여줘요." },
  { no: 10, id: "hanji-envelope", name: "한지 보존 봉투", place: "진관사 칠성각", placeSlug: "jingwansa", cardShape: "paper",
    description: "칠성각에서 발견된 옛 신문이 싸인 채 보존됐던 이야기에서 출발했어요. 접은 한지 사이에 진관사에서 남기고 싶은 한 줄을 넣어보세요.",
    howToOpen: "접은 한지를 포개어 묶고 녹색 보존함에 넣었다가 빼내요." },
  { no: 11, id: "love-lock", name: "사랑의 자물쇠", place: "어디서나 (기본 고리)", placeSlug: null, cardShape: "lock",
    description: "남산의 사랑의 자물쇠를 떠올리며 만든 붉은 하트 고리예요. 함께 온 사람에게 전하고 싶은 말을 사진과 함께 잠가 두세요.",
    howToOpen: "금속 고리의 한쪽을 들어 올리고 회전시켜 열어요." },
  { no: 12, id: "manuscript", name: "원고첩", place: "핀슨관 모티프", placeSlug: "pinson-hall", cardShape: "paper",
    description: "윤동주 친필 원고의 세로로 놓인 글줄을 본뜬 원고첩이에요. 표지를 열고 오늘 오래 기억하고 싶은 문장 하나를 적어보세요.",
    howToOpen: "원고첩 표지를 열어 한 줄을 쓸 수 있는 지면이 나타나요." },
  { no: 13, id: "beacon", name: "봉화", place: "안산 봉수대", placeSlug: "ansan-beacon", cardShape: "beacon",
    description: "안산 봉수대의 돌단과 아궁이를 본떠 만든 고리예요. 석판을 밀면 작은 불씨와 함께 그날 안산에서 남긴 기록이 드러나요.",
    howToOpen: "석판이 옆으로 밀려 아궁이 안 불씨가 드러나요." },
  { no: 14, id: "glass-bottle", name: "유리병 편지", place: "홍제폭포", placeSlug: "hongje-falls", cardShape: "bottle",
    description: "홍제폭포 앞에서 보낸 시간을 코르크 마개가 달린 유리병에 담아요. 다시 그 자리에 오면 병을 열어 그날의 편지와 사진을 꺼내 볼 수 있어요.",
    howToOpen: "마개를 빼면 편지가 병 입구를 지나 펼쳐져요." },
  { no: 15, id: "memorial-letter", name: "추모 편지", place: "서대문형무소역사관", placeSlug: "seodaemun-prison", cardShape: "paper",
    description: "역사관의 붉은 벽돌과 전시 기록물에서 색과 형태를 가져온 편지예요. 전시를 보고 오래 기억하고 싶은 이름이나 마음을 한 줄 남겨보세요.",
    howToOpen: "봉투의 접은 부분을 열어 방문자가 쓴 추모 문장을 꺼내요." },
  { no: 16, id: "myongji-horse", name: "백마 자물쇠", place: "명지대학교 인문캠퍼스", placeSlug: "demo-hall", cardShape: "lock",
    description: "명지대를 상징하는 흰 백마를 파란 자물쇠에 새겼어요. 캠퍼스에서 오래 기억하고 싶은 하루를 사진과 한 줄로 남겨보세요.",
    howToOpen: "자물쇠 고리를 들어 올려 열어요." },
  { no: 17, id: "dongnimmun-arch", name: "돌 아치 고리", place: "서울 독립문", placeSlug: "dongnimmun", cardShape: "lock",
    description: "독립문의 열린 돌 아치와 안쪽의 붉은 벽돌을 본뜬 고리예요. 아치 너머로 보이던 풍경과 그 자리에서 든 생각을 담아보세요.",
    howToOpen: "아치 안쪽이 열리며 그날의 기록이 드러나요." },
  { no: 18, id: "gyeongbok-borok", name: "왕실 보록 자물쇠", place: "경복궁", placeSlug: "gyeongbokgung", cardShape: "lock",
    description: "1726년 선의왕후의 옥도장을 보관하던 함의 자물쇠를 본떴어요. 꽃과 덩굴 무늬가 새겨진 자물쇠에 경복궁에서 보낸 하루를 잠가 두세요.",
    howToOpen: "보록 자물쇠를 풀어 함을 열어요." },
];

export const DEFAULT_GORI = GORIS.find((g) => g.id === "love-lock")!;
export const GORI_IDS = GORIS.map((g) => g.id);
export const goriById = (id: string) => GORIS.find((g) => g.id === id);
