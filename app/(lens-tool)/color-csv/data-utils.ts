import { extractDominantColor } from "./color-utils";
import { JsonColorData, ProcessedImageResult } from "./types";

export const IMG_PATH_URL = `https://ypafaxfcutwjamwcaclp.supabase.co/storage/v1/object/public/natural-public/`;
export const IMG_PATH_CROP = "webp-crop-new";

export const downloadJSON = (processedResults: ProcessedImageResult[]) => {
  if (processedResults.length === 0) return;

  // Create a new array excluding the count property (cov)
  const dataWithoutCount = processedResults.map(({ cov, ...rest }) => rest);

  const dataStr = JSON.stringify(dataWithoutCount, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = "extracted_colors.json";
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
};

export const downloadCSV = (processedResults: ProcessedImageResult[]) => {
  if (processedResults.length === 0) return;

  const headers = [
    "Color",
    "Quality Group",
    "Lot No",
    "HEX",
    "RGB",
    "HSL",
    "CMYK",
    "LAB",
    "Coverage",
  ];
  const csvRows = [
    headers.join(","),
    ...processedResults.map((r) =>
      [
        `"${r.color}"`,
        `"${r.qualityGroup}"`,
        `"${r.lotNo}"`,
        `"${r.hex}"`,
        `"${r.rgb.join(",")}"`,
        `"${r.hsl.join(",")}"`,
        `"${r.cmyk.join(",")}"`,
        `"${r.lab.join(",")}"`,
        `"${r.cov}%"`,
      ].join(","),
    ),
  ].join("\r\n");

  const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows);

  const exportFileDefaultName = "colors_data.csv";
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
};

// Helper function to process items in batches
const processBatch = async (
  batch: JsonColorData[],
  batchIndex: number,
  totalBatches: number,
): Promise<ProcessedImageResult[]> => {
  const results: ProcessedImageResult[] = [];

  console.log(
    `Processing batch ${batchIndex + 1} of ${totalBatches} (${batch.length} items)`,
  );

  // Process items in the batch concurrently with a limit
  const CONCURRENT_LIMIT = 5;
  for (let i = 0; i < batch.length; i += CONCURRENT_LIMIT) {
    const chunk = batch.slice(i, i + CONCURRENT_LIMIT);

    const chunkPromises = chunk.map(
      async (item): Promise<ProcessedImageResult | null> => {
        try {
          // Use imageName from the JsonColorData interface
          const lotNo = item.imageName;
          if (!lotNo) return null;

          const imageUrl = `${IMG_PATH_URL}${IMG_PATH_CROP}/${lotNo}.webp`;
          const response = await fetch(imageUrl);

          if (!response.ok) {
            console.warn(
              `Failed to fetch image for ${lotNo}: ${response.status}`,
            );
            return null;
          }

          const imageBlob = await response.blob();
          const imageFile = new File([imageBlob], `${lotNo}.webp`, {
            type: imageBlob.type,
          });

          const colorInfo = await extractDominantColor(imageFile);

          return {
            color: item.color,
            qualityGroup: item.qualityGroup,
            lotNo: lotNo,
            hex: colorInfo.hex,
            rgb: colorInfo.rgb,
            hsl: colorInfo.hsl,
            cmyk: colorInfo.cmyk,
            lab: colorInfo.lab,
            cov: colorInfo.percentage,
          };
        } catch (imgErr) {
          console.error(`Error processing image ${item.imageName}:`, imgErr);
          return null;
        }
      },
    );

    const chunkResults = await Promise.all(chunkPromises);
    results.push(
      ...chunkResults.filter(
        (result): result is ProcessedImageResult => result !== null,
      ),
    );

    // Small delay to prevent overwhelming the server
    if (i + CONCURRENT_LIMIT < batch.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
};

export const handleImageUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  {
    setError,
    setIsLoading,
    setProcessedResults,
    setSingleImageResult,
    clearStates,
    onProgress,
  }: {
    setError: (error: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    setProcessedResults: (results: ProcessedImageResult[]) => void;
    setSingleImageResult: (result: ProcessedImageResult | null) => void;
    clearStates: () => void;
    onProgress?: (current: number, total: number) => void;
  },
) => {
  const file = event.target.files?.[0];
  if (!file) {
    setError("No file selected.");
    return;
  }

  clearStates();
  setIsLoading(true);

  if (file.type === "application/json") {
    try {
      const text = await file.text();

      // First try to parse as the new format (with lotno)
      let parsedData: JsonColorData[] = [];
      const rawData = JSON.parse(text);

      if (!Array.isArray(rawData)) {
        throw new Error("JSON must contain an array of color data objects");
      }

      // Check if the data uses the new format (lotno) or old format (imageName)
      if (rawData.length > 0) {
        const sample = rawData[0];

        // If it has lotno field, convert it to imageName format
        if ("lotno" in sample && sample.lotno) {
          parsedData = rawData.map((item: any) => ({
            color: item.color,
            qualityGroup: item.qualityGroup,
            imageName: item.lotno,
            count: item.count,
          }));
        }
        // If it already has imageName, use as is
        else if ("imageName" in sample) {
          parsedData = rawData;
        }
        // Invalid format
        else {
          throw new Error(
            "JSON data must contain either 'lotno' or 'imageName' field along with 'color' and 'qualityGroup'",
          );
        }
      }

      const imagesToProcess = parsedData.filter(
        (item) =>
          item?.imageName &&
          item.imageName !== "NULL" &&
          item.imageName.trim() !== "",
      );

      console.log(
        `Processing ${imagesToProcess.length} images from ${parsedData.length} total records`,
      );

      if (imagesToProcess.length === 0) {
        setError("No valid image names found in the JSON file.");
        setIsLoading(false);
        return;
      }

      const BATCH_SIZE = 50; // Process in smaller batches for better memory management
      const batches: JsonColorData[][] = [];

      for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
        batches.push(imagesToProcess.slice(i, i + BATCH_SIZE));
      }

      const allResults: ProcessedImageResult[] = [];
      let processedCount = 0;

      for (let i = 0; i < batches.length; i++) {
        try {
          const batchResults = await processBatch(
            batches[i],
            i,
            batches.length,
          );
          allResults.push(...batchResults);
          processedCount += batches[i].length;

          // Update progress if callback provided
          if (onProgress) {
            onProgress(processedCount, imagesToProcess.length);
          }

          console.log(
            `Completed batch ${i + 1}/${batches.length}. Total results: ${allResults.length}`,
          );
        } catch (batchErr) {
          console.error(`Error processing batch ${i + 1}:`, batchErr);
          // Continue with other batches even if one fails
        }
      }

      if (allResults.length > 0) {
        setProcessedResults(allResults);
        console.log(
          `Successfully processed ${allResults.length} out of ${imagesToProcess.length} images`,
        );
      } else {
        setError("No valid images could be processed from the JSON file.");
      }
    } catch (err) {
      setError(
        `Failed to parse JSON file: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoading(false);
    }
  } else if (file.type.startsWith("image/")) {
    try {
      const colorInfo = await extractDominantColor(file);

      const result: ProcessedImageResult = {
        lotNo: file.name.replace(/\.[^/.]+$/, ""),
        hex: colorInfo.hex,
        rgb: colorInfo.rgb,
        hsl: colorInfo.hsl,
        cmyk: colorInfo.cmyk,
        lab: colorInfo.lab,
        cov: colorInfo.percentage,
      };

      setSingleImageResult(result);
    } catch (err) {
      setError(
        `Failed to extract colors: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoading(false);
    }
  } else {
    setError("Unsupported file type. Please upload a JSON or image file.");
    setIsLoading(false);
  }
};
