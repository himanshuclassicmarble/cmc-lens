"use client";

import type React from "react";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  RotateCcw,
  ImageIcon,
  X,
  Copy,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface EmbeddingResult {
  vector: number[];
  dimension: number;
  timestamp: string;
}

export default function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EmbeddingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [copied, setCopied] = useState(false);

  // Remove stream from dependencies to prevent infinite loop
  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream if it exists
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
  }, [isFrontCamera]); // Remove stream from dependencies

  // Separate effect for camera initialization and cleanup
  useEffect(() => {
    startCamera();
    
    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isFrontCamera]); // Only depend on isFrontCamera

  // Separate cleanup effect for when stream changes
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context?.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedImage(imageDataUrl);
    generateEmbedding(imageDataUrl);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      generateEmbedding(imageDataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const generateEmbedding = async (imageDataUrl: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Convert data URL to File
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("image", file);

      const apiResponse = await fetch("/api/app/embedding", {
        method: "POST",
        body: formData,
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error || "Failed to generate embeddings");
      }

      setResult(data);
      setTimeout(() => {
        setIsProcessing(false);
        setShowResult(true);
      }, 50); // Small delay for better UX
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const copyVector = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(result.vector));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setShowResult(false);
    setCopied(false);
    setIsProcessing(false);
  };

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
  };

  const getVectorPreview = (vector: number[]) => {
    return vector
      .slice(0, 8)
      .map((v) => {
        // Convert to number and validate
        const num = typeof v === 'number' ? v : parseFloat(v);
        
        // Handle invalid numbers
        if (isNaN(num)) {
          return '0.000';
        }
        
        return num.toFixed(3);
      })
      .join(", ");
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
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
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Bar - Instagram/Snapchat style */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between p-4 pt-12">
            <div className="w-8" /> {/* Spacer */}
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-white text-sm font-medium">CLIP Lens</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-black/30 backdrop-blur-sm rounded-full h-8 w-8"
              onClick={toggleCamera}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Controls - Instagram/Snapchat style */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-center pb-8 pt-4">
            <div className="flex items-center gap-8">
              {/* Gallery Button */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-white/20 backdrop-blur-sm rounded-full h-12 w-12 border border-white/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              {/* Capture Button - Instagram style */}
              <div className="relative">
                <Button
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="h-20 w-20 rounded-full bg-white border-4 border-white/80 hover:bg-white/90 disabled:opacity-50 shadow-lg"
                >
                  <div className="h-16 w-16 rounded-full bg-white border-2 border-gray-300" />
                </Button>
                {isProcessing && (
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                )}
              </div>

              {/* Spacer for symmetry */}
              <div className="h-12 w-12" />
            </div>
          </div>
        </div>

        {/* Processing Overlay - Google Lens style */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl"
              >
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
                  <div className="w-16 h-16 border-4 border-t-blue-500 rounded-full animate-spin absolute top-0" />
                  <Sparkles className="w-6 h-6 text-blue-500 absolute top-5 left-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Analyzing image
                </h3>
                <p className="text-gray-600 text-sm">
                  Generating CLIP embeddings...
                </p>
              </motion.div>
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
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl"
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h3>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <Button
                  onClick={reset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Try Again
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Card - Google Lens style */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30 p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Card Header */}
              <div className="relative">
                {capturedImage && (
                  <div className="h-48 overflow-hidden">
                    <Image
                      src={capturedImage}
                      alt="Captured"
                      width={400}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 bg-black/20 backdrop-blur-sm text-white rounded-full h-8 w-8"
                  onClick={() => setShowResult(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Card Content */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      CLIP Embedding
                    </h3>
                    <p className="text-sm text-gray-600">
                      {result.dimension} dimensions
                    </p>
                  </div>
                </div>

                {/* Vector Preview */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Vector Data
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyVector}
                      className="h-8 px-3 text-xs bg-white hover:bg-gray-100"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <code className="text-xs text-gray-600 font-mono block">
                      [{getVectorPreview(result.vector)}...]
                    </code>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Ready for vector database storage
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={copyVector}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {copied ? "Copied!" : "Copy Vector"}
                  </Button>
                  <Button onClick={reset} variant="outline" className="flex-1">
                    New Photo
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
