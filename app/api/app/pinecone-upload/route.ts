// pinecone-upload/route.ts

import { type NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import sharp from 'sharp';
import { initPinecone } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  console.log('Received POST request to /api/pinecone-upload');

  try {
    // Validate environment variables
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('Missing REPLICATE_API_TOKEN');
      return NextResponse.json(
        { error: 'Missing Replicate API token' },
        { status: 500 },
      );
    }
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
      console.error('Missing Pinecone configuration:', {
        apiKey: !!process.env.PINECONE_API_KEY,
        indexName: !!process.env.PINECONE_INDEX_NAME,
      });
      return NextResponse.json(
        { error: 'Missing Pinecone configuration' },
        { status: 500 },
      );
    }

    console.time('pinecone-upload');

    // Initialize Replicate
    console.log('Initializing Replicate');
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Initialize Pinecone
    console.time('pinecone-init');
    console.log('Initializing Pinecone');
    const pinecone = await initPinecone();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    console.timeEnd('pinecone-init');

    // Parse form data
    console.log('Parsing form data');
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;
    const metadataText = formData.get('metadata') as string | null;

    // Validate input: either imageFile or imageUrl must be provided
    if (!imageFile && !imageUrl) {
      console.error('No image file or URL provided');
      return NextResponse.json(
        { error: 'Please provide either an image file or a valid image URL' },
        { status: 400 },
      );
    }

    if (imageFile && imageUrl) {
      console.error('Both image file and URL provided');
      return NextResponse.json(
        { error: 'Please provide only one of image file or image URL' },
        { status: 400 },
      );
    }

    let buffer: Buffer;
    let filename: string;

    if (imageFile) {
      // Handle file upload
      if (!imageFile.type.startsWith('image/')) {
        console.error('Invalid image file:', { imageFile });
        return NextResponse.json(
          { error: 'Please provide a valid image file' },
          { status: 400 },
        );
      }

      if (imageFile.size > 10 * 1024 * 1024) {
        console.error('Image size too large:', imageFile.size);
        return NextResponse.json(
          { error: 'Image must be smaller than 10MB' },
          { status: 400 },
        );
      }

      console.log('Processing uploaded image');
      const bytes = await imageFile.arrayBuffer();
      buffer = Buffer.from(bytes);
      filename = imageFile.name;
    } else if (imageUrl) {
      // Handle image URL
      console.log('Fetching image from URL:', imageUrl);
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.error('Failed to fetch image from URL:', response.status);
          return NextResponse.json(
            { error: 'Failed to fetch image from provided URL' },
            { status: 400 },
          );
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          console.error('URL does not point to a valid image:', contentType);
          return NextResponse.json(
            { error: 'URL must point to a valid image' },
            { status: 400 },
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        filename = imageUrl.split('/').pop() || 'image-from-url.jpg';

        // Validate size
        if (buffer.length > 10 * 1024 * 1024) {
          console.error('Image from URL too large:', buffer.length);
          return NextResponse.json(
            { error: 'Image from URL must be smaller than 10MB' },
            { status: 400 },
          );
        }
      } catch (error) {
        console.error('Error fetching image from URL:', error);
        return NextResponse.json(
          { error: 'Failed to fetch image from URL' },
          { status: 400 },
        );
      }
    } else {
      // This should never happen due to earlier validation, but included for type safety
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 },
      );
    }

    // Process image with improved handling
    console.time('image-processing');
    console.log('Processing image with sharp');
    const metadata = await sharp(buffer).metadata();
    console.log('Image metadata:', {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    });

    // Minimal processing approach - preserve image features
    let processedBuffer: Buffer;
    let shouldProcess = false;

    // Only process if image is extremely large (>2MB) or wrong format
    if (buffer.length > 2 * 1024 * 1024 || !['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format || '')) {
      shouldProcess = true;
    }

    if (shouldProcess && metadata.width && metadata.height && metadata.width > 2048) {
      // Only resize very large images
      processedBuffer = await sharp(buffer)
        .resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 98 })
        .toBuffer();
      console.log('Image resized and optimized');
    } else if (shouldProcess) {
      // Convert format only if needed
      processedBuffer = await sharp(buffer)
        .jpeg({ quality: 98 })
        .toBuffer();
      console.log('Image format converted');
    } else {
      // Use original buffer for most cases
      processedBuffer = buffer;
      console.log('Using original image buffer');
    }

    console.timeEnd('image-processing');

    // Convert to base64 - handle different formats appropriately
    const base64Image = processedBuffer.toString('base64');
    let mimeType = 'image/jpeg';

    if (!shouldProcess && metadata.format) {
      switch (metadata.format) {
        case 'png':
          mimeType = 'image/png';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        default:
          mimeType = 'image/jpeg';
      }
    }

    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    // Generate embeddings
    console.time('replicate-embedding');
    console.log('Generating CLIP embedding with Replicate');
    const embeddingResponse = await replicate.run(
      'andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a',
      {
        input: { inputs: imageDataUrl },
      },
    );

    // Extract embedding array
    let embeddingsVector: number[];
    if (Array.isArray(embeddingResponse) && embeddingResponse.length > 0 && 'embedding' in embeddingResponse[0]) {
      embeddingsVector = embeddingResponse[0].embedding as number[];
    } else if (Array.isArray(embeddingResponse) && embeddingResponse.every((val) => typeof val === 'number')) {
      embeddingsVector = embeddingResponse as number[];
    } else {
      console.error('Unexpected embedding response format:', embeddingResponse);
      return NextResponse.json(
        { error: 'Invalid embedding response from Replicate' },
        { status: 500 },
      );
    }

    console.timeEnd('replicate-embedding');
    console.log('Embedding generated:', {
      dimension: embeddingsVector.length,
      sample: embeddingsVector.slice(0, 5),
    });

    // Validate embedding dimension
    if (embeddingsVector.length !== 768) {
      console.error('Invalid embedding dimension:', embeddingsVector.length);
      return NextResponse.json(
        { error: `Expected 768-dimensional vector, got ${embeddingsVector.length}` },
        { status: 500 },
      );
    }

    // Prepare vector for Pinecone
    const vectorId = `image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pineconeVector = {
      id: vectorId,
      values: embeddingsVector,
      metadata: {
        timestamp: new Date().toISOString(),
        text: metadataText || 'Image embedding',
        source: 'lens-tool',
        originalFormat: metadata.format,
        originalSize: `${metadata.width}x${metadata.height}`,
        processedSize: processedBuffer.length,
        filename,
        sourceUrl: imageUrl || '', 
        inputType: imageUrl ? 'url' : 'file',
      },
    };

    // Upsert to Pinecone
    console.time('pinecone-upsert');
    console.log('Upserting vector to Pinecone:', { vectorId });
    await index.upsert([pineconeVector]);
    console.timeEnd('pinecone-upsert');

    console.timeEnd('pinecone-upload');

    return NextResponse.json({
      success: true,
      vectorId,
      dimension: embeddingsVector.length,
      timestamp: new Date().toISOString(),
      originalSize: `${metadata.width}x${metadata.height}`,
      processedSize: processedBuffer.length,
      wasProcessed: shouldProcess,
      source: imageUrl ? 'url' : 'file',
      sourceUrl: imageUrl || null,
      filename,
    });
  } catch (error: unknown) {
    console.error('Pinecone upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload vector to Pinecone';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}