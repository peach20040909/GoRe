"use client";
// 3D 매개체(유리병 등)·장소 거치대 보기 + AR. 구글 model-viewer 사용.
// AR: 안드로이드는 Scene Viewer/WebXR, 아이폰은 Quick Look(iosSrc의 USDZ, 없으면 자동 생성). 데스크톱에선 AR 버튼이 숨겨짐.
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  src: string; // public/ 기준 .glb 경로
  alt: string;
  iosSrc?: string; // 아이폰 AR용 .usdz (디자이너가 따로 만든 파일이 있을 때)
  tint?: string; // 카드 색(#RRGGBB)으로 칠할 때
  tintMaterials?: string[]; // 칠할 재질 이름. 없으면 칠하지 않음
  arEnabled?: boolean; // false면 AR 버튼 없음 (앵커 반경 밖)
  arLabel?: string; // AR 버튼 문구
  play?: boolean; // 지정하면 애니메이션을 직접 제어: false = 첫 프레임에 멈춤, true = 한 번 재생
  orbit?: string; // 고정 시점 (예: "0deg 80deg 105%"). 주면 자동 회전 끔
  className?: string;
  style?: React.CSSProperties; // 크기·배경 덮어쓰기 (예: 투명 배경)
};

// model-viewer 요소에서 쓰는 부분만 타입으로
type MVMaterial = { name: string; pbrMetallicRoughness: { setBaseColorFactor(c: [number, number, number, number]): void } };
type MVElement = HTMLElement & {
  model?: { materials: MVMaterial[] };
  play(opts?: { repetitions?: number }): void;
  pause(): void;
  currentTime: number;
};

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
}

export function ModelViewer({ src, alt, iosSrc, tint, tintMaterials = [], arEnabled = true, arLabel, play, orbit, className, style }: Props) {
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

  // play가 주어지면: 로드 직후엔 첫 프레임에 멈춰 두고, true가 되는 순간 처음부터 한 번 재생
  useEffect(() => {
    const el = ref.current;
    if (!el || play === undefined) return;
    const apply = () => {
      el.currentTime = 0;
      if (play) el.play({ repetitions: 1 });
      else el.pause();
    };
    apply();
    el.addEventListener("load", apply);
    return () => el.removeEventListener("load", apply);
  }, [ready, play]);

  if (!ready) return <div className={`skeleton ${className ?? ""}`} style={{ aspectRatio: "1 / 1", ...style }} />;

  return (
    <model-viewer
      ref={ref}
      src={src}
      alt={alt}
      ios-src={iosSrc}
      ar={arEnabled}
      ar-modes="webxr scene-viewer quick-look"
      ar-placement="floor"
      camera-controls
      auto-rotate={orbit ? undefined : true}
      camera-orbit={orbit}
      autoplay={play === undefined ? true : undefined}
      shadow-intensity="1"
      environment-image="neutral"
      exposure="1.1"
      class={className}
      // 유리는 흰 배경에서 안 보여서 옅은 물빛 배경을 깔아 둠
      style={{ display: "block", width: "100%", height: "min(100vw, 420px)", background: "linear-gradient(#e9f1ef, #d5e3df)", ...style }}
    >
      <button slot="ar-button" className="btn" style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
        {t(arLabel ?? "AR로 이 자리에 놓아 보기")}
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
        "ios-src"?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "ar-placement"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "camera-orbit"?: string;
        autoplay?: boolean;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        class?: string;
      };
    }
  }
}
