import { supabase } from "./supabase/client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadError {
  code: string;
  message: string;
}

export async function uploadItemPhoto(
  file: File,
  itemId: string,
): Promise<string> {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw {
      code: "INVALID_TYPE",
      message: "Format gambar harus JPG, PNG, atau WEBP",
    } as UploadError;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw {
      code: "FILE_TOO_LARGE",
      message: "Ukuran gambar tidak boleh lebih dari 5MB",
    } as UploadError;
  }

  try {
    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `${itemId}-${timestamp}-${randomId}.${ext}`;
    const path = `items/${filename}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("items")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw {
        code: "UPLOAD_FAILED",
        message: `Gagal mengunggah foto: ${error.message}`,
      } as UploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("items").getPublicUrl(data.path);

    return publicUrl;
  } catch (err: any) {
    if (err.code) {
      throw err;
    }
    throw {
      code: "UNKNOWN_ERROR",
      message: err?.message || "Gagal mengunggah foto",
    } as UploadError;
  }
}

export async function deleteItemPhoto(photoUrl: string): Promise<void> {
  try {
    if (!photoUrl) return;

    const url = new URL(photoUrl);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Cari posisi 'public' dan ambil bucket + path
    const publicIndex = pathSegments.indexOf('public');
    if (publicIndex === -1 || publicIndex + 2 >= pathSegments.length) {
      throw new Error('Invalid Supabase storage URL format');
    }
    
    // Bucket ada di index publicIndex+1, path adalah sisanya
    const bucket = pathSegments[publicIndex + 1];
    const path = pathSegments.slice(publicIndex + 2).join('/');
    
    if (!path) {
      throw new Error('Could not extract file path from URL');
    }

    // ✅ Delete dari storage
    const { error } = await supabase.storage
      .from(bucket) // Gunakan bucket yang terdeteksi dari URL
      .remove([path]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
    
    console.log(`✅ Photo deleted from storage: ${path}`);
    
  } catch (err: any) {
    console.error("❌ Error deleting photo from storage:", err);
    // ✅ Re-throw error agar caller (handleDelete) bisa handle
    throw err;
  }
}

export async function uploadLoanPhoto(
  file: File,
  loanCode: string,
  type: "peminjam" | "barang",
): Promise<string> {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw {
      code: "INVALID_TYPE",
      message: "Format gambar harus JPG, PNG, atau WEBP",
    } as UploadError;
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw {
      code: "FILE_TOO_LARGE",
      message: "Ukuran gambar tidak boleh lebih dari 5MB",
    } as UploadError;
  }

  try {
    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const folder = type === "peminjam" ? "peminjam" : "barang";
    const filename = `${loanCode}-${timestamp}.${ext}`;
    const path = `loans/${folder}/${filename}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("loans")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw {
        code: "UPLOAD_FAILED",
        message: `Gagal mengunggah foto: ${error.message}`,
      } as UploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("loans").getPublicUrl(data.path);

    return publicUrl;
  } catch (err: any) {
    if (err.code) {
      throw err;
    }
    throw {
      code: "UNKNOWN_ERROR",
      message: err?.message || "Gagal mengunggah foto",
    } as UploadError;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
