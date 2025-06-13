"use client";

import React, { memo, useState, useRef, useEffect, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { RotateCcw, ImageIcon, X, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import SearchResultsCard from "@/components/search-result-card";

// Types
interface SearchResult {
  id: string;
  score: number;
  metadata: {
    filename?: string;
    path?: string;
    url?: string;
    sourceUrl?: string;
    title?: string;
    description?: string;
    originalSize?: string;
    timestamp?: string;
    inputType?: "url" | "file";
    [key: string]: any;
  };
}

interface SearchResponse {
  success: boolean;
  query: {
    originalSize: string;
    processedSize: number;
    embeddingDimension: number;
  };
  search: {
    topK: number;
    threshold: number;
    totalMatches: number;
    matchesAboveThreshold: number;
    matchesReturned: number;
  };
  results: SearchResult[];
  timestamp: string;
}

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <Card className="m-4 p-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-center">
    <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
      <X className="h-6 w-6 text-red-600 dark:text-red-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Search Failed</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error.message}</p>
    <Button onClick={resetErrorBoundary} className="bg-blue-600 hover:bg-blue-700 text-white">
      Try Again
    </Button>
  </Card>
);

// Scanning animation component
const ScanningOverlay: React.FC = () => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center bg-black/30"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="relative w-64 h-64">
      <motion.div
        className="absolute inset-0 border-2 border-blue-500 rounded-lg"
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      />
      <motion.div
        className="absolute top-0 left-0 right-0 h-2 bg-blue-500/50"
        animate={{ y: ["0%", "100%"], opacity: [0.8, 0.2] }}
        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
      />
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 bg-blue-500 rounded-full"
          style={{
            top: i % 2 === 0 ? "10%" : "90%",
            left: i < 2 ? "10%" : "90%",
          }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </div>
  </motion.div>
);

/**
 * CameraView component for capturing and searching images with Google Lens-like effects.
 * @returns JSX.Element
 */
const CameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [copied, setCopied] = useState(false);
  const [topK, setTopK] = useState(10);
  const [threshold, setThreshold] = useState(0.7);
  const [showSettings, setShowSettings] = useState(false);

  // Start camera with facing mode
  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      console.error("Camera error:", errorMessage);
      setError(errorMessage);
    }
  }, [isFrontCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Capture photo and trigger search
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context?.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedImage(imageDataUrl);
    searchSimilarImages(imageDataUrl);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setCapturedImage(imageDataUrl);
      searchSimilarImages(imageDataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }, []);

  // Search similar images
  const searchSimilarImages = useCallback(
    async (imageDataUrl: string) => {
      setIsProcessing(true);
      setError(null);
      setSearchResults(null);

      try {
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], "search-image.jpg", { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("image", file);
        formData.append("topK", topK.toString());
        formData.append("threshold", threshold.toString());

        const apiResponse = await fetch("/api/app/embedding", {
          method: "POST",
          body: formData,
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          throw new Error(data.error || "Failed to search similar images");
        }

        setSearchResults(data as SearchResponse);
        setTimeout(() => {
          setIsProcessing(false);
          setShowResults(true);
        }, 50);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        setIsProcessing(false);
      }
    },
    [topK, threshold]
  );

  // Copy results to clipboard
  const copyResults = useCallback(async () => {
    if (!searchResults) return;

    try {
      const resultsText = searchResults.results
        .map(
          (result, index) =>
            `${index + 1}. ID: ${result.id}, Similarity: ${(result.score * 100).toFixed(1)}%, Metadata: ${JSON.stringify(result.metadata)}`
        )
        .join("\n");

      await navigator.clipboard.writeText(resultsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [searchResults]);

  // Reset state
  const reset = useCallback(() => {
    setCapturedImage(null);
    setSearchResults(null);
    setError(null);
    setShowResults(false);
    setCopied(false);
    setIsProcessing(false);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setIsFrontCamera((prev) => !prev);
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="relative h-full w-full bg-black" role="region" aria-label="Camera View">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload"
        />

        {/* Camera View */}
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: isFrontCamera ? "scaleX(-1)" : "none" }}
            aria-label="Camera feed"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between p-4 pt-12">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white bg-black/30 backdrop-blur-sm rounded-full h-8 w-8"
                    aria-label="Open settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Search Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="topK">Top Results (1-20)</Label>
                      <Slider
                        id="topK"
                        min={1}
                        max={20}
                        step={1}
                        value={[topK]}
                        onValueChange={(value) => setTopK(value[0])}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">Current: {topK}</p>
                    </div>
                    <div>
                      <Label htmlFor="threshold">Similarity Threshold (50%-95%)</Label>
                      <Slider
                        id="threshold"
                        min={0.5}
                        max={0.95}
                        step={0.05}
                        value={[threshold]}
                        onValueChange={(value) => setThreshold(value[0])}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">Current: {(threshold * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Search className="h-4 w-4 text-white" />
                <span className="text-white text-sm font-medium">Image Search</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-black/30 backdrop-blur-sm rounded-full h-8 w-8"
                onClick={toggleCamera}
                aria-label="Toggle camera"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-center pb-8 pt-4">
              <div className="flex items-center gap-8">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white bg-white/20 backdrop-blur-sm rounded-full h-12 w-12 border border-white/30"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload image from gallery"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <div className="relative">
                  <Button
                    onClick={capturePhoto}
                    disabled={isProcessing}
                    className="h-20 w-20 rounded-full bg-white border-4 border-white/80 hover:bg-white/90 disabled:opacity-50 shadow-lg"
                    aria-label="Capture photo"
                  >
                    <div className="h-16 w-16 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                      <Search className="h-6 w-6 text-gray-600" />
                    </div>
                  </Button>
                  {isProcessing && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
                <div className="h-12 w-12 flex flex-col items-center justify-center text-white text-xs">
                  <span>Top {topK}</span>
                  <span>{(threshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scanning Overlay (Google Lens Effect) */}
          <AnimatePresence>
            {isProcessing && <ScanningOverlay />}
          </AnimatePresence>

          {/* Processing Overlay */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
              >
                <Card className="p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
                    <motion.div
                      className="w-16 h-16 border-4 border-t-blue-500 rounded-full animate-spin absolute top-0"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <Search className="w-6 h-6 text-blue-500 absolute top-5 left-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Searching Images
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Finding similar images in database...
                  </p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Overlay */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
              >
                <Card className="p-6 mx-4 max-w-sm w-full text-center shadow-2xl">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Search Failed
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
                  <Button
                    onClick={reset}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Try Again
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
                {/* Search Results */}
        <AnimatePresence>
          {showResults && searchResults && capturedImage && (
            <motion.div
            
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <SearchResultsCard
                results={searchResults.results}
                capturedImage={capturedImage}
                threshold={threshold}
                onClose={() => setShowResults(false)}
                onNewSearch={reset}
                totalMatches={searchResults.search.totalMatches}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
};

export default memo(CameraView);
