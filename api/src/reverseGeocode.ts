type NominatimAddress = {
  city_district?: string;
  borough?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  hamlet?: string;
  county?: string;
  municipality?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

const isDebugMode = process.env.NODE_ENV !== "production";

export async function reverseGeocode(
  lat: number,
  lon: number,
  language: string
): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1&accept-language=${encodeURIComponent(
    language
  )}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "wallpaper-meta-service/0.1",
      "Accept-Language": language
    }
  });

  if (!response.ok) {
    throw new Error(`reverse_geocode_failed:${response.status}`);
  }

  const data = (await response.json()) as NominatimResponse;
  const address = data.address;
  if (!address) {
    return "위치 정보 없음";
  }

  const neighborhood =
    address.quarter ?? address.suburb ?? address.neighbourhood ?? address.hamlet;
  const district =
    address.city_district ?? address.borough ?? address.county ?? address.municipality;
  const city = address.city ?? address.town ?? address.village ?? address.state;
  const country = address.country;
  const lang = language.toLowerCase();
  const isKoOrJa = lang.startsWith("ko") || lang.startsWith("ja");
  const orderedParts = isKoOrJa
    ? [country, city, district, neighborhood]
    : [neighborhood, district, city, country];
  const parts = orderedParts.filter(
    (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index
  );

  if (isDebugMode) {
    console.log("[reverseGeocode] input", {
      lat,
      lon,
      language
    });
    console.log("[reverseGeocode] rawAddress", address);
    console.log("[reverseGeocode] resolvedParts", {
      neighborhood,
      district,
      city,
      country,
      orderedParts,
      parts
    });
  }

  if (parts.length > 0) {
    return parts.join(", ");
  }
  return "위치 정보 없음";
}
