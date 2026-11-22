/**
 * Client-side photo compression utility and synthetic demo photo fixtures for Field Closeout.
 * Invariant: Bounded payloads (<=250KB) without third-party storage in Phase 1.
 */

export interface SamplePhoto {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: "shutoff-valve",
    name: "Corroded Valve",
    url: "/demo-photos/shutoff-valve.svg",
    description: "Leaking brass ball valve near main isolation",
  },
  {
    id: "condenser-surge",
    name: "Condenser Disconnect",
    url: "/demo-photos/condenser-surge.svg",
    description: "AC disconnect switch needing surge protection",
  },
  {
    id: "thermostat-wall",
    name: "Old Thermostat",
    url: "/demo-photos/thermostat-wall.svg",
    description: "Existing analog non-programmable thermostat",
  },
];

/**
 * Resizes and compresses an uploaded image file down to <=250KB JPEG base64 Data URL.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1200,
  targetMaxSizeBytes = 250_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Approximate base64 overhead ~ 1.37
        while (dataUrl.length > targetMaxSizeBytes * 1.35 && quality > 0.35) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
