import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import Replicate from "replicate";

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      imageUrl,
      searchType = "text", // 'text', 'image', or 'both'
      topK = 10,
      indexName = "image-clip",
    } = body;

    if (!query && !imageUrl) {
      return NextResponse.json(
        { error: "Either query text or image URL must be provided" },
        { status: 400 },
      );
    }

    const index = pinecone.index(indexName);
    let results = [];

    if (searchType === "text" || searchType === "both") {
      if (query) {
        try {
          // Get text embedding
          const output = (await replicate.run(
            "krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4",
            {
              input: {
                text: query,
              },
            },
          )) as
            | { text_embedding: number[]; image_embedding: number[] }
            | { embedding: number[] }
            | null;

          // Check if output is valid and handle different response formats (matching upload logic)
          if (!output) {
            console.error("No output from Replicate for text query");
          } else {
            let textEmbedding: number[] | null = null;

            // Handle different response formats (same logic as upload)
            if ("text_embedding" in output && "image_embedding" in output) {
              // Expected format with separate embeddings
              textEmbedding = output.text_embedding;
            } else if ("embedding" in output) {
              // Single embedding format
              console.log("Single embedding returned for text query, using for text search");
              textEmbedding = output.embedding;
            } else {
              console.error("Invalid output format from Replicate for text query:", output);
            }

            // Validate embedding array (matching upload validation)
            if (Array.isArray(textEmbedding) && textEmbedding.length > 0) {
              // Search using text embedding
              const textResults = await index.query({
                vector: textEmbedding,
                topK,
                filter: { type: "text" },
                includeMetadata: true,
                includeValues: false,
              });

              results.push(
                ...textResults.matches.map((match) => ({
                  ...match,
                  searchType: "text",
                })),
              );
            } else {
              console.error("Invalid text embedding format:", {
                textEmbedding_type: typeof textEmbedding,
                textEmbedding_isArray: Array.isArray(textEmbedding),
                textEmbedding_length: Array.isArray(textEmbedding) ? textEmbedding.length : 'N/A',
              });
            }
          }
        } catch (textError) {
          console.error("Error processing text query:", textError);
          // Continue with other search types instead of failing completely
        }
      }
    }

    if (searchType === "image" || searchType === "both") {
      if (imageUrl) {
        try {
          // Get image embedding
          const output = (await replicate.run(
            "krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4",
            {
              input: {
                image: imageUrl,
              },
            },
          )) as
            | { text_embedding: number[]; image_embedding: number[] }
            | { embedding: number[] }
            | null;

          // Check if output is valid and handle different response formats (matching upload logic)
          if (!output) {
            console.error("No output from Replicate for image query");
          } else {
            let imageEmbedding: number[] | null = null;

            // Handle different response formats (same logic as upload)
            if ("text_embedding" in output && "image_embedding" in output) {
              // Expected format with separate embeddings
              imageEmbedding = output.image_embedding;
            } else if ("embedding" in output) {
              // Single embedding format
              console.log("Single embedding returned for image query, using for image search");
              imageEmbedding = output.embedding;
            } else {
              console.error("Invalid output format from Replicate for image query:", output);
            }

            // Validate embedding array (matching upload validation)
            if (Array.isArray(imageEmbedding) && imageEmbedding.length > 0) {
              // Search using image embedding
              const imageResults = await index.query({
                vector: imageEmbedding,
                topK,
                filter: { type: "image" },
                includeMetadata: true,
                includeValues: false,
              });

              results.push(
                ...imageResults.matches.map((match) => ({
                  ...match,
                  searchType: "image",
                })),
              );
            } else {
              console.error("Invalid image embedding format:", {
                imageEmbedding_type: typeof imageEmbedding,
                imageEmbedding_isArray: Array.isArray(imageEmbedding),
                imageEmbedding_length: Array.isArray(imageEmbedding) ? imageEmbedding.length : 'N/A',
              });
            }
          }
        } catch (imageError) {
          console.error("Error processing image query:", imageError);
          // Continue instead of failing completely
        }
      }
    }

    // Sort results by score and remove duplicates based on imageName
    const uniqueResults = new Map();
    results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .forEach((result) => {
        const imageName = result.metadata?.imageName;
        if (
          imageName &&
          (!uniqueResults.has(imageName) ||
            (result.score || 0) > (uniqueResults.get(imageName).score || 0))
        ) {
          uniqueResults.set(imageName, result);
        }
      });

    const finalResults = Array.from(uniqueResults.values()).slice(0, topK);

    return NextResponse.json({
      success: true,
      query,
      imageUrl,
      searchType,
      totalResults: finalResults.length,
      results: finalResults,
    });
  } catch (error) {
    console.error("Error searching vectors:", error);
    return NextResponse.json(
      { error: "Failed to search vectors", details: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
