type NominatimAddress = {
  [key: string]: string | undefined;
  house_number?: string;
  road?: string;
  residential?: string;
  farm?: string;
  neighbourhood?: string;
  suburb?: string;
  city_block?: string;
  quarter?: string;
  hamlet?: string;
  commercial?: string;
  industrial?: string;
  retail?: string;
  amenity?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  city_district?: string;
  district?: string;
  borough?: string;
  county?: string;
  state_district?: string;
  state?: string;
  province?: string;
  region?: string;
  island?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

const isDebugMode = process.env.NODE_ENV !== "production";

export type ReverseGeocodeResult = {
  location: string;
  parts: string[];
};

export async function reverseGeocode(
  lat: number,
  lon: number,
  language: string
): Promise<ReverseGeocodeResult> {
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
    return {
      location: "위치 정보 없음",
      parts: []
    };
  }

  const neighborhood =
    address.quarter ?? address.suburb ?? address.neighbourhood ?? address.hamlet;
  const district =
    address.city_district ?? address.borough ?? address.county ?? address.municipality;
  const city = address.city ?? address.town ?? address.village ?? address.state;
  const country = address.country;
  const provinceOrMetro = address.province ?? address.state ?? address.region;
  const neighborhoodLevel = neighborhood ?? address.residential ?? address.city_block;
  const roadOrNumber = address.road ?? address.house_number;
  const poiOrCommercial = address.commercial ?? address.retail ?? address.industrial ?? address.amenity;
  const lang = language.toLowerCase();
  const isKoOrJa = lang.startsWith("ko") || lang.startsWith("ja");
  const isEnglish = lang.startsWith("en");
  const orderedParts = isKoOrJa
    ? [
        // country
        country,
        // province / metro
        provinceOrMetro,
        // city / district
        city,
        district,
        // neighborhood / village-level
        neighborhoodLevel,
        // road
        roadOrNumber,
        // poi / commercial
        poiOrCommercial
      ]
    : isEnglish
      ? [
          // English: small -> large (e.g., Namyangju-si, Gyeonggi, South Korea)
          poiOrCommercial,
          roadOrNumber,
          neighborhoodLevel,
          district,
          city,
          provinceOrMetro,
          country
        ]
      : [
          // Default non-ko/ja: large -> small
          country,
          provinceOrMetro,
          city,
          district,
          neighborhoodLevel,
          roadOrNumber,
          poiOrCommercial
        ];

  const parts: string[] = [];
  const seen = new Set<string>();
  const ignoredKeys = new Set(["country_code", "postcode"]);
  const codeLikePattern = /^[A-Z]{2}-\d{1,3}$/;

  function pushPart(value: string | undefined): void {
    if (!value) {
      return;
    }
    const normalized = value.trim();
    if (!normalized || seen.has(normalized) || codeLikePattern.test(normalized)) {
      return;
    }
    seen.add(normalized);
    parts.push(normalized);
  }

  for (const value of orderedParts) {
    pushPart(value);
  }

  // Add the rest of Nominatim fields so users can toggle richer place parts.
  for (const [key, value] of Object.entries(address)) {
    if (ignoredKeys.has(key)) {
      continue;
    }
    pushPart(value);
  }

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
    return {
      location: isKoOrJa ? parts.join(" ") : parts.join(", "),
      parts
    };
  }
  return {
    location: "위치 정보 없음",
    parts: []
  };
}
