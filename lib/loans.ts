import { supabase } from "./supabase/client";
import { increaseStock, decreaseStock, getItemById, Item } from "./items";

// ============================================================================
// INTERFACES - LOAN (HEADER)
// ============================================================================
export interface LoanInsert {
  kode_unik: string;
  nama: string;
  tanggal_lahir: string;
  prodi: string;
  jurusan: string;
  semester: number;
  nomor_whatsapp: string;
  deadline: string;
  foto_peminjam_url?: string | null;
  status?: "dipinjam" | "kembali" | "selesai";
  // ❌ Field item-specific dihapus: pindah ke loan_items
  // nama_barang, item_id, quantity, foto_barang_url → tidak ada di sini
}

export interface LoanUpdate {
  status?: "dipinjam" | "kembali" | "selesai";
  tanggal_kembali?: string | null;
  // Tambahkan field lain jika perlu diupdate di header loan
}

export interface Loan {
  id: string;
  kode_unik: string;
  nama: string;
  tanggal_lahir: string;
  prodi: string;
  jurusan: string;
  semester: number;
  nama_barang: string | null; // Opsional: referensi cepat ke item pertama
  nomor_whatsapp: string;
  deadline: string;
  tanggal_pinjam: string;
  tanggal_kembali: string | null;
  foto_peminjam_url: string | null;
  foto_barang_url: string | null; // Opsional: foto referensi
  item_id: string | null; // Opsional: referensi cepat ke item pertama
  quantity: number | null; // Opsional: quantity item pertama
  status: "dipinjam" | "kembali" | "selesai";
  created_at: string;
  updated_at: string;
  // 👇 Field join (opsional, diisi saat fetch dengan relation)
  loan_items?: LoanItemWithItem[];
}

// ============================================================================
// INTERFACES - LOAN ITEMS (DETAIL / JUNCTION TABLE)
// ============================================================================
export interface LoanItemInsert {
  loan_id: string;
  item_id: string;
  quantity: number;
  foto_barang_url?: string | null;
}

export interface LoanItem {
  id: string;
  loan_id: string;
  item_id: string;
  quantity: number;
  foto_barang_url: string | null;
  created_at: string;
}

export interface LoanItemWithItem extends LoanItem {
  items: Item; // 👈 Join dengan tabel items
}

