"use client";
// 3D 매개체(유리병 등) 보기 + AR. 구글 model-viewer 사용.
// AR: 안드로이드는 Scene Viewer/WebXR, 아이폰은 Quick Look(USDZ를 자동 생성). 데스크톱에선 AR 버튼이 숨겨짐.
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  src: string; // public/ 기준 .glb 경로
  alt: string;
  tint?: string; // 카드 색(#RRGGBB)으로 칠할 때
  tintMaterials?: string[]; // 칠할 재질 이름. 없으면 칠하지 않음
  arEnabled?: boolean; // false면 AR 버튼 없음 (앵커 반경 밖)
  className?: string;
  style?: React.CSSProperties; // 크기·배경 덮어쓰기 (예: 투명 배경)
};

// model-viewer 요소에서 쓰는 부분만 타입으로
type MVMaterial = { name: string; pbrMetallicRoughness: { setBaseColorFactor(c: [number, number, number, number]): void } };
type MVElement = HTMLElement & { model?: { materials: MVMaterial[] } };

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

export function ModelViewer({ src, alt, tint, tintMaterials = [], arEnabled = true, className, style }: Props) {
  const { t } = useLanguage();
  const ref = useRef<MVElement>(null);
  const [ready, setReady] = useState(false);

  // 브라우저에서만 등록되는 커스텀 요소라 동적으로 불러옴 (서버 렌더링 중 오류 방지)
  useEffect(() => {
    import("@google/model-viewer").then(() => setReady(true));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !tint || tintMaterials.length === 0) return;
    const apply = () =>
      el.model?.materials
        .filter((m) => tintMaterials.includes(m.name))
        .forEach((m) => m.pbrMetallicRoughness.setBaseColorFactor(hexToRgba(tint)));
    apply();
    el.addEventListener("load", apply);
    return () => el.removeEventListener("load", apply);
  }, [ready, tint, tintMaterials]);

  if (!ready) return <div className={`skeleton ${className ?? ""}`} style={{ aspectRatio: "1 / 1" }} />;

  return (
    <model-viewer
      ref={ref}
      src={src}
      alt={alt}
      ar={arEnabled}
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      auto-rotate
      autoplay
      shadow-intensity="1"
      environment-image="neutral"
      exposure="1.1"
      class={className}
      // 유리는 흰 배경에서 안 보여서 옅은 물빛 배경을 깔아 둠
      style={{ display: "block", width: "100%", height: "min(100vw, 420px)", background: "linear-gradient(#e9f1ef, #d5e3df)", ...style }}
    >
      <button slot="ar-button" className="btn" style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)" }}>
        {t("AR로 이 자리에 놓아 보기")}
      </button>
    </model-viewer>
  );
}

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        alt: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        autoplay?: boolean;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        class?: string;
      };
    }
  }
}
