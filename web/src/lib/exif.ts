import exifr from "exifr";

type ExifDateValue = Date | string | number | undefined;

export type ExtractedPhotoMeta = {
  capturedAt: Date | null;
  capturedAtText: string;
  latitude: number | null;
  longitude: number | null;
  locationText: string;
  hasGps: boolean;
};

type ExifParseResult = {
  DateTimeOriginal?: ExifDateValue;
  CreateDate?: ExifDateValue;
  date?: ExifDateValue;
  GPSLatitude?: number;
  GPSLongitude?: number;
  latitude?: number;
  longitude?: number;
};

function parseDateValue(value: ExifDateValue): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCapturedAt(date: Date | null): string {
  if (!date) {
    return "촬영 날짜 없음";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long"
  }).format(date);
}

export async function extractPhotoMeta(file: File): Promise<ExtractedPhotoMeta> {
  const parsed = (await exifr.parse(file, {
    pick: [
      "DateTimeOriginal",
      "CreateDate",
      "date",
      "GPSLatitude",
      "GPSLongitude",
      "latitude",
      "longitude"
    ]
  })) as ExifParseResult | null;

  const capturedAt =
    parseDateValue(parsed?.DateTimeOriginal) ??
    parseDateValue(parsed?.CreateDate) ??
    parseDateValue(parsed?.date);
  const latitude =
    typeof parsed?.latitude === "number"
      ? parsed.latitude
      : typeof parsed?.GPSLatitude === "number"
        ? parsed.GPSLatitude
        : null;
  const longitude =
    typeof parsed?.longitude === "number"
      ? parsed.longitude
      : typeof parsed?.GPSLongitude === "number"
        ? parsed.GPSLongitude
        : null;
  const hasGps = latitude !== null && longitude !== null;

  return {
    capturedAt,
    capturedAtText: formatCapturedAt(capturedAt),
    latitude,
    longitude,
    locationText: hasGps ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "",
    hasGps
  };
}
