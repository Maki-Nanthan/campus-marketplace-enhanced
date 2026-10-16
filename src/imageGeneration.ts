import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "./firebase";

type GenerateListingImageRequest = {
  imageBase64: string;
  mimeType: string;
  title: string;
  category: string;
  condition: string;
};

type GenerateListingImageResponse = {
  imageBase64: string;
  mimeType: string;
};

export async function generateListingImage(
  request: GenerateListingImageRequest,
): Promise<GenerateListingImageResponse> {
  if (!firebaseApp) {
    throw new Error("Connect Firebase before generating an AI product photo.");
  }

  const generate = httpsCallable<
    GenerateListingImageRequest,
    GenerateListingImageResponse
  >(getFunctions(firebaseApp), "generateListingImage");
  const { data } = await generate(request);

  if (
    typeof data.imageBase64 !== "string" ||
    typeof data.mimeType !== "string" ||
    !data.imageBase64 ||
    !data.mimeType.startsWith("image/")
  ) {
    throw new Error("The AI service returned an invalid image. Please try again.");
  }

  return data;
}
