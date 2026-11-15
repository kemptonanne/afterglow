/** Grab a still frame (~1s in) from a video file as a JPEG. */
export async function videoPoster(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    return await new Promise<Blob>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Video preview timed out")), 20000);
      const capture = () => {
        window.clearTimeout(timer);
        if (!video.videoWidth) return reject(new Error("Video has no frame"));
        const scale = Math.min(1, 1280 / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Poster failed"))), "image/jpeg", 0.85);
      };
      video.onerror = () => reject(new Error("Could not read video"));
      video.onloadeddata = () => {
        const t = Number.isFinite(video.duration) ? Math.min(1, Math.max(0, video.duration - 0.05)) : 1;
        if (t === 0) capture();
        else { video.onseeked = capture; video.currentTime = t; }
      };
      video.src = url;
    });
  } finally {
    video.removeAttribute("src");
    URL.revokeObjectURL(url);
  }
}

export function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function fileExt(file: File, fallback: string) {
  const c = file.name.split(".").pop()?.toLowerCase();
  return c && /^[a-z0-9]{1,8}$/.test(c) ? c : fallback;
}
