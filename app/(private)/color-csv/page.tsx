"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileIcon, Loader2, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProcessedImageResult } from "./types";
import { downloadCSV, downloadJSON, handleImageUpload } from "./data-utils";
import ColorTable from "./color-table";

export default function Home() {
  const [processedResults, setProcessedResults] = useState<
    ProcessedImageResult[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [singleImageResult, setSingleImageResult] =
    useState<ProcessedImageResult | null>(null);

  const clearStates = useCallback(() => {
    setError(null);
    setProcessedResults([]);
    setSingleImageResult(null);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Dominant Color Extractor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label
            htmlFor="file"
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 transition hover:border-blue-400 hover:bg-gray-50 cursor-pointer text-center"
          >
            <FileIcon className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Drop your image or JSON file here or{" "}
              <span className="text-blue-500 underline">click to browse</span>
            </p>
            <Input
              id="file"
              type="file"
              accept="image/*,application/json"
              onChange={(e) =>
                handleImageUpload(e, {
                  setError,
                  setIsLoading,
                  setProcessedResults,
                  setSingleImageResult,
                  clearStates,
                })
              }
              className="hidden"
            />
          </Label>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="flex justify-center items-center gap-2 text-gray-500 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}

          {(processedResults.length > 0 || singleImageResult) && (
            <div className="flex gap-2 justify-center">
              {processedResults.length > 0 && (
                <>
                  <Button
                    onClick={() => downloadJSON(processedResults)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadCSV(processedResults)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {singleImageResult && <ColorTable results={[singleImageResult]} />}

      {!singleImageResult &&
        processedResults.length === 0 &&
        !isLoading &&
        !error && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <p className="text-sm">
                Upload an image or JSON file to extract dominant colors.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
