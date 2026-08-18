/**
 * Extracts image files from a clipboard or drag-and-drop event.
 * Returns [] when the event carries no image data.
 */
export function getImagesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const files: File[] = [];

  // Prefer items (clipboard screenshots arrive here)
  if (dt.items && dt.items.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  if (!files.length && dt.files && dt.files.length) {
    for (const file of Array.from(dt.files)) {
      if (file.type.startsWith("image/")) files.push(file);
    }
  }

  return files;
}

/** Gives pasted screenshots a readable name instead of "image.png". */
export function namePastedImage(file: File): File {
  if (file.name && file.name !== "image.png") return file;
  const ext = file.type.split("/")[1] || "png";
  return new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type });
}
