import { extractDominantColor } from "./color-utils";
import { JsonColorData, ProcessedImageResult } from "./types";

export const IMG_PATH_URL = `https://ypafaxfcutwjamwcaclp.supabase.co/storage/v1/object/public/natural-public/`;
export const IMG_PATH_CROP = "webp-crop-new";

export const downloadJSON = (processedResults: ProcessedImageResult[]) => {
  if (processedResults.length === 0) return;

  const dataStr = JSON.stringify(processedResults, null, 2);
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

export const handleImageUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  {
    setError,
    setIsLoading,
    setProcessedResults,
    setSingleImageResult,
    clearStates,
  }: {
    setError: (error: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    setProcessedResults: (results: ProcessedImageResult[]) => void;
    setSingleImageResult: (result: ProcessedImageResult | null) => void;
    clearStates: () => void;
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
      const parsedData: JsonColorData[] = JSON.parse(text);

      if (!Array.isArray(parsedData)) {
        throw new Error("JSON must contain an array of color data objects");
      }

      const imagesToProcess = parsedData.filter(
        (item) => item?.imageName && item.imageName !== "NULL",
      );

      if (imagesToProcess.length > 0) {
        const results: ProcessedImageResult[] = [];

        for (const item of imagesToProcess) {
          try {
            const imageUrl = `${IMG_PATH_URL}${IMG_PATH_CROP}/${item.imageName}.webp`;
            const response = await fetch(imageUrl);

            if (!response.ok) continue;

            const imageBlob = await response.blob();
            const imageFile = new File([imageBlob], `${item.imageName}.webp`, {
              type: imageBlob.type,
            });

            const colorInfo = await extractDominantColor(imageFile);

            results.push({
              color: item.color,
              qualityGroup: item.qualityGroup,
              lotNo: item.imageName!,
              hex: colorInfo.hex,
              rgb: colorInfo.rgb,
              hsl: colorInfo.hsl,
              cmyk: colorInfo.cmyk,
              lab: colorInfo.lab,
              cov: colorInfo.percentage,
            });
          } catch (imgErr) {
            console.error(`Error processing image ${item.imageName}:`, imgErr);
          }
        }

        if (results.length > 0) {
          setProcessedResults(results);
        } else {
          setError("No valid images could be processed from the JSON file.");
        }
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
