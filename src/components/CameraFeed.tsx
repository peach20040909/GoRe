"use client";
// 후면 카메라 화면 (Figma 03·10의 "Camera feed"). 권한이 없거나 지원 안 하면 빈 화면 + 파일 선택으로 대체.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type CameraHandle = { capture: () => string | null; live: boolean };

export const CameraFeed = forwardRef<CameraHandle, { className?: string }>(function CameraFeed({ className }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
          setLive(true);
        }
      })
      .catch(() => setLive(false));
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useImperativeHandle(ref, () => ({
    live,
    capture() {
      const v = video.current;
      if (!live || !v?.videoWidth) return null;
      const k = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * k);
      c.height = Math.round(v.videoHeight * k);
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    },
  }), [live]);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-canvas ${className ?? ""}`}>
      <video ref={video} playsInline muted className="size-full object-cover" style={{ opacity: live ? 1 : 0 }} />
    </div>
  );
});
