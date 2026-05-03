export type Database = {
  public: {
    Tables: {
      loans: {
        Row: {
          id: string;
          kode_unik: string;
          nama: string;
          tanggal_lahir: string;
          prodi: string;
          jurusan: string;
          semester: number;
          nama_barang: string;
          nomor_whatsapp: string;
          deadline: string;
          foto_peminjam_url: string | null;
          foto_barang_url: string | null;
          tanggal_pinjam: string;
          tanggal_kembali: string | null;
          status: "dipinjam" | "kembali" | "selesai";
          item_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kode_unik: string;
          nama: string;
          tanggal_lahir: string;
          prodi: string;
          jurusan: string;
          semester: number;
          nama_barang: string;
          nomor_whatsapp: string;
          deadline: string;
          foto_peminjam_url?: string | null;
          foto_barang_url?: string | null;
          tanggal_pinjam?: string;
          tanggal_kembali?: string | null;
          status?: "dipinjam" | "kembali" | "selesai";
          item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kode_unik?: string;
          nama?: string;
          tanggal_lahir?: string;
          prodi?: string;
          jurusan?: string;
          semester?: number;
          nama_barang?: string;
          nomor_whatsapp?: string;
          deadline?: string;
          foto_peminjam_url?: string | null;
          foto_barang_url?: string | null;
          tanggal_pinjam?: string;
          tanggal_kembali?: string | null;
          status?: "dipinjam" | "kembali" | "selesai";
          item_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

export type Loan = Database["public"]["Tables"]["loans"]["Row"];
