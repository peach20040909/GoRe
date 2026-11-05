"use client";
// 3D·AR 확인용: /preview/ar — 휴대폰으로 열면 'AR로 이 자리에 놓아 보기' 버튼이 보임
import { useState } from "react";
import { ModelViewer } from "@/components/ModelViewer";

const SKY = ["#87CEEB", "#E07A5F", "#F2A541", "#7FA7D9"];

export default function ArPreview() {
  const [tint, setTint] = useState(SKY[0]);
  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-xl font-bold">홍제폭포 · 유리병 편지</h1>
      <p className="mt-1 text-sm text-muted">카드 색(그날의 하늘색)으로 편지의 물빛을 바꿔 봅니다.</p>
      <div className="mt-4 flex gap-2">
        {SKY.map((c) => (
          <button
            key={c}
            aria-label={`색 ${c}`}
            onClick={() => setTint(c)}
            className="h-11 w-11 rounded-full border-2"
            style={{ background: c, borderColor: tint === c ? "#17181a" : "transparent" }}
          />
        ))}
      </div>
      <div className="card mt-4 overflow-hidden">
        <ModelViewer
          src="/models/hongje-bottle.glb"
          alt="홍제폭포가 그려진 편지가 담긴 유리병"
          tint={tint}
          tintMaterials={["Cascades in mist ink"]}
        />
      </div>
    </div>
  );
}
