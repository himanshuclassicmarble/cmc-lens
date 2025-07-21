"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, Search, X, Loader2, Palette, Upload, ArrowLeft } from "lucide-react"
import { extractColors, type SearchResult, type ExtractedImageInfo } from "../color-extractor/utils.ts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CameraSearchPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [extractedColors, setExtractedColors] = useState<ExtractedImageInfo | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [showResultsPopup, setShowResultsPopup] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefer rear camera
      })
      setStream(mediaStream)
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Could not access camera. Please check permissions.")
    }
  }

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setIsCameraActive(false)
    }
  }, [stream])

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedImage(imageDataUrl)

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
          await processImage(file)
        }
      },
      "image/jpeg",
      0.9,
    )
  }, [])

  // Process image: extract colors and then search
  const processImage = async (file: File) => {
    setIsLoading(true)
    setSearchResults([])
    try {
      const colorInfo = await extractColors(file, file.name)
      setExtractedColors(colorInfo)

      const reader = new FileReader()
      reader.onloadend = () => {
        const imageDataUrl = reader.result as string
        searchWithImage(imageDataUrl)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error processing image:", error)
      alert("Error processing image for color extraction.")
      setIsLoading(false)
    }
  }

  // Search with image via API
  const searchWithImage = async (imageDataUrl: string) => {
    try {
      const response = await fetch("/api/image-bind-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: imageDataUrl,
          searchType: "image",
          topK: 10,
        }),
      })
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.results)
        setShowResultsPopup(true)
      } else {
        console.error("Search failed:", data.error)
        alert(data.error || "Search failed.")
      }
    } catch (error) {
      console.error("Error performing search:", error)
      alert("Error performing search.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setCapturedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
      processImage(file)
    }
  }

  // Clear all results
  const clearResults = () => {
    setCapturedImage(null)
    setExtractedColors(null)
    setSearchResults([])
    setShowResultsPopup(false)
    stopCamera()
  }

  // Close popup
  const closePopup = () => {
    setShowResultsPopup(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Start camera on component mount
  useEffect(() => {
    startCamera()
  }, [])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Camera View */}
      {isCameraActive && (
        <div className="absolute inset-0">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
          
          {/* Top overlay with close button */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex justify-between items-center">
              <Button 
                onClick={clearResults} 
                variant="ghost" 
                className="text-white hover:bg-white/20"
                size="sm"
              >
                <X className="w-6 h-6" />
              </Button>
              <h1 className="text-white font-semibold">Color Lens</h1>
              <div className="w-10" />
            </div>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-8 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-center space-x-8">
              {/* Upload button */}
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>

              {/* Capture button */}
              <Button
                onClick={capturePhoto}
                disabled={isLoading}
                className="w-20 h-20 bg-white hover:bg-gray-200 rounded-full border-4 border-white/30 flex items-center justify-center shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                ) : (
                  <div className="w-16 h-16 bg-white rounded-full" />
                )}
              </Button>

              {/* Gallery/Results button */}
              <Button
                onClick={() => setShowResultsPopup(true)}
                disabled={searchResults.length === 0}
                className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/30"
              >
                <div className="w-8 h-8 bg-white/40 rounded-lg flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Initial loading state */}
      {!isCameraActive && !capturedImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p>Starting camera...</p>
          </div>
        </div>
      )}

      {/* Results Popup */}
      {showResultsPopup && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <Button
                onClick={closePopup}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
              <h2 className="text-white text-lg font-semibold">
                Similar Images ({searchResults.length})
              </h2>
              <div className="w-10" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Captured image and dominant color */}
              {capturedImage && extractedColors && (
                <div className="mb-6 bg-gray-900/50 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full rounded-xl"
                      />
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-3">Dominant Color</h4>
                      {extractedColors.dominantColor && extractedColors.dominantColor.percentage > 0 ? (
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-24 h-24 rounded-xl border border-white/20" 
                            style={{ backgroundColor: extractedColors.dominantColor.hex }} 
                          />
                          <div>
                            <div className="text-lg text-white font-mono mb-1">
                              {extractedColors.dominantColor.hex}
                            </div>
                            <div className="text-white/70">
                              {extractedColors.dominantColor.percentage.toFixed(1)}% coverage
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-white/70">No dominant color detected</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-white mb-4" />
                  <p className="text-white/70">Searching for similar colors...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="bg-gray-900/50 rounded-xl p-3 backdrop-blur-sm border border-white/10"
                    >
                      <div className="relative mb-3">
                        <img
                          src={result.metadata.imageUrl || "/placeholder.svg"}
                          alt={result.metadata.imageName}
                          className="w-full aspect-square object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23374151'/%3E%3Ctext x='100' y='100' textAnchor='middle' dy='0.3em' fontFamily='Arial' fontSize='12' fill='%23fff'%3EImage not found%3C/text%3E%3C/svg%3E"
                          }}
                        />
                        <Badge className="absolute top-2 right-2 bg-white/20 text-white border-0">
                          {(result.score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-white truncate">
                          {result.metadata.imageName}
                        </div>
                        
                        {/* Show dominant color only */}
                        {result.metadata.dominantColor && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border border-white/20"
                              style={{ backgroundColor: result.metadata.dominantColor }}
                              title={result.metadata.dominantColor}
                            />
                            <span className="text-xs text-white/70 font-mono">
                              {result.metadata.dominantColor}
                            </span>
                          </div>
                        )}

                        {result.metadata.qualityGroup && (
                          <Badge variant="outline" className="text-xs bg-white/10 text-white/70 border-white/20">
                            {result.metadata.qualityGroup}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : capturedImage && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="w-12 h-12 text-white/40 mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">No Similar Images Found</h3>
                  <p className="text-white/70 text-center">Try capturing a different image with more distinct colors.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