// ============================================================================
// GENERATE KODE UNIK
// ============================================================================
export async function generateKodeUnik(): Promise<string> {
  const year = new Date().getFullYear();

  const { data, error } = await supabase
    .from("loans")
    .select("kode_unik")
    .like("kode_unik", `UIT-${year}-%`)
    .order("kode_unik", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;

  let nextNumber = 1;
  if (data) {
    const kode = data as { kode_unik: string };
    const parts = kode.kode_unik.split("-");
    const lastNum = parseInt(parts[2] || "0", 10);
    nextNumber = lastNum + 1;
  }

  return `UIT-${year}-${nextNumber.toString().padStart(4, "0")}`;
}

// ============================================================================
// CREATE LOAN - SINGLE ITEM (BACKWARD COMPATIBLE)
// ============================================================================
export async function createLoan(
  loan: LoanInsert & {
    nama_barang: string;
    item_id: string;
    quantity?: number;
    foto_barang_url?: string | null;
  },
) {
  const {
    nama_barang,
    item_id,
    quantity = 1,
    foto_barang_url,
    ...loanData
  } = loan;

  const { data, error } = await supabase
    .from("loans")
    .insert({
      ...loanData,
      nama_barang,
      item_id,
      quantity,
      foto_barang_url,
      tanggal_pinjam: new Date().toISOString(),
      status: loanData.status ?? "dipinjam",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Loan;
}

// ============================================================================
// CREATE LOAN WITH MULTIPLE ITEMS (NEW - RECOMMENDED)
// ============================================================================
export async function createLoanWithItems(
  loanData: LoanInsert,
  items: Array<{
    item: Item;
    quantity: number;
    foto_barang_url?: string | null;
  }>,
) {
  if (items.length === 0) {
    throw new Error("Minimal 1 item harus dipilih");
  }

  // Validasi stok di awal (double-check)
  for (const { item, quantity } of items) {
    if (quantity < 1) {
      throw new Error(`Quantity untuk "${item.nama_barang}" minimal 1`);
    }
    if (quantity > item.stok_tersedia) {
      throw new Error(
        `Stok "${item.nama_barang}" tidak cukup. Tersedia: ${item.stok_tersedia}`,
      );
    }
  }

  // 1️⃣ Buat record loan utama (header)
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert({
      ...loanData,
      // Isi field referensi cepat dengan item pertama (opsional, untuk backward compat)
      nama_barang: items[0].item.nama_barang,
      item_id: items[0].item.id,
      quantity: items[0].quantity,
      foto_barang_url: items[0].foto_barang_url ?? null,
      tanggal_pinjam: new Date().toISOString(),
      status: loanData.status ?? "dipinjam",
    })
    .select()
    .single();

  if (loanError) throw loanError;

  // 2️⃣ Buat record loan_items untuk setiap barang
  const loanItemsData: LoanItemInsert[] = items.map(
    ({ item, quantity, foto_barang_url }) => ({
      loan_id: loan.id,
      item_id: item.id,
      quantity,
      foto_barang_url: foto_barang_url ?? null,
    }),
  );

  const { error: itemsError } = await supabase
    .from("loan_items")
    .insert(loanItemsData);

  if (itemsError) {
    // 🔄 Rollback: hapus loan jika insert items gagal
    await supabase.from("loans").delete().eq("id", loan.id);
    throw new Error(`Gagal menyimpan detail barang: ${itemsError.message}`);
  }

  // 3️⃣ Kurangi stok untuk setiap item (di luar transaction, tapi cukup aman untuk kasus ini)
  for (const { item, quantity } of items) {
    await decreaseStock(item.id, quantity);
  }

  return { loan: loan as Loan, loanItems: loanItemsData };
}

// ============================================================================
// READ - GET LOANS
// ============================================================================
export async function getAllLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      `
      *,
      loan_items (
        id,
        item_id,
        quantity,
        foto_barang_url,
        created_at,
        items (
          id,
          kode_barang,
          nama_barang,
          deskripsi,
          kategori,
          stok_total,
          stok_tersedia,
          foto_url,
          barcode,
          qr_code
        )
      )
    `,
    )
    .order("tanggal_pinjam", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Loan[];
}

export async function getLoanByKode(kodeUnik: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("kode_unik", kodeUnik)
    .maybeSingle();
  if (error) throw error;
  return data as Loan | null;
}

export async function getLoanById(id: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Loan | null;
}

// 👇 NEW: Get loan WITH items (join dengan loan_items + items)
export async function getLoanWithItems(
  id: string,
): Promise<(Loan & { loan_items: LoanItemWithItem[] }) | null> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      `
      *,
      loan_items (
        id,
        item_id,
        quantity,
        foto_barang_url,
        created_at,
        items (
          id,
          kode_barang,
          nama_barang,
          deskripsi,
          kategori,
          stok_total,
          stok_tersedia,
          foto_url,
          barcode,
          qr_code
        )
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as (Loan & { loan_items: LoanItemWithItem[] }) | null;
}

export async function getLoanWithItemsByKode(
  kodeUnik: string,
): Promise<(Loan & { loan_items: LoanItemWithItem[] }) | null> {
  const { data, error } = await supabase
    .from("loans")
    .select(
      `
      *,
      loan_items (
        id,
        item_id,
        quantity,
        foto_barang_url,
        created_at,
        items (
          id,
          kode_barang,
          nama_barang,
          deskripsi,
          kategori,
          stok_total,
          stok_tersedia,
          foto_url,
          barcode,
          qr_code
        )
      )
    `,
    )
    .eq("kode_unik", kodeUnik)
    .maybeSingle();

  if (error) throw error;
  return data as (Loan & { loan_items: LoanItemWithItem[] }) | null;
}

export async function getLoansByStatus(
  status: "dipinjam" | "kembali" | "selesai",
): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("status", status)
    .order("tanggal_pinjam", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Loan[];
}

export async function getOverdueLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("status", "dipinjam")
    .lt("deadline", new Date().toISOString())
    .order("deadline", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Loan[];
}

// ============================================================================
// UPDATE & RETURN
// ============================================================================
export async function updateLoan(
  id: string,
  updates: LoanUpdate,
): Promise<Loan> {
  const { data, error } = await supabase
    .from("loans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Loan;
}

// 👇 UPDATED: Return loan - handle multi-items
export async function returnLoan(id: string): Promise<Loan> {
  // 1. Ambil loan dengan items-nya
  const loan = await getLoanWithItems(id);
  if (!loan) throw new Error("Loan tidak ditemukan");
  if (loan.status === "kembali" || loan.status === "selesai") {
    throw new Error("Barang sudah dikembalikan");
  }

  // 2. Kembalikan stok untuk SETIAP item dalam loan_items
  if (loan.loan_items && loan.loan_items.length > 0) {
    for (const loanItem of loan.loan_items) {
      if (loanItem.item_id && loanItem.quantity && loanItem.quantity > 0) {
        await increaseStock(loanItem.item_id, loanItem.quantity);
      }
    }
  } else {
    // Fallback: jika loan_items kosong, coba gunakan field legacy (single-item)
    if (loan.item_id && loan.quantity && loan.quantity > 0) {
      await increaseStock(loan.item_id, loan.quantity);
    }
  }

  // 3. Update status loan
  return updateLoan(id, {
    status: "kembali",
    tanggal_kembali: new Date().toISOString(),
  });
}

// ============================================================================
// DELETE
// ============================================================================
export async function deleteLoan(id: string): Promise<void> {
  // ⚠️ Karena loan_items punya ON DELETE CASCADE, items akan terhapus otomatis
  const { error } = await supabase.from("loans").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteLoanWithFiles(
  id: string,
  fotoPeminjamUrl: string | null,
  fotoBarangUrl: string | null,
) {
  const extractPath = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split("/").filter(Boolean);
      const publicIndex = segments.indexOf("public");
      const authIndex = segments.indexOf("authenticated");
      const startIndex = publicIndex !== -1 ? publicIndex : authIndex;

      if (startIndex !== -1 && startIndex + 2 < segments.length) {
        return segments.slice(startIndex + 2).join("/");
      }
    } catch (e) {
      console.warn("URL parsing failed:", url, e);
    }
    return null;
  };

  const pathsToDelete = [
    extractPath(fotoPeminjamUrl),
    extractPath(fotoBarangUrl),
  ].filter((p): p is string => Boolean(p));

  if (pathsToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("loans")
      .remove(pathsToDelete);

    if (storageError) {
      console.error("❌ Storage delete FAILED:", {
        message: storageError.message,
        paths: pathsToDelete,
      });
    }
  }

  // Hapus dari database (loan_items akan terhapus otomatis karena CASCADE)
  const { error: dbError, data: dbData } = await supabase
    .from("loans")
    .delete()
    .eq("id", id)
    .select();

  if (dbError) {
    console.error("❌ Database delete FAILED:", dbError);
    throw dbError;
  }

  return dbData;
}

// ============================================================================
// UPLOAD HELPER
// ============================================================================
export async function uploadFile(
  file: File,
  bucket: string,
  path: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

// ============================================================================
// LOAN ITEMS - CRUD (NEW FUNCTIONS)
// ============================================================================

// Get all items for a loan
export async function getLoanItems(
  loanId: string,
): Promise<LoanItemWithItem[]> {
  const { data, error } = await supabase
    .from("loan_items")
    .select(
      `
      *,
      items (
        id,
        kode_barang,
        nama_barang,
        deskripsi,
        kategori,
        stok_total,
        stok_tersedia,
        foto_url,
        barcode,
        qr_code
      )
    `,
    )
    .eq("loan_id", loanId);

  if (error) throw error;
  return (data ?? []) as LoanItemWithItem[];
}

// Add item to existing loan (jika perlu fitur "tambah barang" setelah loan dibuat)
export async function addLoanItem(loanItem: LoanItemInsert): Promise<LoanItem> {
  // Validasi stok
  const item = await getItemById(loanItem.item_id);
  if (!item) throw new Error("Item tidak ditemukan");
  if (loanItem.quantity > item.stok_tersedia) {
    throw new Error(`Stok "${item.nama_barang}" tidak cukup`);
  }

  const { data, error } = await supabase
    .from("loan_items")
    .insert(loanItem)
    .select()
    .single();

  if (error) throw error;

  // Kurangi stok
  await decreaseStock(loanItem.item_id, loanItem.quantity);

  return data as LoanItem;
}

// Update quantity of loan item
export async function updateLoanItemQuantity(
  loanItemId: string,
  newQuantity: number,
): Promise<LoanItem> {
  if (newQuantity < 1) throw new Error("Quantity minimal 1");

  // Ambil data saat ini
  const { data: current, error: fetchError } = await supabase
    .from("loan_items")
    .select("item_id, quantity")
    .eq("id", loanItemId)
    .single();

  if (fetchError) throw fetchError;

  // Validasi stok jika quantity bertambah
  if (newQuantity > current.quantity) {
    const item = await getItemById(current.item_id);
    const diff = newQuantity - current.quantity;
    if (!item || item.stok_tersedia < diff) {
      throw new Error("Stok tidak cukup untuk menambah quantity");
    }
  }

  // Update database
  const { data, error } = await supabase
    .from("loan_items")
    .update({ quantity: newQuantity })
    .eq("id", loanItemId)
    .select()
    .single();

  if (error) throw error;

  // Adjust stok: hitung selisih
  const diff = newQuantity - current.quantity;
  if (diff > 0) {
    await decreaseStock(current.item_id, diff);
  } else if (diff < 0) {
    await increaseStock(current.item_id, Math.abs(diff));
  }

  return data as LoanItem;
}

// Remove item from loan (dan kembalikan stok)
export async function removeLoanItem(loanItemId: string): Promise<void> {
  // Ambil data dulu untuk kembalikan stok
  const { data, error: fetchError } = await supabase
    .from("loan_items")
    .select("item_id, quantity")
    .eq("id", loanItemId)
    .single();

  if (fetchError) throw fetchError;

  // Kembalikan stok
  if (data?.item_id && data?.quantity) {
    await increaseStock(data.item_id, data.quantity);
  }

  // Hapus record
  const { error } = await supabase
    .from("loan_items")
    .delete()
    .eq("id", loanItemId);

  if (error) throw error;
}

// ============================================================================
// STATISTICS & UTILS
// ============================================================================
export async function getActiveLoansCount(): Promise<number> {
  const { count, error } = await supabase
    .from("loans")
    .select("*", { count: "exact", head: true })
    .eq("status", "dipinjam");
  if (error) throw error;
  return count ?? 0;
}

export async function getLoansByPhoneNumber(
  nomor_whatsapp: string,
): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("nomor_whatsapp", nomor_whatsapp)
    .order("tanggal_pinjam", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Loan[];
}
