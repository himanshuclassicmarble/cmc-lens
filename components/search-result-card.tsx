"use client";

import React, { memo, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoGridItem } from "@/components/bento-grid";

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

interface SearchResultsCardProps {
  results: SearchResult[];
  capturedImage: string;
  threshold: number;
  onClose: () => void;
  onNewSearch: () => void;
  totalMatches: number;
}

// Utility functions
const getImageSrc = (result: SearchResult): string =>
  result.metadata.sourceUrl || result.metadata.url || result.metadata.path || "/placeholder.svg";

const getDisplayTitle = (result: SearchResult): string =>
  result.metadata.title || result.metadata.filename || `Image ${result.id.substring(0, 8)}...`;

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
    <h2 className="text-sm font-semibold">Error Loading Results</h2>
    <p className="text-xs">{error.message}</p>
    <Button onClick={resetErrorBoundary} className="mt-2 bg-red-100 text-red-700 hover:bg-red-200">
      Try Again
    </Button>
  </div>
);

/**
 * SearchResultsCard component for displaying image search results in a modal.
 * @param props - SearchResultsCardProps
 * @returns JSX.Element
 */
const SearchResultsCard: React.FC<SearchResultsCardProps> = ({
  results,
  capturedImage,
  threshold,
  onClose,
  onNewSearch,
  totalMatches,
}) => {
  // Memoize computed values
  const bentoItems = useMemo(
    () =>
      results.map((result, index) => {
        const imageSrc = getImageSrc(result);
        const title = getDisplayTitle(result);

        // Create header (image filling the card)
        const createBentoHeader = () => (
          <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg">
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover transition-transform duration-300"
              unoptimized
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg"; // Fallback image
              }}
            />
            <div className="absolute inset-0 bg-black/30 transition-all duration-300" />
            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent text-white">
              <h3 className="text-lg font-semibold truncate">{title}</h3>
            </div>
          </div>
        );

        return { result, index, header: createBentoHeader() };
      }),
    [results]
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <motion.div
        className="fixed inset-0 bottom-0 bg-black/40 flex items-center justify-center z-50 p-0 "
        onClick={onClose}
        role="dialog"
        aria-labelledby="search-results-title"
        aria-modal="true"
      >
        <motion.div
          className="bg-background rounded-b-none rounded-t-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative">
            {capturedImage && (
              <div className="overflow-hidden bg-background text-foreground">
                <Image
                  src={capturedImage}
                  alt="Search query image"
                  width={800}
                  height={140}
                  className="w-full h-auto max-h-[40vh] object-cover" // Adjusted class
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={onClose}
              aria-label="Close search results"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-0 left-0 right-0">
              <div className="bg-background/30 p-2 ">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center">
                    <Search className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 id="search-results-title" className="text-lg font-semibold text-foreground">
                      {results.length} Similar Images Found
                    </h3>
                    <p className="text-sm text-accent-foreground">
                      Threshold: {(threshold * 100).toFixed(0)}% • Total scanned: {totalMatches}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[calc(90vh-240px)] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">No matches found</h4>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Try lowering the similarity threshold or use a different image to find better matches.
                </p>
                <Button onClick={onNewSearch} className="mt-4">
                  New Search
                </Button>
              </div>
            ) : (
              <BentoGrid className="max-w-full mx-auto md:auto-rows-[16rem] gap-4">
                {bentoItems.map(({ result, index, header }) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => window.open(getImageSrc(result), "_blank", "noopener,noreferrer")}
                    className="cursor-pointer"
                    role="button"
                    aria-label={`Open ${getDisplayTitle(result)}`}
                  >
                    <BentoGridItem header={header} />
                  </motion.div>
                ))}
              </BentoGrid>
            )}
          </div>
        </motion.div>
      </motion.div>
    </ErrorBoundary>
  );
};

export default memo(SearchResultsCard);
