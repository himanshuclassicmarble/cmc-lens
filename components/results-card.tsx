"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image"

import {
  ChevronDown,
  Download,
  Share2,
  Copy,
  Info,
  AlertCircle,
  CheckCircle,
  Eye,
  Sparkles,
  Database,
  Clock,
  Zap,
  Hash,
  GitBranch,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Updated EmbeddingsData interface
interface EmbeddingsData {
  id: string;
  timestamp: string;
  processing_time_ms: number;
  embeddings: {
    vector: number[];
    dimension: number;
    model: string;
    version: string;
  };
  image_metadata: {
    original_size: number;
    original_type: string;
    processed_size: number;
    dimensions: string;
    filename?: string;
  };
  technical: {
    api_version: string;
    success: boolean;
    processing_steps?: string[];
  };
}

interface ResultsCardProps {
  onClose: () => void;
  image: string;
  analysisData?: EmbeddingsData | null;
  analysisError?: string | null;
}

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
};

const getVectorStats = (vector: number[]) => {
  const min = Math.min(...vector);
  const max = Math.max(...vector);
  const mean = vector.reduce((a, b) => a + b, 0) / vector.length;
  const variance =
    vector.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    vector.length;
  const std = Math.sqrt(variance);
  const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));

  return { min, max, mean, std, magnitude, length: vector.length };
};

const getVectorPreview = (vector: number[], count = 5): string => {
  if (vector.length <= count * 2) {
    return vector.map((v) => v.toFixed(4)).join(", ");
  }

  const start = vector
    .slice(0, count)
    .map((v) => v.toFixed(4))
    .join(", ");
  const end = vector
    .slice(-count)
    .map((v) => v.toFixed(4))
    .join(", ");
  return `${start} ... ${end}`;
};

