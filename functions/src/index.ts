import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

setGlobalOptions({maxInstances: 10});

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

type GenerateListingImageRequest = {
  imageBase64: string;
  mimeType: string;
  title: string;
  category: string;
  condition: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
};

/**
 * Checks untrusted callable data before accessing its fields.
 * @param {unknown} value Callable request data to validate.
 * @return {boolean} Whether the request has the required fields.
 */
function isGenerateListingImageRequest(
  value: unknown,
): value is GenerateListingImageRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request.imageBase64 === "string" &&
    typeof request.mimeType === "string" &&
    typeof request.title === "string" &&
    typeof request.category === "string" &&
    typeof request.condition === "string"
  );
}

export const generateListingImage = onCall(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 120,
    memory: "1GiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in to generate a product photo.",
      );
    }
    if (!isGenerateListingImageRequest(request.data)) {
      throw new HttpsError("invalid-argument", "The image request is invalid.");
    }

    const {imageBase64, mimeType, title, category, condition} = request.data;
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new HttpsError(
        "invalid-argument",
        "Choose a JPEG, PNG, or WebP image.",
      );
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
      throw new HttpsError(
        "invalid-argument",
        "The selected image is invalid.",
      );
    }
    const image = Buffer.from(imageBase64, "base64");
    if (!image.length || image.length > MAX_IMAGE_BYTES) {
      throw new HttpsError(
        "invalid-argument",
        "The image must be smaller than 6 MB.",
      );
    }
    if (
      title.length > 100 ||
      category.length > 100 ||
      condition.length > 100
    ) {
      throw new HttpsError("invalid-argument", "Listing details are too long.");
    }

    const prompt = [
      "Create one photorealistic marketplace image using the supplied photo.",
      "Preserve the product's identity, shape, color, branding, and condition.",
      "Keep all parts shown in the source photo.",
      "Use clean lighting and a simple neutral background.",
      "Do not change product features or add text, labels, watermarks,",
      "extra objects, or panels. Return only the finished image.",
      `Listing title: ${title.trim() || "Product for sale"}.`,
      `Category: ${category}. Condition: ${condition}.`,
    ].join(" ");

    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiApiKey.value(),
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {text: prompt},
                {inlineData: {mimeType, data: imageBase64}},
              ],
            }],
            generationConfig: {responseModalities: ["TEXT", "IMAGE"]},
          }),
        },
      );
    } catch (error) {
      logger.error("Gemini image generation request failed.", error);
      throw new HttpsError(
        "unavailable",
        "The AI image service could not be reached. Please try again.",
      );
    }

    if (!response.ok) {
      logger.error("Gemini image generation returned an error.", {
        status: response.status,
      });
      throw new HttpsError(
        "unavailable",
        "The AI image service could not generate a photo. Please try again.",
      );
    }

    const result = await response.json() as GeminiResponse;
    const generatedImage = result.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .find((part) => part.inlineData?.data);
    const generatedBase64 = generatedImage?.inlineData?.data;
    const generatedMimeType = generatedImage?.inlineData?.mimeType;
    const generatedImageBytes = generatedBase64 ?
      Buffer.from(generatedBase64, "base64") :
      Buffer.alloc(0);
    if (
      !generatedBase64 ||
      !generatedMimeType ||
      !allowedMimeTypes.includes(generatedMimeType) ||
      generatedImageBytes.length === 0 ||
      generatedImageBytes.length > MAX_IMAGE_BYTES
    ) {
      logger.error(
        "Gemini image generation response did not contain a supported image.",
      );
      throw new HttpsError(
        "internal",
        "The AI service did not return a usable image. Please try again.",
      );
    }

    return {imageBase64: generatedBase64, mimeType: generatedMimeType};
  },
);
