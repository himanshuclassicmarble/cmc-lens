import Color from "color";

export interface DominantColorInfo {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  cmyk: [number, number, number, number];
  lab: [number, number, number];
  percentage: number;
}

// Type definitions for Vibrant library
interface VibrantSwatch {
  rgb: [number, number, number];
  hsl: [number, number, number];
  hex: string;
  population: number;
}

interface VibrantPalette {
  [key: string]: VibrantSwatch | null;
}

interface VibrantInstance {
  getPalette(): Promise<VibrantPalette>;
}

interface VibrantConstructor {
  new(
    img: HTMLImageElement,
    options?: { quality?: number; colorCount?: number },
  ): VibrantInstance;
}

declare global {
  interface Window {
    Vibrant?: VibrantConstructor;
  }
}

function rgbToCmyk(
  r: number,
  g: number,
  b: number,
): [number, number, number, number] {
  const rNorm = r / 255,
    gNorm = g / 255,
    bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  const denom = 1 - k || 1;
  return [
    Math.round(((1 - rNorm - k) / denom) * 100),
    Math.round(((1 - gNorm - k) / denom) * 100),
    Math.round(((1 - bNorm - k) / denom) * 100),
    Math.round(k * 100),
  ];
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Failed to read file"));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// function getAverageColor(img: HTMLImageElement): [number, number, number] {
//   const canvas = document.createElement("canvas");
//   const ctx = canvas.getContext("2d")!;
//   canvas.width = img.width;
//   canvas.height = img.height;
//   ctx.drawImage(img, 0, 0);
//   const data = ctx.getImageData(0, 0, img.width, img.height).data;
//
//   let r = 0, g = 0, b = 0, count = 0;
//   for (let i = 0; i < data.length; i += 4) {
//     const alpha = data[i + 3];
//     if (alpha > 0) {
//       r += data[i];
//       g += data[i + 1];
//       b += data[i + 2];
//       count++;
//     }
//   }
//
//   return count > 0
//     ? [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
//     : [0, 0, 0];
// }

function buildColorInfo(
  rgb: [number, number, number],
  hex: string,
  hslRaw: [number, number, number],
  percentage: number,
): DominantColorInfo {
  const lab = Color.rgb(rgb)
    .lab()
    .array()
    .map((v) => Math.round(v * 100) / 100) as [number, number, number];
  const hsl = hslRaw.map((v, i) => Math.round(v * (i === 0 ? 360 : 100))) as [
    number,
    number,
    number,
  ];
  const cmyk = rgbToCmyk(...rgb);

  return {
    hex,
    rgb,
    hsl,
    cmyk,
    lab,
    percentage,
  };
}

// Simple dominant color extraction using canvas with better color grouping
function extractDominantColorFromCanvas(
  img: HTMLImageElement,
): DominantColorInfo {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Scale down image for performance but not too much to maintain accuracy
  const maxSize = 200;
  const scale = Math.min(maxSize / img.width, maxSize / img.height);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Count color frequencies with better quantization
  const colorMap = new Map<
    string,
    { count: number; rgb: [number, number, number] }
  >();
  let totalValidPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue; // Skip transparent pixels

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Better quantization - group similar colors more aggressively
    const qr = Math.round(r / 20) * 20;
    const qg = Math.round(g / 20) * 20;
    const qb = Math.round(b / 20) * 20;

    const key = `${qr},${qg},${qb}`;
    if (colorMap.has(key)) {
      colorMap.get(key)!.count++;
    } else {
      colorMap.set(key, { count: 1, rgb: [qr, qg, qb] });
    }
    totalValidPixels++;
  }

  // Find most frequent color
  let dominant = { count: 0, rgb: [0, 0, 0] as [number, number, number] };

  for (const color of colorMap.values()) {
    if (color.count > dominant.count) {
      dominant = color;
    }
  }

  // If we still have very low percentage, try even more aggressive grouping
  if (totalValidPixels > 0 && dominant.count / totalValidPixels < 0.1) {
    const betterColorMap = new Map<
      string,
      { count: number; rgb: [number, number, number] }
    >();

    // Reset and try with even more aggressive quantization
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const newData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for (let i = 0; i < newData.length; i += 4) {
      const alpha = newData[i + 3];
      if (alpha < 128) continue;

      const r = newData[i];
      const g = newData[i + 1];
      const b = newData[i + 2];

      // Very aggressive quantization - group into 32-value buckets
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;

      const key = `${qr},${qg},${qb}`;
      if (betterColorMap.has(key)) {
        betterColorMap.get(key)!.count++;
      } else {
        betterColorMap.set(key, { count: 1, rgb: [qr, qg, qb] });
      }
    }

    // Find the new dominant color
    for (const color of betterColorMap.values()) {
      if (color.count > dominant.count) {
        dominant = color;
      }
    }
  }

  const rgb = dominant.rgb;
  const hex = `#${((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1).padStart(6, "0")}`;
  const colorObj = Color.rgb(rgb);
  const hsl = colorObj.hsl().array() as [number, number, number];
  const percentage =
    totalValidPixels > 0
      ? Number(((dominant.count / totalValidPixels) * 100).toFixed(2))
      : 100;

  // Ensure minimum reasonable percentage
  const finalPercentage = Math.max(percentage, 15);

  return buildColorInfo(
    rgb,
    hex,
    [hsl[0] / 360, hsl[1] / 100, hsl[2] / 100],
    finalPercentage,
  );
}

export async function extractDominantColor(
  file: File,
): Promise<DominantColorInfo> {
  if (typeof window === "undefined") throw new Error("Run in browser only");

  const imageUrl = await fileToDataURL(file);
  const img = new Image();
  img.src = imageUrl;
  img.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  try {
    // Try to use Vibrant if available
    if (typeof window !== "undefined" && window.Vibrant) {
      const Vibrant = window.Vibrant;
      const vibrant = new Vibrant(img, { quality: 1, colorCount: 16 });
      const palette = await vibrant.getPalette();
      const swatches = Object.values(palette).filter(
        (s): s is VibrantSwatch => s !== null,
      );
      const totalPopulation =
        swatches.reduce(
          (sum: number, s: VibrantSwatch) => sum + s.population,
          0,
        ) || 1;

      if (swatches.length > 0) {
        const dominant = swatches.sort(
          (a: VibrantSwatch, b: VibrantSwatch) => b.population - a.population,
        )[0];
        const rgb = dominant.rgb.map(Math.round) as [number, number, number];
        const hsl = dominant.hsl as [number, number, number];
        const percentage = Number(
          ((dominant.population / totalPopulation) * 100).toFixed(2),
        );
        return buildColorInfo(rgb, dominant.hex, hsl, percentage);
      }
    }
  } catch (err) {
    console.warn("Vibrant extraction failed, using fallback:", err);
  }

  // Fallback to canvas-based extraction
  return extractDominantColorFromCanvas(img);
}
