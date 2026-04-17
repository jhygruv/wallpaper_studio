export type WallpaperPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "desktop_4k_16_9",
    label: "Desktop 4K (16:9)",
    width: 3840,
    height: 2160
  },
  {
    id: "mobile_9_19_5",
    label: "Mobile (9:19.5)",
    width: 1290,
    height: 2796
  }
];

export function getPresetById(id: string): WallpaperPreset {
  const preset = WALLPAPER_PRESETS.find((item) => item.id === id);
  if (!preset) {
    return WALLPAPER_PRESETS[0];
  }
  return preset;
}
