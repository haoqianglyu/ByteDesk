// Apple iPhone 17 Pro Max dimensional drawing (2025-09-09 revision).
// https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17-pro-max.pdf
const scale = .032;
export const phoneModel = {
  width: 77.98 * scale,
  height: 163.43 * scale,
  depth: 8.75 * scale,
  radius: 14.5 * scale,
  screenWidth: 72.86 * scale,
  screenHeight: 158.31 * scale,
  screenRadius: 11.94 * scale,
  screenZ: 4.4 * scale,
  // Inset a few pixels from the old artwork's inner edge to remove its baked-in bezel.
  crop: { x: 178, y: 529, width: 964, height: 2095 },
};
const p = phoneModel;
export const phoneScreenStyle = {
  '--phone-screen-height': `${320 * p.screenHeight / p.screenWidth}px`,
  '--phone-screen-radius': `${320 * p.screenRadius / p.screenWidth}px`,
  '--phone-image-width': `${1320 / p.crop.width * 100}%`,
  '--phone-image-height': `${2868 / p.crop.height * 100}%`,
  '--phone-image-left': `${-p.crop.x / p.crop.width * 100}%`,
  '--phone-image-top': `${-p.crop.y / p.crop.height * 100}%`,
  '--phone-body-ratio': `${p.width} / ${p.height}`,
  '--phone-body-radius': `${p.radius / p.width * 100}% / ${p.radius / p.height * 100}%`,
  '--phone-screen-inset-x': `${(p.width - p.screenWidth) / p.width * 50}%`,
  '--phone-screen-inset-y': `${(p.height - p.screenHeight) / p.height * 50}%`,
  '--phone-static-radius': `${p.screenRadius / p.screenWidth * 100}% / ${p.screenRadius / p.screenHeight * 100}%`,
};
