import type { WallpaperPreset } from "./presets";

export type RenderOptions = {
  image: HTMLImageElement;
  preset: WallpaperPreset;
  dateText: string;
  locationText: string;
};

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): void {
  const imageRatio = image.width / image.height;
  const targetRatio = targetWidth / targetHeight;

  let drawWidth = targetWidth;
  let drawHeight = targetHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > targetRatio) {
    drawHeight = targetHeight;
    drawWidth = targetHeight * imageRatio;
    offsetX = (targetWidth - drawWidth) / 2;
  } else {
    drawWidth = targetWidth;
    drawHeight = targetWidth / imageRatio;
    offsetY = (targetHeight - drawHeight) / 2;
  }

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

export function renderWallpaperCanvas(options: RenderOptions): HTMLCanvasElement {
  const { image, preset, dateText, locationText } = options;
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");
  }

  drawCoverImage(context, image, preset.width, preset.height);

  const gradient = context.createLinearGradient(0, preset.height * 0.55, 0, preset.height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.55)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, preset.width, preset.height);

  const margin = Math.max(48, Math.floor(preset.width * 0.04));
  const dateFontSize = Math.max(40, Math.floor(preset.width * 0.024));
  const locationFontSize = Math.max(30, Math.floor(preset.width * 0.017));

  context.textBaseline = "bottom";
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0,0,0,0.6)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 3;
  context.textAlign = "left";

  context.font = `700 ${dateFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  context.fillText(dateText, margin, preset.height - margin - locationFontSize - 16);

  context.font = `500 ${locationFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  context.fillText(locationText, margin, preset.height - margin);

  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  return canvas;
}
