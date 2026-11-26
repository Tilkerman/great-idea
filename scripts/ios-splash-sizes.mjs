/** iPhone portrait launch images. Media queries must match device CSS pixels. */
export const IOS_SPLASH = [
  { file: '640x1136.png', width: 640, height: 1136, dw: 320, dh: 568, dpr: 2 },
  { file: '750x1334.png', width: 750, height: 1334, dw: 375, dh: 667, dpr: 2 },
  { file: '828x1792.png', width: 828, height: 1792, dw: 414, dh: 896, dpr: 2 },
  { file: '1125x2436.png', width: 1125, height: 2436, dw: 375, dh: 812, dpr: 3 },
  { file: '1170x2532.png', width: 1170, height: 2532, dw: 390, dh: 844, dpr: 3 },
  { file: '1179x2556.png', width: 1179, height: 2556, dw: 393, dh: 852, dpr: 3 },
  { file: '1206x2622.png', width: 1206, height: 2622, dw: 402, dh: 874, dpr: 3 },
  { file: '1284x2778.png', width: 1284, height: 2778, dw: 428, dh: 926, dpr: 3 },
  { file: '1290x2796.png', width: 1290, height: 2796, dw: 430, dh: 932, dpr: 3 },
  { file: '1320x2868.png', width: 1320, height: 2868, dw: 440, dh: 956, dpr: 3 },
];

export function splashLinkTags(hrefFor) {
  return IOS_SPLASH.map((item) => (
    `    <link rel="apple-touch-startup-image" media="screen and (device-width: ${item.dw}px) and (device-height: ${item.dh}px) and (-webkit-device-pixel-ratio: ${item.dpr}) and (orientation: portrait)" href="${hrefFor(item.file)}" />`
  )).join('\n');
}
