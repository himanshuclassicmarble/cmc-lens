"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  CheckCircle2,
  Link,
  ExternalLink,
  Copy,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UploadResponse {
  success: true;
  vectorId: string;
  dimension: number;
  timestamp: string;
  originalSize: string;
  processedSize: number;
  wasProcessed: boolean;
  source: "url";
  filename: string;
  sourceUrl?: string;
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [metadata, setMetadata] = useState("");
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);

  // Debounced URL preview
  const urlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const validateAndPreviewUrl = async (url: string) => {
    if (!url.trim()) {
      setImagePreview(null);
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("Invalid URL", {
        description: "Please enter a valid image URL",
        duration: 3000,
      });
      return;
    }
    setIsValidatingUrl(true);
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      setImagePreview(url);
      toast.success("Image URL validated", {
        description: "Preview loaded successfully",
        duration: 2000,
      });
    } catch (error) {
      toast.error("Invalid image URL", {
        description: "Unable to load image from the provided URL",
        duration: 4000,
      });
      setImagePreview(null);
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    if (!url.trim()) {
      setImagePreview(null);
      return;
    }
    urlDebounceRef.current = setTimeout(() => {
      validateAndPreviewUrl(url);
    }, 700);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageUrl("");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openImageInNewTab = () => {
    if (response?.sourceUrl) {
      window.open(response.sourceUrl, "_blank");
    } else if (imagePreview) {
      window.open(imageUrl, "_blank");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponse(null);
    setIsLoading(true);

    if (!imageUrl.trim() || !imagePreview) {
      toast.error("No image selected", {
        description: "Please enter a valid image URL",
        duration: 4000,
      });
      setIsLoading(false);
      return;
    }

    const uploadingToast = toast.loading("Uploading image...", {
      description: "Processing and uploading to Pinecone",
    });

    const formData = new FormData();
    formData.append("imageUrl", imageUrl.trim());
    formData.append("metadata", metadata);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch("/api/app/pinecone-upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      toast.dismiss(uploadingToast);

      if (data.success) {
        setResponse(data);
        toast.success("Upload successful!", {
          description: `Vector created with ID: ${data.vectorId}`,
          duration: 5000,
          action: {
            label: "Copy ID",
            onClick: () => copyToClipboard(data.vectorId, "Vector ID"),
          },
        });
      } else {
        toast.error("Upload failed", {
          description: data.error || "An unexpected error occurred",
          duration: 5000,
        });
      }
    } catch (err: any) {
      toast.dismiss(uploadingToast);
      const errorMessage =
        err.name === "AbortError"
          ? "Request timed out. Please try again."
          : err.message || "An unexpected error occurred";
      toast.error("Upload failed", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasValidInput = imageUrl.trim() !== "" && imagePreview !== null;

  return (
    <main className="min-h-screen bg-background flex justify-center items-center">
      <div className="w-full max-w-md mx-auto">
        <Card className="border-none shadow-lg bg-white/95">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold">
              <Link className="h-6 w-6 text-primary" />
              Upload Image by URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
                  Image URL
                </Label>
                <div className="relative">
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  {isValidatingUrl && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </div>
              {imagePreview && imageUrl && (
                <div className="mt-2 rounded-lg border bg-muted flex items-center p-2 gap-3">
                  <div className="relative h-14 w-14 rounded overflow-hidden flex items-center justify-center border bg-background">
                    {isValidatingUrl ? (
                      <Skeleton className="w-full h-full" />
                    ) : (
                      <img
                        src={imagePreview}
                        alt="URL Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{imageUrl}</div>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={openImageInNewTab}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(imageUrl, "Image URL")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeImage}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="metadata" className="text-xs text-muted-foreground">
                  Metadata <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="metadata"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder="Add description, tags, or other info..."
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !hasValidInput}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </form>
            {response && (
              <div className="mt-7 rounded-xl border bg-green-50 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Upload Successful</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-900">Vector ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-green-900 bg-green-100 px-2 py-1 rounded text-xs">
                      {response.vectorId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(response.vectorId, "Vector ID")}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-900">Source:</span>
                  <span className="capitalize">{response.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-900">Filename:</span>
                  <span>{response.filename}</span>
                </div>
                {response.sourceUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-900">Source URL:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-900 text-xs max-w-40 truncate">
                        {response.sourceUrl}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(response.sourceUrl, "_blank")}
                        className="h-6 w-6 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-green-900">Dimensions:</span>
                  <span>{response.dimension}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-900">Original Size:</span>
                  <span>{response.originalSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-900">Processed:</span>
                  <span>{response.wasProcessed ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-900">Timestamp:</span>
                  <span>
                    {new Date(response.timestamp).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      timeZone: "UTC",
                    })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}