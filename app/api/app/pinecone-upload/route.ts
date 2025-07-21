import { type NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";
import { initPinecone } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 300; // Increased for bulk uploads

// Set to true to log full embeddings for debugging (disable in production)
const DEBUG_MODE = false;

export async function POST(request: NextRequest) {
  console.log("Received POST request to /api/pinecone-upload");
  try {
    // Validate environment variables
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("Missing REPLICATE_API_TOKEN");
      return NextResponse.json(
        { error: "Missing Replicate API token" },
        { status: 500 },
      );
    }
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
      console.error("Missing Pinecone configuration:", {
        apiKey: !!process.env.PINECONE_API_KEY,
        indexName: !!process.env.PINECONE_INDEX_NAME,
      });
      return NextResponse.json(
        { error: "Missing Pinecone configuration" },
        { status: 500 },
      );
    }
    console.time("pinecone-upload");

    // Initialize Replicate
    console.log("Initializing Replicate");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Initialize Pinecone
    console.time("pinecone-init");
    console.log("Initializing Pinecone");
    const pinecone = await initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    console.timeEnd("pinecone-init");

    // Parse form data
    console.log("Parsing form data");
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;
    const metadataText = formData.get("metadata") as string | null;
    const bulkData = formData.get("bulkData") as string | null;

    // Check if this is a bulk upload
    if (bulkData) {
      return await handleBulkUpload(bulkData, replicate, index);
    }

    // Single upload validation
    if (!imageFile && !imageUrl) {
      console.error("No image file or URL provided");
      return NextResponse.json(
        { error: "Please provide either an image file or a valid image URL" },
        { status: 400 },
      );
    }
    if (imageFile && imageUrl) {
      console.error("Both image file and URL provided");
      return NextResponse.json(
        { error: "Please provide only one of image file or image URL" },
        { status: 400 },
      );
    }

    const result = await processSingleImage(
      imageFile,
      imageUrl,
      metadataText,
      replicate,
      index,
    );
    console.timeEnd("pinecone-upload");
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Pinecone upload error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to upload vector to Pinecone";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function handleBulkUpload(
  bulkDataString: string,
  replicate: any,
  index: any,
) {
  console.log("Processing bulk upload");
  let bulkData;
  try {
    bulkData = JSON.parse(bulkDataString);
    console.log("Parsed bulk data:", bulkData);
    if (!Array.isArray(bulkData)) {
      throw new Error("Bulk data must be an array");
    }
  } catch (error) {
    console.error("Invalid JSON format for bulk data:", error);
    return NextResponse.json(
      { error: "Invalid JSON format for bulk data" },
      { status: 400 },
    );
  }

  const results = [];
  const vectors = [];

  for (const item of bulkData) {
    console.log("Processing item:", item);
    if (item.imageName === "NULL") {
      console.log("Skipping NULL image for qualityGroup:", item.qualityGroup);
      results.push({
        success: false,
        error: "Skipped NULL image",
        item: item.qualityGroup,
        vectorId: null,
      });
      continue;
    }

    // Encode the imageName to ensure it's a valid URL component
    const encodedImageName = encodeURIComponent(item.imageName);
    // IMPORTANT: Added a '/' after 'webp-crop-new' assuming it's a subfolder in Supabase
    const imageUrl = `https://ypafaxfcutwjamwcaclp.supabase.co/storage/v1/object/public/natural-public/webp-crop-new/${encodedImageName}.webp`;
    const metadata = `Color: ${item.color}, Quality: ${item.qualityGroup}, Count: ${item.count}`;

    try {
      const result = await processSingleImage(
        null,
        imageUrl,
        metadata,
        replicate,
        index,
        false,
      );
      if (result.success) {
        console.log("Successfully processed item:", item.qualityGroup);
        results.push({
          success: true,
          vectorId: result.vectorId,
          item: item.qualityGroup,
          originalSize: result.originalSize,
          filename: result.filename,
        });
        // Store vector for batch upsert
        vectors.push({
          id: result.vectorId,
          values: result.embedding,
          metadata: {
            timestamp: new Date().toISOString(),
            text: metadata,
            source: "lens-tool-bulk",
            originalFormat: result.originalFormat,
            originalSize: result.originalSize,
            processedSize: result.processedSize,
            filename: result.filename,
            sourceUrl: imageUrl,
            inputType: "url",
            color: item.color,
            qualityGroup: item.qualityGroup,
            count: item.count,
            imageName: item.imageName,
          },
        });
      } else {
        console.error(
          "Failed to process item:",
          item.qualityGroup,
          result.error,
        );
        results.push({
          success: false,
          error: result.error,
          item: item.qualityGroup,
          vectorId: null,
        });
      }
    } catch (error) {
      console.error("Error processing item:", item.qualityGroup, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
        item: item.qualityGroup,
        vectorId: null,
      });
    }
  }

  // Batch upsert all successful vectors
  if (vectors.length > 0) {
    console.log(`Preparing to upsert ${vectors.length} vectors to Pinecone`);
    try {
      console.log("Vectors to upsert:", DEBUG_MODE ? vectors : vectors.length);
      await index.upsert(vectors);
      console.log("Batch upsert completed successfully");
    } catch (error) {
      console.error("Batch upsert failed:", error);
      // Mark all successful results as failed if batch upsert fails
      results.forEach((result) => {
        if (result.success) {
          result.success = false;
          result.error = `Batch upsert failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
      });
    }
  } else {
    console.log("No vectors to upsert");
  }

  const response = {
    success: true,
    bulkUpload: true,
    totalProcessed: bulkData.length,
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length,
    results,
  };
  console.log("Bulk upload response:", response);
  return NextResponse.json(response);
}

async function processSingleImage(
  imageFile: File | null,
  imageUrl: string | null,
  metadataText: string | null,
  replicate: any,
  index: any,
  shouldUpsert = true,
) {
  console.log("Starting processSingleImage for:", {
    imageUrl,
    hasFile: !!imageFile,
  });
  let buffer: Buffer;
  let filename: string;
  if (imageFile) {
    // Handle file upload
    if (!imageFile.type.startsWith("image/")) {
      console.error("Invalid image file type:", imageFile.type);
      return { success: false, error: "Please provide a valid image file" };
    }
    if (imageFile.size > 10 * 1024 * 1024) {
      console.error("Image file too large:", imageFile.size);
      return { success: false, error: "Image must be smaller than 10MB" };
    }
    console.log("Processing uploaded image:", imageFile.name);
    const bytes = await imageFile.arrayBuffer();
    buffer = Buffer.from(bytes);
    filename = imageFile.name;
  } else if (imageUrl) {
    // Handle image URL
    console.log("Fetching image from URL:", imageUrl);
    try {
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        console.error("Fetch failed with status:", response.status);
        return {
          success: false,
          error: `Failed to fetch image from URL: ${response.statusText}`,
        };
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.startsWith("image/")) {
        console.error("Invalid content type from URL:", contentType);
        return { success: false, error: "URL must point to a valid image" };
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      filename = imageUrl.split("/").pop() || "image-from-url.jpg";
      if (buffer.length > 10 * 1024 * 1024) {
        console.error("Image from URL too large:", buffer.length);
        return {
          success: false,
          error: "Image from URL must be smaller than 10MB",
        };
      }
    } catch (error) {
      console.error("Error fetching image from URL:", error);
      return {
        success: false,
        error: `Failed to fetch image: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  } else {
    console.error("No image provided");
    return { success: false, error: "No image provided" };
  }

  // Process image
  console.time("image-processing");
  console.log("Processing image with sharp");
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
    console.log("Image metadata:", {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    });
  } catch (error) {
    console.error("Sharp metadata error:", error);
    return { success: false, error: "Failed to process image metadata" };
  }

  // Minimal processing approach
  let processedBuffer: Buffer;
  let shouldProcess = false;
  if (
    buffer.length > 2 * 1024 * 1024 ||
    !["jpeg", "jpg", "png", "webp"].includes(metadata.format || "")
  ) {
    shouldProcess = true;
  }
  try {
    if (
      shouldProcess &&
      metadata.width &&
      metadata.height &&
      metadata.width > 2048
    ) {
      processedBuffer = await sharp(buffer)
        .resize(2048, 2048, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 98 })
        .toBuffer();
      console.log("Image resized and optimized");
    } else if (shouldProcess) {
      processedBuffer = await sharp(buffer).jpeg({ quality: 98 }).toBuffer();
      console.log("Image format converted");
    } else {
      processedBuffer = buffer;
      console.log("Using original image buffer");
    }
  } catch (error) {
    console.error("Sharp processing error:", error);
    return { success: false, error: "Failed to process image" };
  }
  console.timeEnd("image-processing");

  // Convert to base64
  const base64Image = processedBuffer.toString("base64");
  let mimeType = "image/jpeg";
  if (!shouldProcess && metadata.format) {
    switch (metadata.format) {
      case "png":
        mimeType = "image/png";
        break;
      case "webp":
        mimeType = "image/webp";
        break;
      case "gif":
        mimeType = "image/gif";
        break;
      default:
        mimeType = "image/jpeg";
    }
  }
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  // Generate embeddings
  console.time("replicate-embedding");
  console.log("Sending request to Replicate for embedding");
  let embeddingResponse;
  try {
    // Removed the timeout option from replicate.run
    embeddingResponse = await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: { inputs: imageDataUrl },
      },
    );
    console.log(
      "Replicate response:",
      DEBUG_MODE ? embeddingResponse : "Received",
    );
  } catch (error) {
    console.error("Replicate API error:", error);
    return {
      success: false,
      error: `Replicate API failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Extract embedding array
  let embeddingsVector: number[];
  if (
    Array.isArray(embeddingResponse) &&
    embeddingResponse.length > 0 &&
    "embedding" in embeddingResponse[0]
  ) {
    embeddingsVector = embeddingResponse[0].embedding as number[];
  } else if (
    Array.isArray(embeddingResponse) &&
    embeddingResponse.every((val) => typeof val === "number")
  ) {
    embeddingsVector = embeddingResponse as number[];
  } else {
    console.error("Unexpected embedding response format:", embeddingResponse);
    return {
      success: false,
      error: "Invalid embedding response from Replicate",
    };
  }
  console.timeEnd("replicate-embedding");
  console.log("Embedding generated:", {
    dimension: embeddingsVector.length,
    sample: DEBUG_MODE ? embeddingsVector : embeddingsVector.slice(0, 5),
  });

  // Validate embedding dimension
  if (embeddingsVector.length !== 768) {
    console.error("Invalid embedding dimension:", embeddingsVector.length);
    return {
      success: false,
      error: `Expected 768-dimensional vector, got ${embeddingsVector.length}`,
    };
  }

  // Prepare vector for Pinecone
  const vectorId = `image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const pineconeVector = {
    id: vectorId,
    values: embeddingsVector,
    metadata: {
      timestamp: new Date().toISOString(),
      text: metadataText || "Image embedding",
      source: "lens-tool",
      originalFormat: metadata.format,
      originalSize: `${metadata.width}x${metadata.height}`,
      processedSize: processedBuffer.length,
      filename,
      sourceUrl: imageUrl || "",
      inputType: imageUrl ? "url" : "file",
    },
  };

  // Upsert to Pinecone (only if shouldUpsert is true)
  if (shouldUpsert) {
    console.time("pinecone-upsert");
    console.log("Upserting vector to Pinecone:", { vectorId });
    try {
      await index.upsert([pineconeVector]);
      console.log("Upsert completed successfully for vector:", vectorId);
    } catch (error) {
      console.error("Pinecone upsert error:", error);
      return {
        success: false,
        error: `Pinecone upsert failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
    console.timeEnd("pinecone-upsert");
  }

  return {
    success: true,
    vectorId,
    dimension: embeddingsVector.length,
    timestamp: new Date().toISOString(),
    originalSize: `${metadata.width}x${metadata.height}`,
    processedSize: processedBuffer.length,
    wasProcessed: shouldProcess,
    source: imageUrl ? "url" : "file",
    sourceUrl: imageUrl || null,
    filename,
    originalFormat: metadata.format,
    embedding: shouldUpsert ? undefined : embeddingsVector, // Only return embedding for bulk processing
  };
}
