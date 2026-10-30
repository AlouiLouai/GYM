import type { Messages } from "@/core/i18n";

export interface CardData {
  t: Messages;
  rtl: boolean;
  exercise: string;
  reps: number;
  /** Overrides the big number and its label (a hold shows its time instead of reps). */
  headline?: { value: string; label: string };
  score: number;
  weight: string | null;
  streak: number;
  pr: boolean;
}

const W = 1080;
const H = 1350;
const LIME = "#a3e635";

/** Draws a story-sized summary image of the set. Everything is centred, so it reads the same in RTL. */
function draw(d: CardData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  ctx.direction = d.rtl ? "rtl" : "ltr";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#18181b");
  bg.addColorStop(1, "#09090b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(163, 230, 53, 0.12)";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.12, 380, 0, Math.PI * 2);
  ctx.fill();

  const text = (s: string, y: number, size: number, color = "#fafafa", weight = 700) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(s, W / 2, y, W - 120);
  };

  text("GYM COACH", 110, 44, LIME, 800);
  text(d.exercise, 220, 76);
  if (d.weight) text(d.weight, 310, 56, "#d4d4d8", 600);

  // Reps, big.
  text(d.headline?.value ?? String(d.reps), 520, 300, "#fafafa", 800);
  text(d.headline?.label ?? d.t.ui.repsLabel, 700, 44, "#a1a1aa", 600);

  // Form score ring.
  const cx = W / 2;
  const cy = 930;
  const r = 130;
  ctx.lineWidth = 26;
  ctx.strokeStyle = "#27272a";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = LIME;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, d.score)) / 100);
  ctx.stroke();
  text(String(d.score), cy - 10, 96);
  text(d.t.ui.formLabel, cy + 62, 30, "#a1a1aa", 600);

  let y = 1140;
  if (d.pr) {
    ctx.fillStyle = LIME;
    const label = `🏆 ${d.t.ui.newPr}`;
    ctx.font = `800 48px ${font}`;
    const w = Math.min(W - 160, ctx.measureText(label).width + 80);
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - 45, w, 90, 45);
    ctx.fill();
    text(label, y, 48, "#09090b", 800);
    y += 110;
  } else if (d.streak > 1) {
    text(`🔥 ${d.t.ui.streak(d.streak)}`, y, 48, "#fbbf24", 700);
    y += 90;
  }
  text(`${d.t.ui.shareCta} · ${location.host}`, Math.max(y, 1270), 34, "#71717a", 500);
  return canvas;
}

/** Opens the share sheet with the card image, or downloads it where file sharing isn't supported. */
export async function shareCard(d: CardData): Promise<"shared" | "saved" | "cancelled"> {
  const canvas = draw(d);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return "cancelled";
  const file = new File([blob], "gym-coach-set.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: d.t.ui.shareTitle, text: `${d.t.ui.shareCta}: ${location.origin}` });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "saved";
}
