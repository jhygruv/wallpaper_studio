export type WallpaperPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  safeAreaXPercent: number;
  safeAreaTopPercent: number;
  safeAreaBottomPercent: number;
};

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "desktop_4k_16_9",
    label: "Desktop 4K (16:9)",
    width: 3840,
    height: 2160,
    safeAreaXPercent: 10,
    safeAreaTopPercent: 12,
    safeAreaBottomPercent: 12
  },
  {
    id: "mobile_9_19_5",
    label: "Mobile (9:19.5)",
    width: 1290,
    height: 2796,
    safeAreaXPercent: 10,
    safeAreaTopPercent: 24,
    safeAreaBottomPercent: 16
  },
  {
    id: "iphone_17_pro",
    label: "Apple iPhone 17 Pro",
    width: 1206,
    height: 2622,
    safeAreaXPercent: 10,
    safeAreaTopPercent: 24,
    safeAreaBottomPercent: 16
  },
  {
    id: "iphone_17_pro_max",
    label: "Apple iPhone 17 Pro Max",
    width: 1320,
    height: 2868,
    safeAreaXPercent: 10,
    safeAreaTopPercent: 24,
    safeAreaBottomPercent: 16
  },
  {
    id: "ipad_pro_11",
    label: "Apple iPad Pro 11-inch",
    width: 1668,
    height: 2420,
    safeAreaXPercent: 9,
    safeAreaTopPercent: 14,
    safeAreaBottomPercent: 12
  }
];

export function getPresetById(id: string): WallpaperPreset {
  const preset = WALLPAPER_PRESETS.find((item) => item.id === id);
  if (!preset) {
    return WALLPAPER_PRESETS[0];
  }
  return preset;
}
