import Replicate from "replicate";
import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing Replicate API token" },
        { status: 500 },
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile || !imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please provide a valid image file" },
        { status: 400 },
      );
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 10MB" },
        { status: 400 },
      );
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Optimize image
    const optimizedBuffer = await sharp(buffer)
      .resize(512, 512, { fit: "inside" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const base64Image = optimizedBuffer.toString("base64");
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Generate embeddings
    const embeddingsVector = (await replicate.run(
      "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
      {
        input: { inputs: imageDataUrl },
      },
    )) as number[];

    return NextResponse.json({
      success: true,
      vector: embeddingsVector,
      dimension: embeddingsVector.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) { // Changed from 'Error' to 'unknown'
    console.error("Embeddings generation error:", error);
    // Optionally check if error is an Error instance
    const errorMessage = error instanceof Error ? error.message : "Failed to generate embeddings";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
