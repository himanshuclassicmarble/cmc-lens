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

interface ColorInfo {
  hex: string;
  hsl: [number, number, number];
  population: number;
  percentage: number;
  luminance: number;
  titleTextColor: string;
  bodyTextColor: string;
}

interface ImageData {
  imageName: string;
  imageUrl: string;
  dominantColor?: {
    hex: string;
    hsl: [number, number, number];
    luminance: number;
  } | null;
  extractedColors: ColorInfo[];
  originalJsonMetadata?: {
    color: string;
    qualityGroup: string;
    count: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, indexName = "image-clip" } = body;

    if (!imageData || !Array.isArray(imageData)) {
      return NextResponse.json(
        { error: "Invalid image data provided" },
        { status: 400 },
      );
    }

    const index = pinecone.index(indexName);
    const vectors = [];

    for (const data of imageData as ImageData[]) {
      try {
        // Handle undefined extractedColors by providing empty array as fallback
        const extractedColors = data.extractedColors || [];
        
        // Create text description for embedding
        const colorDescriptions = extractedColors
          .map((color) => `${color.hex} (${color.percentage.toFixed(1)}%)`)
          .join(", ");

        const dominantColorText = data.dominantColor
          ? `dominant color ${data.dominantColor.hex}`
          : "";

        const qualityGroup = data.originalJsonMetadata?.qualityGroup || "";

        const textForEmbedding =
          `${dominantColorText} ${colorDescriptions} ${qualityGroup}`.trim();

        // Get CLIP embeddings using Replicate
        const output = (await replicate.run(
          "krthr/clip-embeddings:1c0371070cb827ec3c7f2f28adcdde54b50dcd239aa6faea0bc98b174ef03fb4",
          {
            input: {
              text: textForEmbedding,
              image: data.imageUrl,
            },
          },
        )) as
          | { text_embedding: number[]; image_embedding: number[] }
          | { embedding: number[] }
          | null;

        // Check if output is valid and handle different response formats
        if (!output) {
          console.error(`No output from Replicate for ${data.imageName}`);
          continue;
        }

        let textEmbedding: number[] | null = null;
        let imageEmbedding: number[] | null = null;

        // Handle different response formats
        if ("text_embedding" in output && "image_embedding" in output) {
          // Expected format with separate embeddings
          textEmbedding = output.text_embedding;
          imageEmbedding = output.image_embedding;
        } else if ("embedding" in output) {
          // Single embedding format - use for both text and image
          console.log(
            `Single embedding returned for ${data.imageName}, using for both text and image`,
          );
          textEmbedding = output.embedding;
          imageEmbedding = output.embedding;
        } else {
          console.error(
            `Invalid output format from Replicate for ${data.imageName}:`,
            output,
          );
          continue;
        }

        // Validate embedding arrays
        if (!Array.isArray(textEmbedding) || !Array.isArray(imageEmbedding)) {
          console.error(`Invalid embedding format for ${data.imageName}:`, {
            textEmbedding_type: typeof textEmbedding,
            imageEmbedding_type: typeof imageEmbedding,
          });
          continue;
        }

        // Create vectors for both text and image embeddings
        const baseMetadata = {
          imageName: data.imageName,
          imageUrl: data.imageUrl,
          dominantColor: data.dominantColor?.hex || null,
          extractedColors: extractedColors.map((c) => c.hex),
          textDescription: textForEmbedding,
          qualityGroup: data.originalJsonMetadata?.qualityGroup || null,
          originalColor: data.originalJsonMetadata?.color || null,
          count: data.originalJsonMetadata?.count || null,
        };

        // Text embedding vector
        vectors.push({
          id: `${data.imageName}_text`,
          values: textEmbedding,
          metadata: {
            ...baseMetadata,
            type: "text",
          },
        });

        // Image embedding vector
        vectors.push({
          id: `${data.imageName}_image`,
          values: imageEmbedding,
          metadata: {
            ...baseMetadata,
            type: "image",
          },
        });
      } catch (error) {
        console.error(`Error processing ${data.imageName}:`, error);
        // Continue with other images instead of failing completely
      }
    }

    if (vectors.length === 0) {
      return NextResponse.json(
        { error: "No vectors could be generated" },
        { status: 400 },
      );
    }

    // Upload vectors to Pinecone in batches
    const batchSize = 100;
    const uploadPromises = [];

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      uploadPromises.push(index.upsert(batch));
    }

    await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${vectors.length} vectors to Pinecone`,
      vectorsUploaded: vectors.length,
      imagesProcessed: imageData.length,
    });
  } catch (error) {
    console.error("Error uploading vectors:", error);
    return NextResponse.json(
      { error: "Failed to upload vectors", details: error.message },
      { status: 500 },
    );
  }
}
