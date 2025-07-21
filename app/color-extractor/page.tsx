"use client"
import { useState, useCallback } from "react"
import type React from "react"
import { extractColors, type ExtractedImageInfo } from "./utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileIcon, Loader2, Upload } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

const IMG_PATH_URL = `https://ypafaxfcutwjamwcaclp.supabase.co/storage/v1/object/public/natural-public/`
const IMG_PATH_CROP = "webp-crop-new"

interface JsonColorData {
  color: string
  qualityGroup: string
  count: number
  imageName: string | null
}

export default function Home() {
  const [extractedImageInfo, setExtractedImageInfo] = useState<ExtractedImageInfo | null>(null)
  const [extractedColorsFromJSONImages, setExtractedColorsFromJSONImages] = useState<ExtractedImageInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  const clearStates = useCallback(() => {
    setError(null)
    setExtractedImageInfo(null)
    setExtractedColorsFromJSONImages(null)
    setUploadSuccess(null)
  }, [])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setError("No file selected.")
      return
    }
    clearStates()
    setIsLoading(true)

    if (file.type === "application/json") {
      try {
        const text = await file.text()
        const parsedData: JsonColorData[] = JSON.parse(text)
        if (!Array.isArray(parsedData)) {
          throw new Error("JSON must contain an array of color data objects")
        }
        const imagesToProcess = parsedData.filter((item) => item?.imageName && item.imageName !== "NULL")
        if (imagesToProcess.length > 0) {
          const extractedResults: ExtractedImageInfo[] = []
          for (const item of imagesToProcess) {
            try {
              const imageUrl = `${IMG_PATH_URL}${IMG_PATH_CROP}/${item.imageName}.webp`
              const response = await fetch(imageUrl)
              if (!response.ok) continue
              const imageBlob = await response.blob()
              const imageFileForExtraction = new File([imageBlob], `${item.imageName}.webp`, {
                type: imageBlob.type,
              })

              const result = await extractColors(
                imageFileForExtraction,
                `${item.imageName}.webp`,
                { quality: 10 },
                {
                  color: item.color,
                  qualityGroup: item.qualityGroup,
                  count: item.count,
                },
              )
              extractedResults.push(result)
            } catch (imgErr) {
              console.error(`Error processing image ${item.imageName}:`, imgErr)
            }
          }
          if (extractedResults.length > 0) {
            setExtractedColorsFromJSONImages(extractedResults)
          } else {
            setError("No valid images could be processed from the JSON file.")
          }
        }
      } catch (err) {
        setError(`Failed to parse JSON file: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    } else if (file.type.startsWith("image/")) {
      try {
        const result = await extractColors(file, file.name, { quality: 10 })
        if (result.dominantColor === null && result.colors.length === 0) {
          setError("No colors extracted from the image.")
        } else {
          setExtractedImageInfo(result)
        }
      } catch (err) {
        setError(`Failed to extract colors: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    } else {
      setError("Unsupported file type. Please upload a JSON or image file.")
      setIsLoading(false)
    }
  }

  const handleUploadToVectorDB = async () => {
    if (!extractedColorsFromJSONImages || extractedColorsFromJSONImages.length === 0) {
      setError("No extracted color data available to upload.")
      return
    }
    setIsUploading(true)
    setError(null)
    setUploadSuccess(null)
    try {
      const imageData = extractedColorsFromJSONImages.map((info) => ({
        imageName: info.imageName,
        imageUrl: `${IMG_PATH_URL}${IMG_PATH_CROP}/${info.imageName}`,
        dominantColor: info.dominantColor,
        originalJsonMetadata: info.originalJsonMetadata,
      }))
      const response = await fetch("/api/image-bind-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData }),
      })
      const result = await response.json()
      if (response.ok) {
        setUploadSuccess(
          `Successfully uploaded ${result.vectorsUploaded} vectors for ${result.imagesProcessed} images.`,
        )
      } else {
        setError(result.error || "Failed to upload to vector database.")
      }
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* File Upload Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Dominant Color Extractor & Vector Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label
            htmlFor="file"
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 transition hover:border-blue-400 hover:bg-gray-50 cursor-pointer text-center"
          >
            <FileIcon className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Drop your image or JSON file here or <span className="text-blue-500 underline">click to browse</span>
            </p>
            <Input
              id="file"
              type="file"
              accept="image/*,application/json"
              onChange={handleImageUpload}
              className="hidden"
            />
          </Label>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {uploadSuccess && (
            <Alert>
              <AlertDescription className="text-green-600">{uploadSuccess}</AlertDescription>
            </Alert>
          )}
          {isLoading && (
            <div className="flex justify-center items-center gap-2 text-gray-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          {/* Upload Button */}
          {extractedColorsFromJSONImages && extractedColorsFromJSONImages.length > 0 && (
            <div className="flex justify-center">
              <Button onClick={handleUploadToVectorDB} disabled={isUploading} className="flex items-center gap-2">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload to Vector DB
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Display */}
      {extractedImageInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Single Image Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extractedImageInfo.dominantColor && extractedImageInfo.dominantColor.percentage > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: extractedImageInfo.dominantColor.hex }}
                  />
                  <div className="text-sm">
                    <p className="font-medium">Dominant: {extractedImageInfo.dominantColor.hex}</p>
                    <p className="text-gray-600">{extractedImageInfo.dominantColor.percentage}%</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {extractedImageInfo.colors
                  .filter(color => color.percentage > 0)
                  .slice(0, 8)
                  .map((color, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded border text-xs">
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.hex }} />
                      <span>{color.hex}</span>
                      <Badge variant="secondary" className="text-xs">
                        {color.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {extractedColorsFromJSONImages && extractedColorsFromJSONImages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">JSON Images Processed ({extractedColorsFromJSONImages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {extractedColorsFromJSONImages.slice(0, 6).map((imageInfo, index) => {
                return (
                  <div key={index} className="p-3 rounded-lg border bg-gray-50">
                    <div className="text-sm font-medium mb-2 truncate">{imageInfo.imageName}</div>

                    {imageInfo.originalJsonMetadata && (
                      <div className="text-xs text-gray-600 mb-2">
                        <Badge variant="outline" className="mr-2">
                          {imageInfo.originalJsonMetadata.qualityGroup}
                        </Badge>
                        <span>Count: {imageInfo.originalJsonMetadata.count}</span>
                      </div>
                    )}
                    
                    {/* Show only dominant color */}
                    <div className="flex items-center gap-2">
                      {imageInfo.dominantColor && imageInfo.dominantColor.percentage > 0 && (
                        <>
                          <div
                            className="w-8 h-8 rounded border border-gray-300"
                            style={{ backgroundColor: imageInfo.dominantColor.hex }}
                            title={`${imageInfo.dominantColor.hex} (${imageInfo.dominantColor.percentage.toFixed(1)}%)`}
                          />
                          <div className="text-xs text-gray-600">
                            <div className="font-medium">{imageInfo.dominantColor.hex}</div>
                            <div>{imageInfo.dominantColor.percentage.toFixed(1)}%</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {extractedColorsFromJSONImages.length > 6 && (
              <div className="text-center text-sm text-gray-600 mt-3">
                And {extractedColorsFromJSONImages.length - 6} more images...
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Empty State */}
      {!extractedImageInfo && !extractedColorsFromJSONImages && !isLoading && !error && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="text-sm">Upload an image or JSON file to extract dominant colors and upload to the vector database.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
