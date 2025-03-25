import upng from "@pdf-lib/upng";
import { bloImage } from "blo";
import { Hex } from "viem";
import memoize from "memoize/distribution/index";

/**
 * The blo generates svg base64 uri which is not supported by
 * react native image component.
 *
 * This function converts the svg to a png and returns a base64 uri.
 */
const generate = (address: Hex, size: number) => {
  const pngBuffer = upng.encode(
    [pixelateEnlarge(blogImageToRGBBitmap(address), size)],
    size,
    size,
    0
  );
  return arrayBufferToBase64Uri(pngBuffer, "image/png");
};

const memoizedGenerate = memoize(generate);

// https://stackoverflow.com/a/64090995
// input: h as an angle in [0,360] and s,l in [0,1]
// output: r,g,b in [0,1]
function hsl2rgb(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number, k = (n + h / 30) % 12) =>
    l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}

function arrayBufferToBase64Uri(
  buffer: ArrayBuffer,
  mimeType: string = "application/octet-stream"
): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

function blogImageToRGBBitmap(address: Hex) {
  const [data, palette] = bloImage(address);
  const buffer = new Uint8Array(data.length * 4 * 2);

  let rgbStartIndex = 0;

  for (let i = 0; i < data.length; i++) {
    const current = data[i];

    hsl2rgb(
      palette[current][0],
      palette[current][1] / 100,
      palette[current][2] / 100
    )
      .map((c) => Math.floor(c * 255))
      .forEach((channel, channelIndex) => {
        // rgb[channelIndex] = channel
        buffer[rgbStartIndex + channelIndex] = channel;
      });

    // alpha channel
    buffer[rgbStartIndex + 3] = 255;

    rgbStartIndex += 4;

    if (i % 4 === 3) {
      for (let j = 0; j < 4; j++) {
        const copyStart = rgbStartIndex - (j + 1) * 4;

        for (let k = 0; k < 4; k++) {
          buffer[rgbStartIndex + j * 4 + k] = buffer[copyStart + k];
        }
      }

      rgbStartIndex += 16;
    }
  }

  return buffer;
}

function pixelateEnlarge(buffer: Uint8Array, size: number) {
  const sizeRatio = Math.ceil(size / 8);
  const imageBuffer = new Uint8Array(size * size * 4);

  for (let i = 0; i < buffer.length / 4; i++) {
    const dotIndex = i * 4;
    const oy = Math.floor(i / 8);
    const ox = i - oy * 8;
    for (let xOffset = 0; xOffset < sizeRatio; xOffset++) {
      for (let yOffset = 0; yOffset < sizeRatio; yOffset++) {
        for (let ci = 0; ci < 4; ci++) {
          imageBuffer[
            (oy * sizeRatio + yOffset) * size * 4 +
              (ox * sizeRatio + xOffset) * 4 +
              ci
          ] = buffer[dotIndex + ci];
        }
      }
    }
  }

  return imageBuffer.buffer;
}

export default memoizedGenerate;
