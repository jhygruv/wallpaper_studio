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
  | "right-bottom"
  | "iphone-recommended";

export type RenderOptions = {
  image: HTMLImageElement;
  preset: WallpaperPreset;
  dateText: string;
  timeText: string;
  locationText: string;
  fontScale: number;
  textPosition: TextPosition;
  useSafeArea: boolean;
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
  const { image, preset, dateText, timeText, locationText, fontScale, textPosition, useSafeArea } = options;
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
  const isMobilePreset = preset.id.includes("mobile") || preset.id.includes("iphone");
  const mobilePresetBoost = isMobilePreset ? 1.2 : 1;
  const effectiveScale = normalizedScale * mobilePresetBoost;
  const baseMargin = Math.max(48, Math.floor(preset.width * 0.04));
  const safeInsetX = Math.max(0, Math.floor((preset.width * preset.safeAreaXPercent) / 100));
  const safeInsetTop = Math.max(0, Math.floor((preset.height * preset.safeAreaTopPercent) / 100));
  const safeInsetBottom = Math.max(0, Math.floor((preset.height * preset.safeAreaBottomPercent) / 100));
  const leftBoundary = useSafeArea ? Math.max(baseMargin, safeInsetX) : baseMargin;
  const rightBoundary = useSafeArea
    ? Math.min(preset.width - baseMargin, preset.width - safeInsetX)
    : preset.width - baseMargin;
  const topBoundary = useSafeArea ? Math.max(baseMargin, safeInsetTop) : baseMargin;
  const bottomBoundary = useSafeArea
    ? Math.min(preset.height - baseMargin, preset.height - safeInsetBottom)
    : preset.height - baseMargin;
  const dateFontSize = Math.max(24, Math.floor(preset.width * 0.024 * effectiveScale));
  const timeFontSize = Math.max(20, Math.floor(preset.width * 0.019 * effectiveScale));
  const locationFontSize = Math.max(18, Math.floor(preset.width * 0.017 * effectiveScale));
  const lineSpacing = Math.max(8, Math.floor(preset.width * 0.006 * effectiveScale));

  context.textBaseline = "alphabetic";
  context.fillStyle = "#ffffff";
  context.shadowColor = "rgba(0,0,0,0.6)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 3;
  context.textAlign = "left";

  const lineCandidates = [
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

  if (lineCandidates.length > 0) {
    const lines = lineCandidates.map((line) => {
      context.font = line.font;
      const measured = context.measureText(line.text);
      const ascent = measured.actualBoundingBoxAscent || line.size * 0.78;
      const descent = measured.actualBoundingBoxDescent || line.size * 0.24;
      return {
        ...line,
        width: measured.width,
        ascent,
        descent,
        height: ascent + descent
      };
    });

    const totalTextHeight =
      lines.reduce((sum, line) => sum + line.height, 0) + lineSpacing * Math.max(lines.length - 1, 0);

    const maxLineWidth = lines.reduce((max, line) => Math.max(max, line.width), 0);

    const isIphoneRecommendedPosition = textPosition === "iphone-recommended";
    const [horizontal, vertical] = isIphoneRecommendedPosition
      ? (["center", "middle"] as const)
      : textPosition.split("-");
    const blockLeft = leftBoundary;
    const blockRight = rightBoundary;
    const blockCenterX = (leftBoundary + rightBoundary) / 2;
    const blockTop = topBoundary;
    const blockBottom = bottomBoundary;
    const blockMiddleY = (topBoundary + bottomBoundary - totalTextHeight) / 2;

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

    if (isIphoneRecommendedPosition && preset.id.includes("iphone")) {
      // Empirical lock-screen anchor around the midpoint between flashlight/camera controls.
      const iphoneRecommendedCenterY = preset.height * 0.9;
      currentY = iphoneRecommendedCenterY - totalTextHeight / 2;
    }

    // Keep text block fully visible even with large font scale.
    if (horizontal === "center") {
      x = Math.max(blockLeft + maxLineWidth / 2, Math.min(blockRight - maxLineWidth / 2, x));
    }

    let minY = blockTop;
    let maxY = blockBottom - totalTextHeight;
    if (isIphoneRecommendedPosition && preset.id.includes("iphone")) {
      // For iPhone recommended position, use a lock-screen-specific clamp range
      // so safe-area bottom inset does not pull text too far upward.
      minY = Math.max(16, Math.floor(preset.height * 0.55));
      maxY = Math.max(minY, preset.height - totalTextHeight - Math.max(18, Math.floor(preset.height * 0.03)));
    }
    currentY = Math.max(minY, Math.min(maxY, currentY));

    for (const line of lines) {
      context.font = line.font;
      context.fillText(line.text, x, currentY + line.ascent);
      currentY += line.height + lineSpacing;
    }
  }

  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.textAlign = "left";

  return canvas;
}
