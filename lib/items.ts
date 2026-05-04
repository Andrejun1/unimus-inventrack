import { supabase } from "./supabase/client";

export interface Item {
  id: string;
  kode_barang: string;
  nama_barang: string;
  deskripsi: string | null;
  kategori: string | null;
  stok_total: number;
  stok_tersedia: number;
  foto_url: string | null;
  barcode: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemInsert {
  kode_barang: string;
  nama_barang: string;
  deskripsi?: string | null;
  kategori?: string | null;
  stok_total: number;
  foto_url?: string | null;
  barcode?: string | null;
  qr_code?: string | null;
}

export interface ItemUpdate {
  nama_barang?: string;
  deskripsi?: string | null;
  kategori?: string | null;
  stok_total?: number;
  stok_tersedia?: number;
  foto_url?: string | null;
  barcode?: string | null;
  qr_code?: string | null;
}

// Generate unique code: LAB-YYYY-NNNN
export async function generateKodeBarang(): Promise<string> {
  const year = new Date().getFullYear();

  const { data, error } = await supabase
    .from("items")
    .select("kode_barang")
    .like("kode_barang", `LAB-${year}-%`)
    .order("kode_barang", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;

  let nextNumber = 1;
  if (data) {
    const kode = data as { kode_barang: string };
    const parts = kode.kode_barang.split("-");
    const lastNum = parseInt(parts[2] || "0", 10);
    nextNumber = lastNum + 1;
  }

  return `LAB-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// Get all items
export async function getAllItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Get available items only (stok_tersedia > 0)
export async function getAvailableItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .gt("stok_tersedia", 0)
    .order("nama_barang", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Get single item by ID
export async function getItemById(id: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Get item by barcode
export async function getItemByBarcode(barcode: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Create item
export async function createItem(item: ItemInsert): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .insert({
      ...item,
      stok_tersedia: item.stok_total,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update item
// ✅ Update item dengan auto-sync stok_tersedia
export async function updateItem(
  id: string,
  updates: ItemUpdate,
): Promise<Item> {
  // 1. Ambil data item saat ini untuk kalkulasi
  const currentItem = await getItemById(id);
  if (!currentItem) throw new Error("Item tidak ditemukan");

  // 2. Siapkan updates final
  const finalUpdates = { ...updates };

  // 3. 🎯 LOGIC PENTING: Jika stok_total berubah, sesuaikan stok_tersedia
  if (
    updates.stok_total !== undefined && 
    updates.stok_total !== currentItem.stok_total
  ) {
    const diff = updates.stok_total - currentItem.stok_total;
    
    // Hitung stok_tersedia baru berdasarkan selisih
    // Jika admin menambah stok → tersedia juga bertambah
    // Jika admin mengurangi stok → tersedia berkurang (tapi jangan negatif)
    const newAvailable = Math.max(0, Math.min(
      updates.stok_total,  // Jangan melebihi total baru
      currentItem.stok_tersedia + diff  // Adjust berdasarkan selisih
    ));
    
    finalUpdates.stok_tersedia = newAvailable;
  }

  // 4. Eksekusi update ke Supabase
  const { data, error } = await supabase
    .from("items")
    .update(finalUpdates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Decrease stock (when item is borrowed)
export async function decreaseStock(
  itemId: string,
  quantity: number = 1,
): Promise<Item> {
  const item = await getItemById(itemId);
  if (!item) throw new Error("Item tidak ditemukan");

  const newStock = Math.max(0, item.stok_tersedia - quantity);

  return updateItem(itemId, { stok_tersedia: newStock });
}

// Increase stock (when item is returned)
export async function increaseStock(
  itemId: string,
  quantity: number = 1,
): Promise<Item> {
  const item = await getItemById(itemId);
  if (!item) throw new Error("Item tidak ditemukan");

  const newStock = Math.min(item.stok_total, item.stok_tersedia + quantity);

  return updateItem(itemId, { stok_tersedia: newStock });
}

// Delete item
export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

// Search items by name or code
export async function searchItems(query: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .or(
      `nama_barang.ilike.%${query}%,kode_barang.ilike.%${query}%,deskripsi.ilike.%${query}%`,
    )
    .order("nama_barang", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Get items by category
export async function getItemsByCategory(kategori: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("kategori", kategori)
    .order("nama_barang", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Get all categories
export async function getAllCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("items")
    .select("kategori")
    .not("kategori", "is", null)
    .order("kategori", { ascending: true });
  if (error) throw error;

  const categories = (data ?? [])
    .map((item: any) => item.kategori)
    .filter((cat: string | null) => cat !== null);

  return [...new Set(categories)] as string[];
}

// Get statistics
export async function getItemsStatistics(): Promise<{
  total: number;
  available: number;
  borrowed: number;
  unavailable: number;
}> {
  const items = await getAllItems();

  const total = items.length;
  const available = items.filter((i) => i.stok_tersedia > 0).length;
  const unavailable = items.filter((i) => i.stok_tersedia === 0).length;

  return {
    total,
    available,
    borrowed: total - available,
    unavailable,
  };
}
