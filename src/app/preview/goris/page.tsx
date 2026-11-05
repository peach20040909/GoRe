"use client";
// 고리 15종 확인용: /preview/goris — 봉인·개봉 이미지, 누르면 3D·AR
import { useState } from "react";
import { GORIS, goriAsset } from "@/lib/goris";
import { ModelViewer } from "@/components/ModelViewer";

export default function GoriPreview() {
  const [picked, setPicked] = useState<string | null>(null);
  const g = GORIS.find((x) => x.id === picked);
  return (
    <div className="py-8">
      <h1 className="text-xl font-bold">고리 15종</h1>
      {g && (
        <div className="card mt-4 p-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">{String(g.no).padStart(2, "0")}. {g.name} · {g.place}</p>
            <button className="btn-ghost h-9 rounded-lg px-3 text-sm" onClick={() => setPicked(null)}>닫기</button>
          </div>
          <div className="mt-3"><ModelViewer key={g.id} src={goriAsset(g.id).model} alt={g.name} /></div>
          <p className="mt-3 text-sm">{g.description}</p>
          <p className="mt-1 text-sm text-muted">여닫는 방식: {g.howToOpen}</p>
        </div>
      )}
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GORIS.map((x) => (
          <li key={x.id}>
            <button onClick={() => { setPicked(x.id); scrollTo({ top: 0, behavior: "smooth" }); }} className="card w-full overflow-hidden text-left">
              <div className="grid grid-cols-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={goriAsset(x.id).sealed} alt={`${x.name} 봉인`} className="aspect-square w-full object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={goriAsset(x.id).opened} alt={`${x.name} 개봉`} className="aspect-square w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-sm font-bold">{String(x.no).padStart(2, "0")}. {x.name}</p>
                <p className="text-xs text-muted">{x.place}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
