import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api-client";

async function uploadMedia(kind: "image" | "video", file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ url: string }>(`/media/products/${kind}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
}

export function useUploadProductImage() {
  return useMutation({ mutationFn: (file: File) => uploadMedia("image", file) });
}

export function useUploadProductVideo() {
  return useMutation({ mutationFn: (file: File) => uploadMedia("video", file) });
}
