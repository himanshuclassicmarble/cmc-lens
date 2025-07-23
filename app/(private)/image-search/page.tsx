// "use client";
//
// import React, { useState, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Slider } from "@/components/ui/slider";
// import { extractDominantColor } from "../color-csv/color-utils";
// import { colorData } from "../color-csv/color-data";
// import { ProcessedImageResult } from "../color-csv/types";
// import Image from "next/image";
// import { IMG_PATH_CROP, IMG_PATH_URL } from "../color-csv/data-utils";
//
// // Define types
// interface DominantColorInfo {
//   hex: string;
//   rgb: [number, number, number];
//   lab: [number, number, number];
// }
//
// const ColorBasedImageSearch: React.FC = () => {
//   const [image, setImage] = useState<string | null>(null);
//   const [color, setColor] = useState<DominantColorInfo | null>(null);
//   const [results, setResults] = useState<ProcessedImageResult[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const [tolerance, setTolerance] = useState<number>(25);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//
//   const calculateSimilarity = (
//     color1: DominantColorInfo,
//     color2: ProcessedImageResult,
//   ): number => {
//     const [L1, a1, b1] = color1.lab;
//     const [L2, a2, b2] = color2.lab;
//     return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
//   };
//
//   const searchColors = (dominantColor: DominantColorInfo, tol: number) => {
//     const matches = colorData
//       .map((item: ProcessedImageResult) => ({
//         ...item,
//         similarity: calculateSimilarity(dominantColor, item),
//       }))
//       .filter((item) => item.similarity! <= tol)
//       .sort((a, b) => a.similarity! - b.similarity);
//     setResults(matches);
//   };
//
//   const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;
//
//     setLoading(true);
//     setError(null);
//
//     try {
//       const imageUrl = URL.createObjectURL(file);
//       setImage(imageUrl);
//       const dominantColor: DominantColorInfo = await extractDominantColor(file);
//       setColor(dominantColor);
//       searchColors(dominantColor, tolerance);
//     } catch (err) {
//       setError("Error processing image");
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const clear = () => {
//     setImage(null);
//     setColor(null);
//     setResults([]);
//     setError(null);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };
//
//   return (
//     <div className="p-4 max-w-4xl mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Color Search</h1>
//
//       <div className="mb-4">
//         <Input
//           type="file"
//           ref={fileInputRef}
//           onChange={handleUpload}
//           accept="image/*"
//           className="mb-2"
//         />
//         {image && (
//           <div>
//             <Image
//               src={image}
//               width={100}
//               height={100}
//               alt="Uploaded"
//               className="h-48 w-72 mx-auto mb-2"
//             />
//             <Button onClick={clear} variant="destructive">
//               Clear
//             </Button>
//           </div>
//         )}
//       </div>
//
//       {loading && <p className="text-center">Loading...</p>}
//       {error && <p className="text-red-500">{error}</p>}
//
//       {color && (
//         <div className="mb-4 p-4 border rounded">
//           <h2 className="text-lg font-semibold">Main Color</h2>
//           <div
//             className="w-16 h-16 border mb-2"
//             style={{ backgroundColor: color.hex }}
//           />
//           <p>HEX: {color.hex}</p>
//           <p>RGB: {color.rgb.join(", ")}</p>
//           <p>Tolerance: {tolerance}</p>
//           <Slider
//             min={5}
//             max={50}
//             value={[tolerance]}
//             onValueChange={(value: number[]) => {
//               setTolerance(value[0]);
//               if (color) searchColors(color, value[0]);
//             }}
//             className="my-2"
//           />
//         </div>
//       )}
//
//       {results.length > 0 && (
//         <div>
//           <h2 className="text-lg font-semibold">Results ({results.length})</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             {results.map((result: ProcessedImageResult) => (
//               <div key={result.lotNo} className="border p-4 rounded">
//                 <Image
//                   alt="color Image"
//                   src={`${IMG_PATH_URL}/${IMG_PATH_CROP}/${result.lotNo}.webp`}
//                   width={100}
//                   height={100}
//                 />
//                 <div
//                   className="w-12 h-12 border mb-2"
//                   style={{ backgroundColor: result.hex }}
//                 />
//                 <p>Lot: {result.lotNo}</p>
//                 <p>
//                   Match:{" "}
//                   {(100 - (result.similarity! / tolerance) * 100).toFixed(1)}%
//                 </p>
//                 <p>HEX: {result.hex}</p>
//                 <p>RGB: {result.rgb.join(", ")}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//
//       {color && results.length === 0 && !loading && (
//         <p className="text-center">
//           No similar colors found. Try adjusting tolerance.
//         </p>
//       )}
//     </div>
//   );
// };
//
// export default ColorBasedImageSearch;
"use client";

import React, { useState, useRef } from "react";
import { Camera, CameraType } from "react-camera-pro";
import {
  Camera as CameraIcon,
  Upload,
  X,
  RotateCcw,
  Grid3X3,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { extractDominantColor } from "../color-csv/color-utils";
import { colorData } from "../color-csv/color-data";
import { ProcessedImageResult } from "../color-csv/types";
import { IMG_PATH_CROP, IMG_PATH_URL } from "../color-csv/data-utils";

interface DominantColorInfo {
  hex: string;
  rgb: [number, number, number];
  lab: [number, number, number];
}

const ColorSearch: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [color, setColor] = useState<DominantColorInfo | null>(null);
  const [results, setResults] = useState<ProcessedImageResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState<number>(25);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const camera = useRef<CameraType>(null);

  const calculateSimilarity = (
    color1: DominantColorInfo,
    color2: ProcessedImageResult,
  ): number => {
    const [L1, a1, b1] = color1.lab;
    const [L2, a2, b2] = color2.lab;
    return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
  };

  const searchColors = (dominantColor: DominantColorInfo, tol: number) => {
    const matches = colorData
      .map((item: ProcessedImageResult) => ({
        ...item,
        similarity: calculateSimilarity(dominantColor, item),
      }))
      .filter((item) => item.similarity! <= tol)
      .sort((a, b) => a.similarity! - b.similarity!);
    setResults(matches);
  };

  const processImage = async (file: File, imageUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      setImage(imageUrl);
      const dominantColor: DominantColorInfo = await extractDominantColor(file);
      setColor(dominantColor);
      searchColors(dominantColor, tolerance);
    } catch (err) {
      setError("Error processing image");
      return err;
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!camera.current) return;
    const photo = camera.current.takePhoto();
    const photoUrl =
      photo instanceof ImageData
        ? (() => {
          const canvas = document.createElement("canvas");
          canvas.width = photo.width;
          canvas.height = photo.height;
          const ctx = canvas.getContext("2d")!;
          ctx.putImageData(photo, 0, 0);
          return canvas.toDataURL("image/jpeg");
        })()
        : photo;

    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const file = new File([blob], "captured.jpg", { type: "image/jpeg" });
    processImage(file, photoUrl);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processImage(file, URL.createObjectURL(file));
  };

  const clear = () => {
    setImage(null);
    setColor(null);
    setResults([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      {/* Full Screen Camera */}
      <div className="absolute inset-0 ">
        <Camera
          ref={camera}
          facingMode={facingMode}
          aspectRatio="cover"
          errorMessages={{
            noCameraAccessible: "No camera available",
            permissionDenied: "Camera permission denied",
          }}
        />
      </div>

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-2 z-10">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setShowGrid(!showGrid)}
            size="sm"
            variant={showGrid ? "default" : "secondary"}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Capture Frame with Grid */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className="border-2  relative overflow-hidden"
          style={{
            width: "350px",
            height: "350px",
            boxShadow: "0 0 0 2000px rgba(0,0,0,0.3)",
          }}
        >
          {showGrid && (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/20"></div>
              ))}
            </div>
          )}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-white/60"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-white/60"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-white/60"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-white/60"></div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 z-30">
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="icon"
          variant="secondary"
          className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 text-white border-0"
          disabled={loading}
        >
          <Upload className="w-5 h-5" />
        </Button>
        <Button
          onClick={switchCamera}
          size="icon"
          variant="secondary"
          className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 text-white border-0"
          disabled={loading}
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleCapture}
          size="icon"
          className="rounded-full w-20 h-20 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <CameraIcon className="w-8 h-8" />
          )}
        </Button>
        {image && (
          <Button
            onClick={clear}
            size="icon"
            variant="destructive"
            className="rounded-full w-12 h-12"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Results Card */}
      <Card
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl transition-all duration-500 ${image || results.length > 0 ? "translate-y-0" : "translate-y-full"
          } max-h-[70vh] overflow-hidden z-40`}
      >
        <div className="w-12 h-1 bg-background rounded-full mx-auto mt-2"></div>
        {color && (
          <CardHeader className="p-2">
            <div className="flex items-center justify-between">
              <Button onClick={clear} size="sm" variant="ghost" className="p-1">
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <CardTitle className="text-lg">Color Analysis</CardTitle>
              <div className="w-10"></div> {/* Spacer for alignment */}
            </div>
          </CardHeader>
        )}
        <CardContent className="overflow-y-auto max-h-[60vh] p-2">
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-muted-foreground">Analyzing color...</p>
            </div>
          )}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {color && (
            <div className="space-y-2 mb-2">
              <div className="flex items-center gap-2">
                {image && (
                  <Image
                    src={image}
                    width={60}
                    height={60}
                    alt="Captured"
                    className="rounded-lg"
                  />
                )}
                <div
                  className="w-16 h-16 border-2 border-border rounded-lg flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="space-y-1">
                  <div className="font-bold text-lg">{color.hex}</div>
                  <div className="text-sm text-muted-foreground">
                    RGB: {color.rgb.join(", ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    LAB: {color.lab.map((v) => v.toFixed(1)).join(", ")}
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg p-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Match Tolerance</span>
                  <Badge variant="outline">{tolerance}%</Badge>
                </div>
                <Slider
                  value={[tolerance]}
                  onValueChange={([value]) => {
                    setTolerance(value);
                    if (color) searchColors(color, value);
                  }}
                  min={5}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Strict Match</span>
                  <span>Loose Match</span>
                </div>
              </div>
            </div>
          )}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  Similar Colors ({results.length})
                </h3>
                <Badge variant="secondary">
                  {
                    results.filter((r) => r.similarity! / tolerance < 0.3)
                      .length
                  }{" "}
                  close matches
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {results.map((result: ProcessedImageResult) => {
                  const matchPercent =
                    100 - (result.similarity! / tolerance) * 100;
                  return (
                    <Card
                      key={result.lotNo}
                      className="overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="relative">
                        <Image
                          alt={`Lot ${result.lotNo}`}
                          src={`${IMG_PATH_URL}/${IMG_PATH_CROP}/${result.lotNo}.webp`}
                          width={120}
                          height={80}
                          className="w-full h-20 object-cover"
                        />
                        <Badge
                          className="absolute top-2 right-2 text-xs"
                          variant={
                            matchPercent > 80
                              ? "default"
                              : matchPercent > 60
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {matchPercent.toFixed(0)}%
                        </Badge>
                      </div>
                      <CardContent className="p-2 bg-transparent">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 border rounded flex-shrink-0"
                            style={{ backgroundColor: result.hex }}
                          />
                          <span className="font-medium text-sm">
                            Lot {result.lotNo}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>HEX: {result.hex}</div>
                          <div>RGB: {result.rgb.join(", ")}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {color && results.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎨</div>
              <p className="text-muted-foreground mb-2">
                No similar colors found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting the tolerance or capture a different color
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorSearch;