export default function ResultsCard({
  onClose,
  image,
  analysisData,
  analysisError,
}: ResultsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Memoize calculations
  const vectorStats = useMemo(
    () =>
      analysisData ? getVectorStats(analysisData.embeddings.vector) : null,
    [analysisData],
  );

  const vectorPreview = useMemo(
    () =>
      analysisData ? getVectorPreview(analysisData.embeddings.vector) : "",
    [analysisData],
  );

const copyToClipboard = async (text: string, section: string) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

const downloadJSON = () => {
  if (!analysisData) return;

  const jsonStr = JSON.stringify(analysisData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clip_embeddings_${analysisData.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

  // Handle error state
  if (analysisError) {
    return (
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-50"
        initial={{ y: "100%" }}
        animate={{ y: "15%" }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="bg-gradient-to-t from-black/60 via-black/20 to-transparent h-32 absolute -top-32 left-0 right-0 pointer-events-none" />
        <Card className="rounded-t-3xl rounded-b-none bg-background/95 backdrop-blur-xl border-0 shadow-2xl h-[70vh] md:h-[60vh] overflow-hidden">
          <div
            className="h-10 flex items-center justify-center cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-1" />
          </div>
          <div className="px-6 pb-6 h-full flex flex-col items-center justify-center">
            <div className="p-4 rounded-full bg-red-50 mb-4">
              <AlertCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-center">
              Embeddings Generation Failed
            </h2>
            <p className="text-muted-foreground text-center mb-6 max-w-sm leading-relaxed">
              {analysisError}
            </p>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline" className="px-6">
                Close
              </Button>
              <Button onClick={() => window.location.reload()} className="px-6">
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Handle loading state
  if (!analysisData) {
    return (
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-50"
        initial={{ y: "100%" }}
        animate={{ y: "25%" }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="bg-gradient-to-t from-black/60 via-black/20 to-transparent h-32 absolute -top-32 left-0 right-0 pointer-events-none" />
        <Card className="rounded-t-3xl rounded-b-none bg-background/95 backdrop-blur-xl border-0 shadow-2xl h-[60vh] md:h-[50vh] overflow-hidden">
          <div className="h-10 flex items-center justify-center">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-1" />
          </div>
          <div className="px-6 pb-6 h-full flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-t-primary rounded-full animate-spin absolute top-0"></div>
              <GitBranch className="w-8 h-8 text-primary absolute top-6 left-6" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-center">
              Generating Embeddings
            </h2>
            <p className="text-muted-foreground text-center max-w-sm leading-relaxed">
              Creating high-dimensional vector representations using CLIP model
              for semantic similarity search.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              CLIP Neural Network Processing
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 z-50"
      initial={{ y: "100%" }}
      animate={{ y: expanded ? "0%" : "50%" }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="bg-gradient-to-t from-black/60 via-black/20 to-transparent h-32 absolute -top-32 left-0 right-0 pointer-events-none" />
      <Card
        className={cn(
          "rounded-t-3xl rounded-b-none bg-background/95 backdrop-blur-xl border-0 shadow-2xl",
          expanded ? "h-[90vh] md:h-[85vh]" : "h-[70vh] md:h-[65vh]",
        )}
      >
        <div
          className="h-12 flex items-center justify-center cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-1" />
        </div>

        <div className="px-6 pb-6 overflow-y-auto h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                CLIP Embeddings Generated
              </h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{analysisData.processing_time_ms}ms</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {analysisData.embeddings.dimension}D Vector
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">
                    Ready for DB
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Key Results Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl border-2 border-blue-100 dark:border-blue-800 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    Vector Embedding
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {analysisData.embeddings.model}
                  </p>
                </div>
              </div>
              <Badge className="font-bold text-sm px-3 py-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700">
                {analysisData.embeddings.dimension}D
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Range
                </div>
                <div className="text-blue-900 dark:text-blue-100 font-mono text-xs">
                  {vectorStats?.min.toFixed(3)} to {vectorStats?.max.toFixed(3)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Mean
                </div>
                <div className="text-blue-900 dark:text-blue-100 font-mono text-xs">
                  {vectorStats?.mean.toFixed(4)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Magnitude
                </div>
                <div className="text-blue-900 dark:text-blue-100 font-mono text-xs">
                  {vectorStats?.magnitude.toFixed(4)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                  Processing
                </div>
                <div className="text-blue-900 dark:text-blue-100 font-mono text-xs">
                  {analysisData.processing_time_ms}ms
                </div>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          <div className="relative mb-6 rounded-2xl overflow-hidden group">
            <Image
              src={image || "/placeholder.svg"}
              alt="Processed image"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/20 mb-2">
                    <Eye className="w-3 h-3 mr-1" />
                    {analysisData.image_metadata.filename || "Processed Image"}
                  </Badge>
                  <p className="text-white/90 text-sm font-medium">
                    Generated:{" "}
                    {new Date(analysisData.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs">
                    {formatFileSize(analysisData.image_metadata.original_size)}
                  </p>
                  <p className="text-white/80 text-xs">
                    {analysisData.image_metadata.dimensions}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6 bg-muted/30">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-background"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="vector"
                className="data-[state=active]:bg-background"
              >
                Vector Data
              </TabsTrigger>
              <TabsTrigger
                value="metadata"
                className="data-[state=active]:bg-background"
              >
                Metadata
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="data-[state=active]:bg-background"
              >
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Model Information */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      CLIP Model Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Model:
                      </span>
                      <p className="text-green-900 dark:text-green-100">
                        {analysisData.embeddings.model}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Dimensions:
                      </span>
                      <p className="text-green-900 dark:text-green-100">
                        {analysisData.embeddings.dimension}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        Version:
                      </span>
                      <p className="text-green-900 dark:text-green-100 text-xs font-mono break-all">
                        {analysisData.embeddings.version}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vector Statistics */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                      Vector Statistics
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Min:
                      </span>
                      <p className="text-purple-900 dark:text-purple-100 font-mono">
                        {vectorStats?.min.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Max:
                      </span>
                      <p className="text-purple-900 dark:text-purple-100 font-mono">
                        {vectorStats?.max.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Mean:
                      </span>
                      <p className="text-purple-900 dark:text-purple-100 font-mono">
                        {vectorStats?.mean.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Std Dev:
                      </span>
                      <p className="text-purple-900 dark:text-purple-100 font-mono">
                        {vectorStats?.std.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Magnitude:
                      </span>
                      <p className="text-purple-900 dark:text-purple-100 font-mono">
                        {vectorStats?.magnitude.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">
                        Length:
                      </span>
                      <p className="text-purple-900 dark:text-purple-100 font-mono">
                        {vectorStats?.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Use Cases */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                      Use Cases & Applications
                    </h3>
                  </div>
                  <div className="text-orange-800 dark:text-orange-200 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>
                        Semantic similarity search and image retrieval
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Image clustering and classification systems</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>
                        Vector database storage (Pinecone, Weaviate, etc.)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Content-based recommendation engines</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vector" className="mt-0 space-y-4">
              <div className="space-y-4">
                {/* Vector Preview */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 rounded-xl p-4 border border-teal-100 dark:border-teal-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-teal-600" />
                      <h3 className="font-semibold text-teal-900 dark:text-teal-100">
                        Vector Preview
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() =>
                        copyToClipboard(vectorPreview, "Vector preview")
                      }
                    >
                      {copiedSection === "Vector preview" ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                    [{vectorPreview}]
                  </div>
                  <p className="text-teal-700 dark:text-teal-300 text-xs mt-2">
                    Showing first and last 5 elements of{" "}
                    {analysisData.embeddings.dimension}-dimensional vector
                  </p>
                </div>

                {/* Complete Vector */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <Hash className="w-5 h-5 text-blue-600" />
                      Complete Vector Data
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(analysisData.embeddings.vector),
                          "Complete vector",
                        )
                      }
                    >
                      {copiedSection === "Complete vector" ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(analysisData.embeddings.vector, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="mt-0 space-y-4">
              <div className="space-y-4">
                {/* Image Processing Info */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Image Processing Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Original Size:
                      </span>
                      <p className="font-medium">
                        {formatFileSize(
                          analysisData.image_metadata.original_size,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Original Type:
                      </span>
                      <p className="font-medium">
                        {analysisData.image_metadata.original_type}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Processed Size:
                      </span>
                      <p className="font-medium">
                        {formatFileSize(
                          analysisData.image_metadata.processed_size,
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dimensions:</span>
                      <p className="font-medium">
                        {analysisData.image_metadata.dimensions}
                      </p>
                    </div>
                    {analysisData.image_metadata.filename && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Filename:</span>
                        <p className="font-medium">
                          {analysisData.image_metadata.filename}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Details */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Technical Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        API Version:
                      </span>
                      <p className="font-medium">
                        {analysisData.technical.api_version}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Processing Time:
                      </span>
                      <p className="font-medium">
                        {analysisData.processing_time_ms}ms
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Success Status:
                      </span>
                      <p className="font-medium">
                        {analysisData.technical.success ? "Success" : "Failed"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Generated:</span>
                      <p className="font-medium">
                        {new Date(analysisData.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {analysisData.technical.processing_steps && (
                    <div className="mt-4">
                      <span className="text-muted-foreground text-sm">
                        Processing Steps:
                      </span>
                      <div className="mt-2 space-y-1">
                        {analysisData.technical.processing_steps.map(
                          (step, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span>{step}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="export" className="mt-0 space-y-4">
              <div className="space-y-4">
                {/* Export Options */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Options
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vector Only */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      <h4 className="font-medium mb-2">Vector Data Only</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Export just the embedding vector as JSON array
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(analysisData.embeddings.vector),
                            "Vector data",
                          )
                        }
                      >
                        {copiedSection === "Vector data" ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy Vector
                      </Button>
                    </div>

                    {/* Complete Data */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      <h4 className="font-medium mb-2">Complete Dataset</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Export all data including metadata and statistics
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={downloadJSON}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>

                    {/* Summary Report */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      <h4 className="font-medium mb-2">Summary Report</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Human-readable summary with key statistics
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const summary = `CLIP Embeddings Analysis Report
Generated: ${new Date(analysisData.timestamp).toLocaleString()}
Processing Time: ${analysisData.processing_time_ms}ms

Model Information:
- Model: ${analysisData.embeddings.model}
- Dimensions: ${analysisData.embeddings.dimension}
- Version: ${analysisData.embeddings.version}

Vector Statistics:
- Length: ${vectorStats?.length}
- Range: ${vectorStats?.min.toFixed(4)} to ${vectorStats?.max.toFixed(4)}
- Mean: ${vectorStats?.mean.toFixed(4)}
- Standard Deviation: ${vectorStats?.std.toFixed(4)}
- Magnitude: ${vectorStats?.magnitude.toFixed(4)}

Image Information:
- Original Size: ${formatFileSize(analysisData.image_metadata.original_size)}
- Type: ${analysisData.image_metadata.original_type}
- Processed Size: ${formatFileSize(analysisData.image_metadata.processed_size)}
- Dimensions: ${analysisData.image_metadata.dimensions}
${analysisData.image_metadata.filename ? `- Filename: ${analysisData.image_metadata.filename}` : ""}

Technical Details:
- API Version: ${analysisData.technical.api_version}
- Success: ${analysisData.technical.success ? "Yes" : "No"}
- ID: ${analysisData.id}`;
                          copyToClipboard(summary, "Summary report");
                        }}
                      >
                        {copiedSection === "Summary report" ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        Copy Summary
                      </Button>
                    </div>

                    {/* Database Format */}
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      <h4 className="font-medium mb-2">Database Ready</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Formatted for vector database insertion
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const dbFormat = {
                            id: analysisData.id,
                            vector: analysisData.embeddings.vector,
                            metadata: {
                              model: analysisData.embeddings.model,
                              dimension: analysisData.embeddings.dimension,
                              timestamp: analysisData.timestamp,
                              filename: analysisData.image_metadata.filename,
                              processing_time_ms:
                                analysisData.processing_time_ms,
                            },
                          };
                          copyToClipboard(
                            JSON.stringify(dbFormat, null, 2),
                            "Database format",
                          );
                        }}
                      >
                        {copiedSection === "Database format" ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <Database className="w-4 h-4 mr-2" />
                        )}
                        Copy DB Format
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Integration Examples */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Integration Examples
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                        Pinecone Vector Database
                      </h4>
                      <code className="text-xs bg-white/50 dark:bg-gray-800/50 p-2 rounded block overflow-x-auto">
                        {`index.upsert([{
  id: "${analysisData.id}",
  values: [${analysisData.embeddings.vector
    .slice(0, 3)
    .map((v) => v.toFixed(4))
    .join(", ")}...],
  metadata: { model: "${analysisData.embeddings.model}" }
}])`}
                      </code>
                    </div>

                    <div>
                      <h4 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                        Weaviate Schema
                      </h4>
                      <code className="text-xs bg-white/50 dark:bg-gray-800/50 p-2 rounded block overflow-x-auto">
                        {`{
  "class": "ImageEmbedding",
  "properties": [
    {"name": "embedding", "dataType": ["number[]"]},
    {"name": "model", "dataType": ["string"]}
  ]
}`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(analysisData.embeddings.vector),
                  "Vector for sharing",
                )
              }
            >
              {copiedSection === "Vector for sharing" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share Vector
            </Button>

            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => {
                const summary = `CLIP Embeddings: ${analysisData.embeddings.dimension}D vector generated in ${analysisData.processing_time_ms}ms using ${analysisData.embeddings.model}`;
                copyToClipboard(summary, "Quick summary");
              }}
            >
              {copiedSection === "Quick summary" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Copy Summary
            </Button>

            <Button
              className="w-full flex items-center gap-2"
              onClick={downloadJSON}
            >
              <Download className="h-4 w-4" />
              Export All Data
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
