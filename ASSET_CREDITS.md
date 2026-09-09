# ByteDesk map and wallpaper credits

Photo and application screenshot credits are in [ASSETS.md](ASSETS.md). R2 object keys, sizes and hashes are recorded in [R2_IMAGES.json](R2_IMAGES.json); the current public image origin is `https://img.haoqianglyu.com`.

## Travel atlas vector map

Source: [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public-domain 1:110m administrative outlines, retrieved 2026-09-08 from the [maintainer's GeoJSON distribution](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson). `src/data/world.json` retains geometry and feature IDs, rounds coordinates to three decimals and omits Antarctica for the travel overview. The map uses D3's [Natural Earth projection](https://d3js.org/d3-geo/cylindrical#geoNaturalEarth1). It is an overview, not a street or navigation map.

The sample Dolomites marker at 12.1 E, 46.5 N illustrates the travel layout; it does not claim an actual trip by the owner or the precise location of the stock photograph.

## Earth texture attribution

Source: [Solar System Scope — Solar Textures](https://www.solarsystemscope.com/textures/), by INOVE / Solar System Scope.
License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
The publisher describes the Earth textures as composites of geodata, space photography and NASA Blue Marble imagery. These are not a live NASA feed or an official NASA render.

Downloaded 2026-09-08. Four derivatives are hosted in the existing `bytedesk-images` R2 bucket under `wallpapers/earth/`. The repository does not contain the bitmap files. JPEG resampling/encoding was performed for browser delivery; shader lighting, atmosphere, exposure, cloud shadows and rotation are added by ByteDesk.

| R2 object | Original source | Delivery dimensions |
| --- | --- | --- |
| `wallpapers/earth/day-4k.jpg` | https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg | 4096 × 2048 |
| `wallpapers/earth/night-4k.jpg` | https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg | 4096 × 2048 |
| `wallpapers/earth/clouds-4k.jpg` | https://www.solarsystemscope.com/textures/download/8k_earth_clouds.jpg | 4096 × 2048 |
| `wallpapers/earth/ocean-2k.jpg` | https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.tif | 2048 × 1024 |

Visible attribution is included in both localized About pages. Actual ground/cloud patterns and light are an artistic visualization; the night map is historical, clouds do not represent current weather, and rotation is accelerated.

## Campfire and starlight wallpaper

Created with the built-in image generation tool on 2026-09-08 for ByteDesk. This is an AI-created scene, not a photograph of real people or a particular campsite. The landscape and portrait compositions are stored as website assets in R2: `wallpapers/campfire/landscape.png` (1672 × 941) and `wallpapers/campfire/portrait.png` (850 × 1850). No bitmap assets are bundled in this repository. The original generation prompts are archived in [CAMPFIRE_PROMPTS.md](CAMPFIRE_PROMPTS.md).

The scene uses a generated photographic base with real-time shader animation of the flames, rising embers, local firelight, individual star brightness and an occasional meteor. People, dog, terrain and the Milky Way composition stay still. It is not a fully animated character scene or a recorded video.

Prompt brief: A realistic remote mountain campsite under a detailed Milky Way, exactly two adults viewed from behind leaning together and looking up, a small wood campfire and one golden retriever lying nearby. Warm amber firelight, readable cool night shadows, peaceful mood, no words or watermark. Landscape framing leaves lower space for a dock; portrait adaptation preserves all foreground subjects and extends the sky.
