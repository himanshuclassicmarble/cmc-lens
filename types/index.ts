export interface Metadata {
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

export interface SearchResult {
  id: string
  score: number
  metadata: Metadata
}

export interface SearchResponse {
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
