"use client"

import type React from "react"
import { memo, useState, useRef, useEffect, useCallback, useMemo } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ImageIcon, X, Settings, RotateCcw, Zap, ZapOff, Grid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { motion, AnimatePresence } from "framer-motion"
import SearchResultsCard from "@/components/search-result-card"

// Types
interface Metadata {
  filename?: string
  path?: string
  url?: string
  sourceUrl?: string
  title?: string
  description?: string
  originalSize?: string
  timestamp?: string
  inputType?: "url" | "file"
}

interface SearchResult {
  id: string
  score: number
  metadata: Metadata
}

interface SearchResponse {
  success: boolean
  query: {
    originalSize: string
    processedSize: number
    embeddingDimension: number
  }
  search: {
    topK: number
    threshold: number
    totalMatches: number
    matchesAboveThreshold: number
    matchesReturned: number
  }
  results: SearchResult[]
  timestamp: string
}

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => (
  <Card className="m-4 p-6 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-center">
    <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
      <X className="h-6 w-6 text-red-600 dark:text-red-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Camera Error</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error.message}</p>
    <Button onClick={resetErrorBoundary} className="bg-blue-600 hover:bg-blue-700 text-white">
      Try Again
    </Button>
  </Card>
)

// Simple loading modal component
const LoadingModal: React.FC = () => (
  <motion.div
    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <Card className="p-8 mx-4 max-w-sm w-full text-center shadow-2xl bg-black/90 backdrop-blur-xl border-white/20">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="w-16 h-16 border-4 border-gray-700 rounded-full" />
        <motion.div
          className="w-16 h-16 border-4 border-t-white rounded-full absolute top-0"
          animate={{ rotate: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" }}
        />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Processing</h3>
      <p className="text-gray-300 text-sm">Analyzing your image...</p>
    </Card>
  </motion.div>
)

/**
 * Enhanced iPhone-style CameraView component for capturing and searching images.
 * @returns JSX.Element
 */
const CameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [topK, setTopK] = useState(10)
  const [threshold, setThreshold] = useState(0.7)
  const [showSettings, setShowSettings] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [flashMode, setFlashMode] = useState<"off" | "on">("off")
  const [showGrid, setShowGrid] = useState(false)

  // Frame dimensions for cropping
  const [frameSize, setFrameSize] = useState({
    width: 320,
    height: 320,
    aspectRatio: 1,
  })

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === "videoinput")
      setAvailableCameras(videoDevices)
      return videoDevices
    } catch (err) {
      console.error("Error getting camera devices:", err)
      return []
    }
  }, [])

  // Stop current stream
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }
  }, [])

  // Start camera with facing mode
  const startCamera = useCallback(async () => {
    try {
      setIsCameraReady(false)
      stopCurrentStream()

      const cameras = await getAvailableCameras()

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 },
        },
      }

      if (cameras.length > 1) {
        constraints.video = {
          ...(typeof constraints.video === "object" && constraints.video !== null ? constraints.video : {}),
          facingMode: isFrontCamera ? "user" : "environment",
        }
      } else if (cameras.length === 1) {
        constraints.video = {
          ...(typeof constraints.video === "object" && constraints.video !== null ? constraints.video : {}),
          deviceId: { exact: cameras[0].deviceId },
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true)
          setError(null)

          if (videoRef.current) {
            const videoWidth = videoRef.current.videoWidth
            const videoHeight = videoRef.current.videoHeight
            const minDimension = Math.min(videoWidth, videoHeight) * 0.75

            setFrameSize((prev) => ({
              ...prev,
              width: minDimension,
              height: minDimension * (1 / prev.aspectRatio),
            }))
          }
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera"
      console.error("Camera error:", errorMessage)
      setError(errorMessage)
      setIsCameraReady(false)
    }
  }, [isFrontCamera, stopCurrentStream, getAvailableCameras])

  // Initialize camera on mount
  useEffect(() => {
    startCamera()
    return () => stopCurrentStream()
  }, [startCamera, stopCurrentStream])

  // Handle camera switch
  const toggleCamera = useCallback(async () => {
    if (availableCameras.length <= 1) {
      setError("Only one camera available")
      return
    }

    setIsFrontCamera((prev) => !prev)
  }, [availableCameras.length])

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (availableCameras.length > 0) {
      startCamera()
    }
  }, [isFrontCamera, startCamera, availableCameras.length])

  // Search similar images
  const searchSimilarImages = useCallback(
    async (imageDataUrl: string) => {
      setIsProcessing(true)
      setError(null)
      setSearchResults(null)

      try {
        const response = await fetch(imageDataUrl)
        const blob = await response.blob()
        const file = new File([blob], "search-image.jpg", { type: "image/jpeg" })

        const formData = new FormData()
        formData.append("image", file)
        formData.append("topK", topK.toString())
        formData.append("threshold", threshold.toString())

        const apiResponse = await fetch("/api/app/embedding", {
          method: "POST",
          body: formData,
        })

        const data = await apiResponse.json()

        if (!apiResponse.ok) {
          throw new Error(data.error || "Failed to search similar images")
        }

        setSearchResults(data as SearchResponse)
        setTimeout(() => {
          setIsProcessing(false)
          setShowResults(true)
        }, 500)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        setIsProcessing(false)
      }
    },
    [topK, threshold],
  )

  // Capture photo with cropping and trigger search
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = frameSize.width
    canvas.height = frameSize.height

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    const sourceX = (videoWidth - frameSize.width) / 2
    const sourceY = (videoHeight - frameSize.height) / 2

    // Apply transformation for front camera
    if (isFrontCamera) {
      context.scale(-1, 1)
      context.translate(-frameSize.width, 0)
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      frameSize.width,
      frameSize.height,
      0,
      0,
      frameSize.width,
      frameSize.height,
    )

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92)
    setCapturedImage(imageDataUrl)
    searchSimilarImages(imageDataUrl)
  }, [searchSimilarImages, isCameraReady, frameSize, isFrontCamera])

  // Handle file upload
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string
        setCapturedImage(imageDataUrl)
        searchSimilarImages(imageDataUrl)
      }
      reader.readAsDataURL(file)
      event.target.value = ""
    },
    [searchSimilarImages],
  )

  // Reset state
  const reset = useCallback(() => {
    setCapturedImage(null)
    setSearchResults(null)
    setError(null)
    setShowResults(false)
    setIsProcessing(false)
  }, [])

  // Toggle flash mode
  const toggleFlash = useCallback(() => {
    setFlashMode((prev) => {
      const newMode = prev === "off" ? "on" : "off"

      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0]
        if (videoTrack && "applyConstraints" in videoTrack) {
          try {
            const capabilities = videoTrack.getCapabilities()
            if ("torch" in capabilities && (capabilities as { torch?: boolean }).torch) {
              videoTrack
                .applyConstraints({
                  advanced: [{ ...( { torch: newMode === "on" } as MediaTrackConstraintSet & { torch?: boolean }) }],
                })
                .catch((err) => console.error("Flash not supported:", err))
            }
          } catch (err) {
            console.error("Flash control error:", err)
          }
        }
      }

      return newMode
    })
  }, [])

  // Calculate frame position
  const framePosition = useMemo(
    () => ({
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: `${frameSize.width}px`,
      height: `${frameSize.height}px`,
    }),
    [frameSize],
  )

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="relative h-full w-full bg-black overflow-hidden" role="region" aria-label="Camera View">
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
            className={`h-full w-full object-cover transition-all duration-500 ${
              isCameraReady ? "opacity-100" : "opacity-0"
            }`}
            style={{ transform: isFrontCamera ? "scaleX(-1)" : "none" }}
            aria-label="Camera feed"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading overlay when camera is not ready */}
          {!isCameraReady && (
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              <div className="text-white text-center">
                <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-lg font-medium">Preparing Camera</p>
                <p className="text-sm text-white/70 mt-1">Please wait...</p>
              </div>
            </div>
          )}

          {/* Grid overlay */}
          {showGrid && isCameraReady && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="33.33" height="33.33" patternUnits="userSpaceOnUse">
                    <path
                      d="M 33.33 0 L 33.33 33.33 M 0 33.33 L 33.33 33.33"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
          )}

          {/* Enhanced Capture Frame (iPhone style) */}
          {isCameraReady && (
            <div
              className="absolute pointer-events-none z-10"
              style={{
                position: "absolute",
                ...framePosition,
                boxShadow: "0 0 0 2000px rgba(0, 0, 0, 0.4)",
              }}
              aria-label="Capture frame"
            >
              <div className="relative w-full h-full border-2 border-white/80 rounded-2xl shadow-2xl">
                {/* Dynamic corner markers */}
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-8 h-8 border-white/90"
                    style={{
                      top: i % 2 === 0 ? "-4px" : "calc(100% - 28px)",
                      left: i < 2 ? "-4px" : "calc(100% - 28px)",
                      borderWidth: "3px",
                      borderTopWidth: i % 2 === 0 ? "3px" : "0",
                      borderBottomWidth: i % 2 === 1 ? "3px" : "0",
                      borderLeftWidth: i < 2 ? "3px" : "0",
                      borderRightWidth: i >= 2 ? "3px" : "0",
                      borderRadius:
                        i === 0 ? "12px 0 0 0" : i === 1 ? "0 12px 0 0" : i === 2 ? "0 0 0 12px" : "0 0 12px 0",
                    }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, delay: i * 0.1 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="bg-gradient-to-b from-black/60 via-black/30 to-transparent pt-12 pb-6">
              <div className="flex items-center justify-between px-6">
                {/* Flash Control */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleFlash}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                    flashMode === "on"
                      ? "bg-yellow-500/20 backdrop-blur-md border border-yellow-400/30"
                      : "bg-black/40 backdrop-blur-md border border-white/20"
                  }`}
                  aria-label={`Flash ${flashMode}`}
                >
                  {flashMode === "off" ? (
                    <ZapOff className="h-5 w-5 text-white" />
                  ) : (
                    <Zap className="h-5 w-5 text-yellow-400" />
                  )}
                </motion.button>

                {/* Grid Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowGrid(!showGrid)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                    showGrid
                      ? "bg-blue-500/20 backdrop-blur-md border border-blue-400/30"
                      : "bg-black/40 backdrop-blur-md border border-white/20"
                  }`}
                  aria-label="Toggle grid"
                >
                  <Grid className={`h-5 w-5 ${showGrid ? "text-blue-400" : "text-white"}`} />
                </motion.button>

                {/* Camera Switch */}
                {availableCameras.length > 1 && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleCamera}
                    disabled={!isCameraReady}
                    className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                    aria-label={`Switch to ${isFrontCamera ? "back" : "front"} camera`}
                  >
                    <RotateCcw className="h-5 w-5 text-white" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-8">
              <div className="flex items-center justify-between px-8">
                {/* Gallery Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200"
                  aria-label="Open gallery"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/90 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-800" />
                  </div>
                </motion.button>

                {/* Enhanced Capture Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={capturePhoto}
                  disabled={isProcessing || !isCameraReady}
                  className="relative w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 p-2 disabled:opacity-50 transition-all duration-200"
                  aria-label="Capture photo"
                >
                  <div className="w-full h-full rounded-full bg-white border-2 border-black/10 flex items-center justify-center relative overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-500/20"
                      animate={{ rotate: isProcessing ? 360 : 0 }}
                      transition={{ repeat: isProcessing ? Number.POSITIVE_INFINITY : 0, duration: 2 }}
                    />
                  </div>
                </motion.button>

                {/* Settings Button */}
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="w-14 h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200"
                      aria-label="Open settings"
                    >
                      <Settings className="h-5 w-5 text-white" />
                    </motion.button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-xl border-white/20 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">Camera Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="topK" className="text-white/90">
                          Results Count: {topK}
                        </Label>
                        <Slider
                          id="topK"
                          min={1}
                          max={20}
                          step={1}
                          value={[topK]}
                          onValueChange={(value) => setTopK(value[0])}
                          className="mt-3"
                        />
                      </div>
                      <div>
                        <Label htmlFor="threshold" className="text-white/90">
                          Similarity: {(threshold * 100).toFixed(0)}%
                        </Label>
                        <Slider
                          id="threshold"
                          min={0.5}
                          max={0.95}
                          step={0.05}
                          value={[threshold]}
                          onValueChange={(value) => setThreshold(value[0])}
                          className="mt-3"
                        />
                      </div>
                      <div>
                        <Label className="text-white/90">Frame Aspect Ratio</Label>
                        <div className="flex gap-2 mt-3">
                          {[
                            { ratio: 1, label: "1:1" },
                            { ratio: 4 / 3, label: "4:3" },
                            { ratio: 16 / 9, label: "16:9" },
                          ].map(({ ratio, label }) => (
                            <Button
                              key={ratio}
                              variant={frameSize.aspectRatio === ratio ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                setFrameSize((prev) => ({
                                  ...prev,
                                  aspectRatio: ratio,
                                  height: prev.width / ratio,
                                }))
                              }
                              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-white/90">Show Grid Lines</Label>
                        <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Enhanced Status Indicator */}
          <div className="absolute top-32 left-0 right-0 flex justify-center z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
            >
              <span className="text-white text-sm font-medium">
                {isFrontCamera ? "Front" : "Back"} •{" "}
                {frameSize.aspectRatio === 1 ? "Square" : frameSize.aspectRatio === 4 / 3 ? "Standard" : "Wide"}
              </span>
            </motion.div>
          </div>

          {/* Loading Modal */}
          <AnimatePresence>{isProcessing && <LoadingModal />}</AnimatePresence>

          {/* Enhanced Error Overlay */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30"
              >
                <Card className="p-8 mx-4 max-w-sm w-full text-center shadow-2xl bg-black/90 backdrop-blur-xl border-red-500/30">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <X className="h-8 w-8 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {error.includes("camera") ? "Camera Error" : "Search Error"}
                  </h3>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">{error}</p>
                  <div className="space-y-3">
                    <Button
                      onClick={reset}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                    >
                      Try Again
                    </Button>
                    {error.includes("camera") && (
                      <Button
                        onClick={startCamera}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        Restart Camera
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Enhanced Search Results */}
        <AnimatePresence>
          {showResults && searchResults && capturedImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute inset-0 z-30"
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
  )
}

export default memo(CameraView)
