type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

export async function reverseGeocode(
  lat: number,
  lon: number,
  language: string
): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=${encodeURIComponent(
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

  const city = address.city ?? address.town ?? address.village ?? address.state;
  const country = address.country;

  if (city && country) {
    return `${city}, ${country}`;
  }
  if (country) {
    return country;
  }
  return city ?? "위치 정보 없음";
}
