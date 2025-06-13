import Replicate from "replicate"
import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { initPinecone } from "@/lib/pinecone"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "Missing Replicate API token" }, { status: 500 })
    }

    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
      return NextResponse.json({ error: "Missing Pinecone configuration" }, { status: 500 })
    }

    console.time("image-search")

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })

    // Initialize Pinecone
    console.log("Initializing Pinecone for search")
    const pinecone = await initPinecone()
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME)

    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const topK = Number.parseInt((formData.get("topK") as string) || "10") // Number of results to return
    const threshold = Number.parseFloat((formData.get("threshold") as string) || "0.7") // Similarity threshold

    if (!imageFile || !imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please provide a valid image file" }, { status: 400 })
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be smaller than 10MB" }, { status: 400 })
    }

    const bytes = await imageFile.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get original image metadata
    const metadata = await sharp(buffer).metadata()
    console.log("Search image metadata:", metadata)

    // Minimal processing approach - only resize if absolutely necessary
    let processedBuffer
    let shouldProcess = false

    // Only process if image is extremely large (>2MB) or wrong format
    if (buffer.length > 2 * 1024 * 1024 || !["jpeg", "jpg", "png", "webp"].includes(metadata.format || "")) {
      shouldProcess = true
    }

    if (shouldProcess && metadata.width && metadata.height && metadata.width > 2048) {
      // Only resize very large images
      processedBuffer = await sharp(buffer)
        .resize(2048, 2048, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 98 })
        .toBuffer()
    } else {
      // Use original buffer for most cases
      processedBuffer = buffer
    }

    // Convert to base64 - handle different formats appropriately
    const base64Image = processedBuffer.toString("base64")
    let mimeType = "image/jpeg"

    if (!shouldProcess && metadata.format) {
      switch (metadata.format) {
        case "png":
          mimeType = "image/png"
          break
        case "webp":
          mimeType = "image/webp"
          break
        case "gif":
          mimeType = "image/gif"
          break
        default:
          mimeType = "image/jpeg"
      }
    }

    const imageDataUrl = `data:${mimeType};base64,${base64Image}`

    console.log("Processing search image with size:", processedBuffer.length, "bytes")

    // Generate embeddings for the search query
    console.time("generate-query-embedding")
    const replicateResponse = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: { inputs: imageDataUrl },
      },
    )
    console.timeEnd("generate-query-embedding")

    console.log("Raw Replicate response type:", typeof replicateResponse)
    console.log("Raw Replicate response structure:", JSON.stringify(replicateResponse).substring(0, 200) + "...")

    // Extract the embedding vector from the response
    let embeddingsVector: number[]

    console.log("Extracted embedding preview:", JSON.stringify(replicateResponse).substring(0, 200))

    // Handle different possible response formats
    if (Array.isArray(replicateResponse) && replicateResponse.length > 0) {
      if (replicateResponse[0] && typeof replicateResponse[0] === "object" && "embedding" in replicateResponse[0]) {
        // Format: [{ embedding: [...] }]
        embeddingsVector = replicateResponse[0].embedding
        console.log("Extracted from format: [{ embedding: [...] }]")
      } else if (replicateResponse.every((val) => typeof val === "number")) {
        // Format: [0.1, 0.2, 0.3, ...]
        embeddingsVector = replicateResponse
        console.log("Extracted from format: [0.1, 0.2, 0.3, ...]")
      } else {
        console.error("Unrecognized array response format:", replicateResponse.slice(0, 2))
        return NextResponse.json({ error: "Unrecognized array response format from embedding model" }, { status: 500 })
      }
    } else if (replicateResponse && typeof replicateResponse === "object") {
      // If response is an object with embedding property
      if ("embedding" in replicateResponse && Array.isArray(replicateResponse.embedding)) {
        embeddingsVector = replicateResponse.embedding
        console.log("Extracted from format: { embedding: [...] }")
      } else {
        console.error("Unexpected object response structure:", replicateResponse)
        return NextResponse.json({ error: "Unexpected object response format from embedding model" }, { status: 500 })
      }
    } else {
      console.error("Unexpected response type:", typeof replicateResponse)
      return NextResponse.json({ error: "Invalid response from embedding model" }, { status: 500 })
    }

    // Log first few values for debugging
    console.log("Extracted embedding preview:", embeddingsVector?.slice(0, 5))
    console.log("Embedding dimension:", embeddingsVector?.length)

    // Validate embedding dimension
    if (!embeddingsVector || !Array.isArray(embeddingsVector)) {
      return NextResponse.json({ error: "Failed to extract embedding vector from response" }, { status: 500 })
    }

    if (embeddingsVector.length !== 768) {
      return NextResponse.json(
        { error: `Expected 768-dimensional vector, got ${embeddingsVector.length}` },
        { status: 500 },
      )
    }

    // Validate that all elements are numbers
    const isValidVector = embeddingsVector.every((val) => typeof val === "number" && !isNaN(val))
    if (!isValidVector) {
      return NextResponse.json({ error: "Embedding vector contains invalid values" }, { status: 500 })
    }

    // Search similar vectors in Pinecone
    console.time("pinecone-search")
    console.log(`Searching for top ${topK} similar images`)

    const searchResponse = await index.query({
      vector: embeddingsVector,
      topK: topK,
      includeMetadata: true,
      includeValues: false, // We don't need the vector values in response
    })
    console.timeEnd("pinecone-search")

    // Filter results by similarity threshold and format response
    const filteredMatches =
      searchResponse.matches?.filter((match) => match.score !== undefined && match.score >= threshold) || []

    const searchResults = filteredMatches.map((match) => ({
      id: match.id,
      score: match.score,
      metadata: {
        ...match.metadata,
        // Ensure sourceUrl is included in the response
        sourceUrl: match.metadata?.sourceUrl || null,
        filename: match.metadata?.filename || "unknown",
        timestamp: match.metadata?.timestamp || null,
        originalSize: match.metadata?.originalSize || null,
        inputType: match.metadata?.inputType || match.metadata?.sourceUrl ? "url" : "file",
      },
    }))

    const totalMatches = searchResponse.matches?.length || 0
    const matchesAboveThreshold = filteredMatches.length

    console.log(`Found ${totalMatches} total matches, ${matchesAboveThreshold} above threshold ${threshold}`)

    console.timeEnd("image-search")

    return NextResponse.json({
      success: true,
      query: {
        originalSize: `${metadata.width}x${metadata.height}`,
        processedSize: processedBuffer.length,
        embeddingDimension: embeddingsVector.length,
      },
      search: {
        topK: topK,
        threshold: threshold,
        totalMatches: totalMatches,
        matchesAboveThreshold: matchesAboveThreshold,
        matchesReturned: searchResults.length,
      },
      results: searchResults,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error("Image search error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to search similar images"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
