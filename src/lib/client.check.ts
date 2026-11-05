// 거리 계산·근처 장소 찾기 점검. 실행: node src/lib/client.check.ts
import assert from "node:assert/strict";
import { distanceM, placesNearby } from "./client.ts";

const seoulStation = { lat: 37.5547, lng: 126.9707 };
const cityHall = { lat: 37.5663, lng: 126.9779 };
const d = distanceM(seoulStation, cityHall);
assert.ok(d > 1300 && d < 1500, `서울역-시청 약 1.4km여야 함: ${d}`);
assert.equal(distanceM(cityHall, cityHall), 0);

const places = [
  { slug: "far", name_ko: "", name_en: "", lat: 37.6, lng: 127.0, radius_m: 150 },
  { slug: "near", name_ko: "", name_en: "", lat: 37.5664, lng: 126.978, radius_m: 150 },
  { slug: "nocoord", name_ko: "", name_en: "", lat: null, lng: null, radius_m: 150 },
];
const found = placesNearby(places, cityHall);
assert.deepEqual(found.map((p) => p.slug), ["near"], "반경 안의 장소만, 좌표 없는 장소는 제외");
console.log("client.check OK");
