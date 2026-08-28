"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { authClient } from "@/lib/auth-client";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export function AvatarUploader({
  initialImage,
  name,
}: {
  initialImage: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initialImage);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("A imagem precisa ter até 4MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/account/avatar",
      });
      const { error: updateError } = await authClient.updateUser({ image: blob.url });
      if (updateError) {
        setError(updateError.message ?? "Não foi possível salvar a foto.");
        return;
      }
      setImage(blob.url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError("Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  const initials = name.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Trocar foto de perfil"
        className="relative h-20 w-20 overflow-hidden rounded-full border border-border disabled:opacity-50"
      >
        {image ? (
          <Image src={image} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-accent text-lg font-semibold">
            {initials}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Selecionar imagem"
        className="hidden"
        onChange={handleFileChange}
      />
      <span className="text-xs text-muted-foreground">
        {uploading ? "Enviando..." : "Clique para trocar a foto"}
      </span>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
