"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { extractPhotoMeta, formatCapturedAt, formatCapturedTime } from "../lib/exif";
import { getPresetById, WALLPAPER_PRESETS } from "../lib/presets";
import { renderWallpaperCanvas } from "../lib/renderWallpaper";
import type { TextPosition } from "../lib/renderWallpaper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

type ReverseGeocodeResponse = {
  location: string;
  parts?: string[];
};

const LANGUAGE_OPTIONS = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" }
] as const;
const FONT_SCALE_STEPS = [80, 90, 100, 115, 130] as const;

const TEXT_POSITION_OPTIONS: Array<{ value: TextPosition; label: string }> = [
  { value: "left-top", label: "좌측/상단" },
  { value: "center-top", label: "가운데/상단" },
  { value: "right-top", label: "우측/상단" },
  { value: "left-middle", label: "좌측/가운데" },
  { value: "center-middle", label: "가운데/가운데" },
  { value: "right-middle", label: "우측/가운데" },
  { value: "left-bottom", label: "좌측/하단" },
  { value: "center-bottom", label: "가운데/하단" },
  { value: "right-bottom", label: "우측/하단" }
];

function readFileAsImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 로드에 실패했습니다."));
    };
    image.src = objectUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: string
): Promise<ReverseGeocodeResponse | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reverse-geocode?lat=${latitude}&lon=${longitude}&lang=${encodeURIComponent(
        language
      )}`
    );
    const data = (await response.json()) as ReverseGeocodeResponse;
    if (!response.ok) {
      return data.location?.trim() ? data : null;
    }
    return data.location?.trim() ? data : null;
  } catch {
    return null;
  }
}

function joinLocationParts(parts: string[], language: string): string {
  const lang = language.toLowerCase();
  const separator = lang.startsWith("ko") || lang.startsWith("ja") ? " " : ", ";
  return parts.join(separator).trim();
}

export default function HomePage(): JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [capturedAtText, setCapturedAtText] = useState<string>("촬영 날짜 없음");
  const [capturedTimeText, setCapturedTimeText] = useState<string>("촬영 시간 없음");
  const [autoLocationText, setAutoLocationText] = useState<string>("");
  const [autoLocationParts, setAutoLocationParts] = useState<string[]>([]);
  const [activeAutoLocationParts, setActiveAutoLocationParts] = useState<boolean[]>([]);
  const [manualLocationText, setManualLocationText] = useState<string>("");
  const [presetId, setPresetId] = useState<string>(WALLPAPER_PRESETS[0].id);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [displayLanguage, setDisplayLanguage] = useState<string>("ko");
  const [showDateOnWallpaper, setShowDateOnWallpaper] = useState<boolean>(true);
  const [showTimeOnWallpaper, setShowTimeOnWallpaper] = useState<boolean>(true);
  const [showAutoLocationOnWallpaper, setShowAutoLocationOnWallpaper] = useState<boolean>(true);
  const [showManualLocationOnWallpaper, setShowManualLocationOnWallpaper] = useState<boolean>(false);
  const [fontScaleStepIndex, setFontScaleStepIndex] = useState<number>(2);
  const [textPosition, setTextPosition] = useState<TextPosition>("left-bottom");
  const [useSafeArea, setUseSafeArea] = useState<boolean>(true);
  const fontScalePercent = FONT_SCALE_STEPS[fontScaleStepIndex];
  const currentPreset = useMemo(() => getPresetById(presetId), [presetId]);

  const effectiveLocationText = useMemo(() => {
    const manual = manualLocationText.trim();
    if (manual.length > 0) {
      return manual;
    }
    return autoLocationText.trim() || "위치 정보 없음";
  }, [autoLocationText, manualLocationText]);

  const selectedAutoLocationText = useMemo(() => {
    if (autoLocationParts.length > 0 && activeAutoLocationParts.length === autoLocationParts.length) {
      const selectedParts = autoLocationParts.filter((_, index) => activeAutoLocationParts[index]);
      if (selectedParts.length === 0) {
        return "";
      }
      return joinLocationParts(selectedParts, displayLanguage);
    }
    return autoLocationText.trim();
  }, [activeAutoLocationParts, autoLocationParts, autoLocationText, displayLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const isMobileViewport = window.matchMedia("(max-width: 720px)").matches;
    if (isMobileViewport) {
      setPresetId("mobile_9_19_5");
    }
  }, []);

  function getOverlayTexts(
    dateText: string,
    timeText: string,
    locationText: string,
    visibility?: {
      showDate?: boolean;
      showTime?: boolean;
    }
  ): {
    dateText: string;
    timeText: string;
    locationText: string;
  } {
    const showDate = visibility?.showDate ?? showDateOnWallpaper;
    const showTime = visibility?.showTime ?? showTimeOnWallpaper;
    return {
      dateText: showDate ? dateText : "",
      timeText: showDate && showTime ? timeText : "",
      locationText
    };
  }

  function resolveLocationText(visibility?: {
    showAutoLocation?: boolean;
    showManualLocation?: boolean;
    autoLocation?: string;
    manualLocation?: string;
  }): string {
    const showAutoLocation = visibility?.showAutoLocation ?? showAutoLocationOnWallpaper;
    const showManualLocation = visibility?.showManualLocation ?? showManualLocationOnWallpaper;
    const autoLocation = (visibility?.autoLocation ?? selectedAutoLocationText).trim();
    const manualLocation = (visibility?.manualLocation ?? manualLocationText).trim();

    if (showManualLocation) {
      return manualLocation;
    }
    if (showAutoLocation) {
      return autoLocation;
    }
    return "";
  }

  async function generatePreview(
    file: File,
    dateText: string,
    timeText: string,
    locationText: string,
    targetPresetId: string,
    visibility?: {
      showDate?: boolean;
      showTime?: boolean;
      showLocation?: boolean;
    },
    textStyle?: {
      fontScalePercent?: number;
      textPosition?: TextPosition;
      useSafeArea?: boolean;
    }
  ): Promise<void> {
    const image = await readFileAsImage(file);
    const preset = getPresetById(targetPresetId);
    const overlayTexts = getOverlayTexts(dateText, timeText, locationText, visibility);
    const effectiveFontScalePercent = textStyle?.fontScalePercent ?? fontScalePercent;
    const effectiveTextPosition = textStyle?.textPosition ?? textPosition;
    const effectiveUseSafeArea = textStyle?.useSafeArea ?? useSafeArea;
    const canvas = renderWallpaperCanvas({
      image,
      preset,
      dateText: overlayTexts.dateText,
      timeText: overlayTexts.timeText,
      locationText: overlayTexts.locationText,
      fontScale: effectiveFontScalePercent / 100,
      textPosition: effectiveTextPosition,
      useSafeArea: effectiveUseSafeArea
    });
    const url = canvas.toDataURL("image/jpeg", 0.92);
    setPreviewUrl(url);
    setPreviewSize({ width: preset.width, height: preset.height });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedFile(file);
    setIsLoading(true);
    setStatusMessage("메타 정보를 읽는 중...");
    setPreviewUrl("");
    setPreviewSize(null);
    try {
      const meta = await extractPhotoMeta(file);
      const locale =
        displayLanguage === "en" ? "en-US" : displayLanguage === "ja" ? "ja-JP" : "ko-KR";
      const nextDateText = formatCapturedAt(meta.capturedAt, locale);
      const nextTimeText = formatCapturedTime(meta.capturedAt, locale);
      let nextAutoLocationText = "";
      setCapturedAtText(nextDateText);
      setCapturedTimeText(nextTimeText);
      if (meta.latitude !== null && meta.longitude !== null) {
        const geocode = await reverseGeocode(meta.latitude, meta.longitude, displayLanguage);
        if (geocode) {
          const nextParts = geocode.parts?.filter(Boolean) ?? [];
          nextAutoLocationText = geocode.location;
          setAutoLocationText(nextAutoLocationText);
          setAutoLocationParts(nextParts);
          setActiveAutoLocationParts(nextParts.map(() => true));
          setManualLocationText(nextAutoLocationText);
          setStatusMessage("촬영 위치를 자동으로 찾았습니다.");
        } else {
          nextAutoLocationText = `${meta.latitude.toFixed(5)}, ${meta.longitude.toFixed(5)}`;
          setAutoLocationText(nextAutoLocationText);
          setAutoLocationParts([nextAutoLocationText]);
          setActiveAutoLocationParts([true]);
          setManualLocationText(nextAutoLocationText);
          setStatusMessage("주소 변환에 실패해 좌표로 표시했습니다. 필요하면 수동 입력해 주세요.");
        }
      } else {
        setAutoLocationText("");
        setAutoLocationParts([]);
        setActiveAutoLocationParts([]);
        setManualLocationText("");
        setStatusMessage("GPS 정보가 없어 위치를 수동 입력해 주세요.");
      }

      const nextLocationText = resolveLocationText({ autoLocation: nextAutoLocationText });
      await generatePreview(file, nextDateText, nextTimeText, nextLocationText, presetId);
      setStatusMessage("사진 업로드 후 미리보기가 자동 생성되었습니다.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "메타 정보 추출 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLanguageChange(language: string): Promise<void> {
    setDisplayLanguage(language);
    if (!selectedFile) {
      return;
    }
    setIsLoading(true);
    setStatusMessage("선택한 언어로 날짜/시간/위치를 다시 가져오는 중...");
    try {
      const meta = await extractPhotoMeta(selectedFile);
      const locale = language === "en" ? "en-US" : language === "ja" ? "ja-JP" : "ko-KR";
      const nextDateText = formatCapturedAt(meta.capturedAt, locale);
      const nextTimeText = formatCapturedTime(meta.capturedAt, locale);
      setCapturedAtText(nextDateText);
      setCapturedTimeText(nextTimeText);
      if (meta.latitude !== null && meta.longitude !== null) {
        const geocode = await reverseGeocode(meta.latitude, meta.longitude, language);
        if (geocode) {
          const nextParts = geocode.parts?.filter(Boolean) ?? [];
          setAutoLocationText(geocode.location);
          setAutoLocationParts(nextParts);
          setActiveAutoLocationParts(nextParts.map(() => true));
          setManualLocationText(geocode.location);
          const nextLocationText = resolveLocationText({ autoLocation: geocode.location });
          await generatePreview(selectedFile, nextDateText, nextTimeText, nextLocationText, presetId);
          setStatusMessage("선택한 표시 언어로 날짜/시간/위치를 업데이트했습니다.");
        } else {
          const fallbackLocation = `${meta.latitude.toFixed(5)}, ${meta.longitude.toFixed(5)}`;
          setAutoLocationText(fallbackLocation);
          setAutoLocationParts([fallbackLocation]);
          setActiveAutoLocationParts([true]);
          setManualLocationText(fallbackLocation);
          const nextLocationText = resolveLocationText({ autoLocation: fallbackLocation });
          await generatePreview(selectedFile, nextDateText, nextTimeText, nextLocationText, presetId);
          setStatusMessage("주소 변환에 실패해 좌표로 표시했습니다. 필요하면 수동 입력해 주세요.");
        }
      } else {
        await generatePreview(
          selectedFile,
          nextDateText,
          nextTimeText,
          resolveLocationText({ autoLocation: "" }),
          presetId
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePresetChange(nextPresetId: string): Promise<void> {
    setPresetId(nextPresetId);
    if (!selectedFile) {
      return;
    }
    setIsLoading(true);
    setStatusMessage("선택한 출력 프리셋으로 미리보기를 업데이트하는 중...");
    try {
      await generatePreview(
        selectedFile,
        capturedAtText,
        capturedTimeText,
        resolveLocationText(),
        nextPresetId
      );
      setStatusMessage("출력 프리셋 변경이 미리보기에 반영되었습니다.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "프리셋 변경 반영 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGeneratePreview(): Promise<void> {
    if (!selectedFile) {
      setStatusMessage("먼저 사진을 업로드해 주세요.");
      return;
    }
    setIsLoading(true);
    setStatusMessage("월페이퍼 미리보기를 생성 중...");
    try {
      await generatePreview(selectedFile, capturedAtText, capturedTimeText, resolveLocationText(), presetId);
      setStatusMessage("미리보기가 생성되었습니다. 다운로드할 수 있어요.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "미리보기 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleManualLocationCommit(): Promise<void> {
    if (!selectedFile) {
      return;
    }
    setIsLoading(true);
    setStatusMessage("수동 위치를 미리보기에 반영하는 중...");
    try {
      const nextLocationText = resolveLocationText();
      await generatePreview(selectedFile, capturedAtText, capturedTimeText, nextLocationText, presetId);
      setStatusMessage("수동 위치 입력이 미리보기에 반영되었습니다.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "수동 위치 반영 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function regeneratePreviewWithCurrentState(
    message: string,
    visibility?: {
      showDate?: boolean;
      showTime?: boolean;
    },
    locationVisibility?: {
      showAutoLocation?: boolean;
      showManualLocation?: boolean;
      autoLocation?: string;
      manualLocation?: string;
    },
    textStyle?: {
      fontScalePercent?: number;
      textPosition?: TextPosition;
      useSafeArea?: boolean;
    }
  ): Promise<void> {
    if (!selectedFile) {
      return;
    }
    setIsLoading(true);
    setStatusMessage(message);
    try {
      await generatePreview(
        selectedFile,
        capturedAtText,
        capturedTimeText,
        resolveLocationText(locationVisibility),
        presetId,
        visibility,
        textStyle
      );
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDateToggle(nextValue: boolean): Promise<void> {
    setShowDateOnWallpaper(nextValue);
    if (!nextValue) {
      setShowTimeOnWallpaper(false);
    }
    await regeneratePreviewWithCurrentState("표시 항목 변경을 미리보기에 반영하는 중...", {
      showDate: nextValue,
      showTime: nextValue ? showTimeOnWallpaper : false
    });
  }

  async function handleTimeToggle(nextValue: boolean): Promise<void> {
    setShowTimeOnWallpaper(nextValue);
    await regeneratePreviewWithCurrentState("표시 항목 변경을 미리보기에 반영하는 중...", {
      showDate: showDateOnWallpaper,
      showTime: nextValue
    });
  }

  async function handleAutoLocationToggle(nextValue: boolean): Promise<void> {
    const nextShowManual = nextValue ? false : showManualLocationOnWallpaper;
    setShowAutoLocationOnWallpaper(nextValue);
    setShowManualLocationOnWallpaper(nextShowManual);
    await regeneratePreviewWithCurrentState(
      "표시 항목 변경을 미리보기에 반영하는 중...",
      undefined,
      {
        showAutoLocation: nextValue,
        showManualLocation: nextShowManual
      }
    );
  }

  async function handleManualLocationToggle(nextValue: boolean): Promise<void> {
    const nextShowAuto = nextValue ? false : showAutoLocationOnWallpaper;
    setShowManualLocationOnWallpaper(nextValue);
    setShowAutoLocationOnWallpaper(nextShowAuto);
    await regeneratePreviewWithCurrentState(
      "표시 항목 변경을 미리보기에 반영하는 중...",
      undefined,
      {
        showAutoLocation: nextShowAuto,
        showManualLocation: nextValue
      }
    );
  }

  async function handleFontScaleChange(nextStepIndex: number): Promise<void> {
    const normalizedStepIndex = Math.max(0, Math.min(FONT_SCALE_STEPS.length - 1, nextStepIndex));
    const nextValue = FONT_SCALE_STEPS[normalizedStepIndex];
    setFontScaleStepIndex(normalizedStepIndex);
    await regeneratePreviewWithCurrentState(
      "폰트 크기를 미리보기에 반영하는 중...",
      undefined,
      undefined,
      { fontScalePercent: nextValue }
    );
  }

  async function handleTextPositionChange(nextValue: TextPosition): Promise<void> {
    setTextPosition(nextValue);
    await regeneratePreviewWithCurrentState(
      "텍스트 위치를 미리보기에 반영하는 중...",
      undefined,
      undefined,
      { textPosition: nextValue }
    );
  }

  async function handleUseSafeAreaToggle(nextValue: boolean): Promise<void> {
    setUseSafeArea(nextValue);
    await regeneratePreviewWithCurrentState(
      "안전영역 설정을 미리보기에 반영하는 중...",
      undefined,
      undefined,
      { useSafeArea: nextValue }
    );
  }

  async function handleAutoLocationPartToggle(index: number): Promise<void> {
    if (index < 0 || index >= activeAutoLocationParts.length) {
      return;
    }
    const nextActive = [...activeAutoLocationParts];
    nextActive[index] = !nextActive[index];
    setActiveAutoLocationParts(nextActive);

    const nextParts = autoLocationParts.filter((_, partIndex) => nextActive[partIndex]);
    const nextAutoLocation = joinLocationParts(nextParts, displayLanguage);
    setManualLocationText(nextAutoLocation);
    await regeneratePreviewWithCurrentState(
      "자동 위치 항목 변경을 미리보기에 반영하는 중...",
      undefined,
      { autoLocation: nextAutoLocation }
    );
  }

  function handleDownload(): void {
    if (!previewUrl || !selectedFile) {
      setStatusMessage("다운로드할 결과가 없습니다. 먼저 생성해 주세요.");
      return;
    }
    const preset = getPresetById(presetId);
    const anchor = document.createElement("a");
    anchor.href = previewUrl;
    anchor.download = `wallpaper-${preset.width}x${preset.height}.jpg`;
    anchor.click();
  }

  async function handleShareOrSave(): Promise<void> {
    if (!previewUrl || !selectedFile) {
      setStatusMessage("공유할 결과가 없습니다. 먼저 생성해 주세요.");
      return;
    }

    const preset = getPresetById(presetId);
    const filename = `wallpaper-${preset.width}x${preset.height}.jpg`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        const blob = dataUrlToBlob(previewUrl);
        const shareFile = new File([blob], filename, { type: blob.type });
        const sharePayload: ShareData = {
          title: "Wallpaper Meta Studio",
          text: "생성한 월페이퍼를 공유합니다."
        };

        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [shareFile] })
        ) {
          sharePayload.files = [shareFile];
        }

        await navigator.share(sharePayload);
        setStatusMessage("공유 시트를 열었습니다.");
        return;
      }
    } catch {
      // Fallback to download when share is unavailable or user cancels.
    }

    handleDownload();
  }

  return (
    <main>
      <h1>Wallpaper Meta Studio</h1>

      <section className="panel">
        <div className="grid">
          <div>
            <label htmlFor="photo">사진 업로드</label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="preset">출력 프리셋</label>
            <select
              id="preset"
              value={presetId}
              onChange={(event) => void handlePresetChange(event.target.value)}
              disabled={isLoading}
            >
              {WALLPAPER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} ({preset.width}x{preset.height})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="location-language">표시 언어</label>
            <select
              id="location-language"
              value={displayLanguage}
              onChange={(event) => void handleLanguageChange(event.target.value)}
              disabled={isLoading}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="metaLine">
              <span className="metaText">안전영역 사용</span>
              <label className="switch" htmlFor="toggle-safe-area">
                <input
                  id="toggle-safe-area"
                  type="checkbox"
                  checked={useSafeArea}
                  onChange={(event) => void handleUseSafeAreaToggle(event.target.checked)}
                  disabled={isLoading}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>
      </section>

      {previewUrl ? (
        <section className="panel previewPanel">
          <div className="previewFrame">
            <button
              type="button"
              className="previewRefreshButton"
              onClick={() => void handleGeneratePreview()}
              disabled={isLoading || !selectedFile}
              aria-label="미리보기 다시 생성"
              title="미리보기 다시 생성"
            >
              <svg
                className="previewRefreshIcon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M4.93 4.93a10 10 0 0114.14 0A9.94 9.94 0 0122 12h-2a8 8 0 10-2.34 5.66L15 15h7v7l-2.34-2.34A10 10 0 114.93 4.93z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <Image
              className="preview"
              src={previewUrl}
              alt="월페이퍼 미리보기"
              width={previewSize?.width ?? 1200}
              height={previewSize?.height ?? 675}
              unoptimized
            />
            {useSafeArea ? (
              <div
                className="safeAreaBox"
                style={{
                  left: `${currentPreset.safeAreaXPercent}%`,
                  right: `${currentPreset.safeAreaXPercent}%`,
                  top: `${currentPreset.safeAreaTopPercent}%`,
                  bottom: `${currentPreset.safeAreaBottomPercent}%`
                }}
              />
            ) : null}
            <div
              className="previewPositionGrid"
              style={
                useSafeArea
                  ? {
                      left: `${currentPreset.safeAreaXPercent}%`,
                      right: `${currentPreset.safeAreaXPercent}%`,
                      top: `${currentPreset.safeAreaTopPercent}%`,
                      bottom: `${currentPreset.safeAreaBottomPercent}%`,
                      padding: 0
                    }
                  : { padding: 6 }
              }
              role="group"
              aria-label="미리보기 위치 선택"
            >
              {TEXT_POSITION_OPTIONS.map((option) => {
                const isSelected = textPosition === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`previewPositionCell${isSelected ? " isSelected" : ""}`}
                    onClick={() => void handleTextPositionChange(option.value)}
                    disabled={isLoading || !selectedFile}
                    aria-label={option.label}
                    title={option.label}
                  />
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="metaLine">
          <span className="metaText">폰트 크기</span>
          <div className="fontSizeStepGroup" role="group" aria-label="폰트 크기 선택">
            {FONT_SCALE_STEPS.map((step, index) => {
              const isSelected = fontScaleStepIndex === index;
              return (
                <button
                  key={step}
                  type="button"
                  className={`fontSizeStepButton${isSelected ? " isSelected" : ""}`}
                  onClick={() => void handleFontScaleChange(index)}
                  disabled={isLoading || !selectedFile}
                  aria-label={`폰트 크기 ${step}%`}
                  title={`폰트 크기 ${step}%`}
                >
                  <span style={{ fontSize: `${11 + index * 2}px` }}>A</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="metaLine">
          <span className="metaText">촬영 날짜: {capturedAtText}</span>
          <label className="switch" htmlFor="toggle-date">
            <input
              id="toggle-date"
              type="checkbox"
              checked={showDateOnWallpaper}
              onChange={(event) => void handleDateToggle(event.target.checked)}
              disabled={isLoading}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="metaLine">
          <span className="metaText">촬영 시간: {capturedTimeText}</span>
          <label className="switch" htmlFor="toggle-time">
            <input
              id="toggle-time"
              type="checkbox"
              checked={showTimeOnWallpaper}
              onChange={(event) => void handleTimeToggle(event.target.checked)}
              disabled={isLoading || !showDateOnWallpaper}
            />
            <span className="slider" />
          </label>
        </div>
        <div className="metaLine">
          <span className="metaText">자동 위치: {selectedAutoLocationText || "없음"}</span>
          <label className="switch" htmlFor="toggle-location">
            <input
              id="toggle-location"
              type="checkbox"
              checked={showAutoLocationOnWallpaper}
              onChange={(event) => void handleAutoLocationToggle(event.target.checked)}
              disabled={isLoading}
            />
            <span className="slider" />
          </label>
        </div>
        {autoLocationParts.length > 0 ? (
          <div className="locationTagGroup" role="group" aria-label="자동 위치 항목 선택">
            {autoLocationParts.map((part, index) => {
              const isActive = activeAutoLocationParts[index] ?? true;
              return (
                <button
                  key={`${part}-${index}`}
                  type="button"
                  className={`locationTagButton${isActive ? " isActive" : ""}`}
                  onClick={() => void handleAutoLocationPartToggle(index)}
                  disabled={isLoading}
                >
                  {part}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="metaLine">
          <label className="metaLabel" htmlFor="manual-location">
            수동 위치 입력 (GPS 없거나 수정할 때)
          </label>
          <label className="switch" htmlFor="toggle-manual-location">
            <input
              id="toggle-manual-location"
              type="checkbox"
              checked={showManualLocationOnWallpaper}
              onChange={(event) => void handleManualLocationToggle(event.target.checked)}
              disabled={isLoading}
            />
            <span className="slider" />
          </label>
        </div>
        <input
          id="manual-location"
          type="text"
          placeholder="예: Paris, France"
          value={manualLocationText}
          onChange={(event) => {
            const nextValue = event.target.value;
            setManualLocationText(nextValue);
            if (nextValue.trim().length > 0) {
              setShowAutoLocationOnWallpaper(false);
              setShowManualLocationOnWallpaper(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
              void handleManualLocationCommit();
            }
          }}
          onBlur={() => void handleManualLocationCommit()}
          disabled={isLoading}
        />
      </section>

      <section className="panel actionPanel">
        <div className="actionRow">
          <button
            type="button"
            className="shareButton"
            onClick={() => void handleShareOrSave()}
            disabled={isLoading || !previewUrl}
          >
            공유/저장 (모바일 권장)
          </button>
          <button
            type="button"
            className="downloadButton"
            onClick={handleDownload}
            disabled={isLoading || !previewUrl}
          >
            다운로드 (JPG)
          </button>
        </div>
        {statusMessage ? <p className="metaText">{statusMessage}</p> : null}
      </section>

      <p className="metaText">
        업로드한 사진은 내 기기(브라우저)에서만 분석됩니다. 서버에는 사진 원본이 전송되지 않으며, 위치 정보가 있을 때에만 주소 변환을 위해 좌표값을 조회합니다.
      </p>

      <footer className="footerNote">
        <p>Created by Jinhwan Y.</p>
        <p>Copyright © {new Date().getFullYear()} Jinhwan Y. All rights reserved.</p>
      </footer>
    </main>
  );
}
