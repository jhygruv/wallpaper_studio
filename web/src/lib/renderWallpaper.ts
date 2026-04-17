import type { WallpaperPreset } from "./presets";

export type TextPosition =
  | "left-top"
  | "center-top"
  | "right-top"
  | "left-middle"
  | "center-middle"
  | "right-middle"
  | "left-bottom"
  | "center-bottom"
  | "right-bottom";

export type RenderOptions = {
  image: HTMLImageElement;
  preset: WallpaperPreset;
  dateText: string;
  timeText: string;
  locationText: string;
  fontScale: number;
  textPosition: TextPosition;
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
  const { image, preset, dateText, timeText, locationText, fontScale, textPosition } = options;
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

  const normalizedScale = Number.isFinite(fontScale) ? Math.max(0.6, Math.min(fontScale, 2.2)) : 1;
  const margin = Math.max(48, Math.floor(preset.width * 0.04));
  const dateFontSize = Math.max(24, Math.floor(preset.width * 0.024 * normalizedScale));
  const timeFontSize = Math.max(20, Math.floor(preset.width * 0.019 * normalizedScale));
  const locationFontSize = Math.max(18, Math.floor(preset.width * 0.017 * normalizedScale));
  const lineSpacing = Math.max(8, Math.floor(preset.width * 0.006 * normalizedScale));

  context.textBaseline = "top";
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0,0,0,0.6)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 3;
  context.textAlign = "left";

  const lines = [
    {
      text: dateText.trim(),
      font: `700 ${dateFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      size: dateFontSize
    },
    {
      text: timeText.trim(),
      font: `500 ${timeFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      size: timeFontSize
    },
    {
      text: locationText.trim(),
      font: `500 ${locationFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      size: locationFontSize
    }
  ].filter((line) => line.text.length > 0);

  if (lines.length > 0) {
    const totalTextHeight =
      lines.reduce((sum, line) => sum + line.size, 0) + lineSpacing * Math.max(lines.length - 1, 0);

    let maxLineWidth = 0;
    for (const line of lines) {
      context.font = line.font;
      const measured = context.measureText(line.text);
      maxLineWidth = Math.max(maxLineWidth, measured.width);
    }

    const [horizontal, vertical] = textPosition.split("-");
    const blockLeft = margin;
    const blockRight = preset.width - margin;
    const blockCenterX = preset.width / 2;
    const blockTop = margin;
    const blockBottom = preset.height - margin;
    const blockMiddleY = (preset.height - totalTextHeight) / 2;

    let x = blockLeft;
    if (horizontal === "center") {
      x = blockCenterX;
      context.textAlign = "center";
    } else if (horizontal === "right") {
      x = blockRight;
      context.textAlign = "right";
    } else {
      context.textAlign = "left";
    }

    let currentY = blockTop;
    if (vertical === "middle") {
      currentY = blockMiddleY;
    } else if (vertical === "bottom") {
      currentY = blockBottom - totalTextHeight;
    }

    // Keep text block fully visible even with large font scale.
    if (horizontal === "center") {
      x = Math.max(margin + maxLineWidth / 2, Math.min(preset.width - margin - maxLineWidth / 2, x));
    }

    currentY = Math.max(margin, Math.min(preset.height - margin - totalTextHeight, currentY));

    for (const line of lines) {
      context.font = line.font;
      context.fillText(line.text, x, currentY);
      currentY += line.size + lineSpacing;
    }
  }

  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.textAlign = "left";

  return canvas;
}
