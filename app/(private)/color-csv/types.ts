export interface JsonColorData {
  color: string;
  qualityGroup: string;
  count: number;
  imageName: string | null;
}

export interface ProcessedImageResult {
  color?: string;
  qualityGroup?: string;
  lotNo: string;
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  cmyk: [number, number, number, number];
  lab: [number, number, number];
  cov: number;
  similarity?: number;
}

export interface DominantColorInfo {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  cmyk: [number, number, number, number];
  lab: [number, number, number];
  percentage: number;
}
