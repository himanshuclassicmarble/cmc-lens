"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, CameraType } from "react-camera-pro";
import {
  Camera as CameraIcon,
  Upload,
  X,
  RotateCcw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const RESULTS_PER_PAGE = 15;

const ColorSearch: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [color, setColor] = useState<DominantColorInfo | null>(null);
  const [results, setResults] = useState<ProcessedImageResult[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState<number>(25);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [frameSize, setFrameSize] = useState({ width: 350, height: 350 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const camera = useRef<CameraType>(null);

  // Handle responsive frame sizing after hydration
  useEffect(() => {
    const updateFrameSize = () => {
      const vw = window.innerWidth;

      if (vw <= 480) {
        setFrameSize({
          width: Math.min(280, vw - 40),
          height: Math.min(280, vw - 40),
        });
      } else if (vw <= 768) {
        setFrameSize({ width: 400, height: 400 });
      } else {
        setFrameSize({ width: 450, height: 450 });
      }
    };

    // Set initial size
    updateFrameSize();

    // Add resize listener
    window.addEventListener("resize", updateFrameSize);

    // Cleanup
    return () => window.removeEventListener("resize", updateFrameSize);
  }, []);

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
    setCurrentPage(1); // Reset to first page when new search is performed
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
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Pagination calculations
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const endIndex = startIndex + RESULTS_PER_PAGE;
  const currentResults = results.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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

      {/* Responsive Capture Frame (Grid Removed) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className="border-2 border-white/60 relative overflow-hidden"
          style={{
            width: `${frameSize.width}px`,
            height: `${frameSize.height}px`,
            boxShadow: "0 0 0 2000px rgba(0,0,0,0.3)",
          }}
        >
          {/* Corner indicators */}
          <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-white/60"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-white/60"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-white/60"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-white/60"></div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 z-30 px-4">
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
        className={`p-2 absolute bottom-0 left-0 right-0 rounded-t-3xl transition-all duration-500 ${image || results.length > 0 ? "translate-y-0" : "translate-y-full"
          } max-h-[70vh] overflow-hidden z-40`}
      >
        <div className="w-12 h-1 bg-background rounded-full mx-auto mt-2"></div>
        {color && (
          <CardHeader className="p-2">
            <div className="flex items-center justify-between">
              <Button
                onClick={clear}
                size="sm"
                variant="ghost"
                className="p-2 mr-1 rounded-full"
              >
                <ArrowLeft className="w-6 h-6" />
                <span className="ml-2 text-sm">Back</span>
              </Button>
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
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {
                      results.filter((r) => r.similarity! / tolerance < 0.3)
                        .length
                    }{" "}
                    close matches
                  </Badge>
                  {totalPages > 1 && (
                    <Badge variant="outline">
                      Page {currentPage} of {totalPages}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {currentResults.map((result: ProcessedImageResult) => {
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
                            {result.qualityGroup}
                            <div className="space-y-1 text-xs text-muted-foreground">
                              {result.color}
                            </div>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {/* Show first page */}
                    {currentPage > 3 && (
                      <>
                        <Button
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(1)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          1
                        </Button>
                        {currentPage > 4 && (
                          <span className="text-muted-foreground text-sm px-1">
                            ...
                          </span>
                        )}
                      </>
                    )}

                    {/* Show pages around current page */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === currentPage ||
                          page === currentPage - 1 ||
                          page === currentPage + 1 ||
                          (currentPage <= 3 && page <= 5) ||
                          (currentPage >= totalPages - 2 &&
                            page >= totalPages - 4),
                      )
                      .map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          {page}
                        </Button>
                      ))}

                    {/* Show last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="text-muted-foreground text-sm px-1">
                            ...
                          </span>
                        )}
                        <Button
                          variant={
                            currentPage === totalPages ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => goToPage(totalPages)}
                          className="w-8 h-8 p-0 text-xs"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
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
