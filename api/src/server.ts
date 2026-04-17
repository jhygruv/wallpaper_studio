import cors from "cors";
import express from "express";
import { reverseGeocode } from "./reverseGeocode.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/reverse-geocode", async (request, response) => {
  const latRaw = request.query.lat;
  const lonRaw = request.query.lon;
  const langRaw = request.query.lang;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  const lang = typeof langRaw === "string" && langRaw.trim() ? langRaw.trim() : "ko";

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    response.status(400).json({ message: "lat/lon query is required" });
    return;
  }

  try {
    const location = await reverseGeocode(lat, lon, lang);
    response.json({ location });
  } catch (error) {
    response.status(502).json({
      message: error instanceof Error ? error.message : "reverse_geocode_failed",
      location: "위치 정보 없음"
    });
  }
});

app.listen(port, () => {
  console.log(`Wallpaper API listening on ${port}`);
});
