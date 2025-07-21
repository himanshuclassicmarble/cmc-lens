"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function PineconeUploadComponent() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [error, setError] = useState("");

  // Single upload state
  const [singleFile, setSingleFile] = useState(null);
  const [singleUrl, setSingleUrl] = useState("");
  const [singleMetadata, setSingleMetadata] = useState("");

  // Bulk upload state
  const [bulkData, setBulkData] = useState("");

  const handleSingleUpload = async () => {
    if (!singleFile && !singleUrl) {
      setError("Please provide either a file or URL");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadResults([]);

    try {
      const formData = new FormData();
      if (singleFile) {
        formData.append("image", singleFile);
      } else {
        formData.append("imageUrl", singleUrl);
      }
      formData.append("metadata", singleMetadata);

      const response = await fetch("/api/app/pinecone-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResults([{ success: true, ...result }]);
        setSingleFile(null);
        setSingleUrl("");
        setSingleMetadata("");
      } else {
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      setError("Please provide bulk data JSON");
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(bulkData);
      if (!Array.isArray(parsedData)) {
        throw new Error("Data must be an array");
      }
    } catch (err) {
      setError("Invalid JSON format");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadResults([]);

    try {
      const formData = new FormData();
      formData.append("bulkData", JSON.stringify(parsedData));

      const response = await fetch("/api/app/pinecone-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResults(result.results || []);
        setBulkData("");
      } else {
        setError(result.error || "Bulk upload failed");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Pinecone Vector Upload
          </CardTitle>
          <CardDescription>
            Upload images to Pinecone vector database - single files or bulk
            data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Upload</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Upload Image File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSingleFile(e.target.files?.[0] || null)}
                    disabled={isUploading}
                  />
                </div>

                <div className="text-center text-sm text-gray-500">OR</div>

                <div>
                  <Label htmlFor="url">Image URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                <div>
                  <Label htmlFor="metadata">Metadata (optional)</Label>
                  <Textarea
                    id="metadata"
                    placeholder="Description or metadata for this image"
                    value={singleMetadata}
                    onChange={(e) => setSingleMetadata(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                <Button
                  onClick={handleSingleUpload}
                  disabled={isUploading || (!singleFile && !singleUrl)}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload to Pinecone
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-data">Bulk Data JSON</Label>
                  <Textarea
                    id="bulk-data"
                    placeholder="Paste your JSON array here..."
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    disabled={isUploading}
                    rows={8}
                  />
                </div>

                <Button
                  onClick={handleBulkUpload}
                  disabled={isUploading || !bulkData.trim()}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Bulk Upload...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Process Bulk Upload
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
            <CardDescription>
              {uploadResults.filter((r) => r.success).length} successful,{" "}
              {uploadResults.filter((r) => !r.success).length} failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {uploadResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">
                      {result.item || "Upload"} -{" "}
                      {result.success ? "Success" : "Failed"}
                    </span>
                  </div>
                  {result.success && (
                    <div className="mt-1 text-sm text-gray-600">
                      Vector ID: {result.vectorId} | Size: {result.originalSize}
                    </div>
                  )}
                  {!result.success && (
                    <div className="mt-1 text-sm text-red-600">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
