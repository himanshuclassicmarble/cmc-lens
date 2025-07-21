import { Vibrant } from "node-vibrant/browser";
import type { Swatch } from "node-vibrant/lib/color";

export interface ColorInfo {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  population: number;
  percentage: number;
  luminance: number;
  titleTextColor: string;
  bodyTextColor: string;
}

export interface ExtractOptions {
  quality?: number;
  colorCount?: number;
}

export interface ExtractedImageInfo {
  imageName: string;
  imageDimensions: { width: number; height: number };
  dominantColor: ColorInfo | null; // The single most dominant color
  colors: ColorInfo[]; // All extracted colors
  originalJsonMetadata?: { color: string; qualityGroup: string; count: number };
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        Number.parseInt(result[1], 16),
        Number.parseInt(result[2], 16),
        Number.parseInt(result[3], 16),
      ]
    : null;
}

export function rgbToLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    val /= 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function extractColors(
  imageFile: File,
  imageName: string,
  options: ExtractOptions = {},
  originalJsonMetadata?: { color: string; qualityGroup: string; count: number },
): Promise<ExtractedImageInfo> {
  const { quality = 10, colorCount = 256 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        try {
          const vibrant = new Vibrant(img, { quality, colorCount });
          const palette = await vibrant.getPalette();

          const swatches = Object.values(palette).filter(
            (s): s is Swatch => s !== null,
          );
          const totalPopulation = swatches.reduce(
            (sum, s) => sum + s.population,
            0,
          );

          const colors: ColorInfo[] = swatches
            .map((swatch) => {
              const rgb = swatch.rgb as [number, number, number];
              const luminance = rgbToLuminance(rgb);
              return {
                hex: swatch.hex,
                rgb,
                hsl: swatch.hsl as [number, number, number],
                population: swatch.population,
                percentage: Number(
                  ((swatch.population / totalPopulation) * 100).toFixed(2),
                ),
                titleTextColor: swatch.titleTextColor,
                bodyTextColor: swatch.bodyTextColor,
                luminance,
              };
            })
            .sort((a, b) => b.population - a.population);

          resolve({
            imageName,
            imageDimensions: { width: img.width, height: img.height },
            dominantColor: colors[0] ?? null,
            colors,
            originalJsonMetadata,
          });
        } catch (err) {
          reject(
            new Error(
              `Color extraction failed: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(imageFile);
  });
}
