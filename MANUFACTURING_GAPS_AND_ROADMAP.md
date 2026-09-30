# Analisis Kesiapan Reeval ERP terhadap Realita Manufaktur & Roadmap Perbaikan

Dokumen ini mencatat seluruh temuan celah fungsional (*gap analysis*), kebutuhan operasional pabrik nyata, serta rekomendasi fitur yang belum tertangani pada sistem Reeval ERP saat ini. Dokumen ini berfungsi sebagai acuan (*master roadmap*) sebelum memulai tahap implementasi perbaikan.

---

## Ringkasan Eksekutif
Aplikasi saat ini sudah memiliki fondasi yang solid untuk alur standar *Make-to-Order* (Sales Order ➔ SPK Produksi ➔ Surat Jalan Pengiriman ➔ Faktur Penjualan), perhitungan HPP otomatis, serta multi-level BOM & Bahan Setengah Jadi.

Namun, ketika dihadapkan pada realita operasional pabrik sehari-hari, sistem masih mengasumsikan alur kerja "ideal" yang selalu berjalan mulus tanpa adanya kecacatan barang, penolakan kiriman, retur pelanggan, limbah bahan baku, atau pembatalan setelah produksi berjalan.

---

## Daftar Lengkap Celah Sistem & Realita Manufaktur

### 1. Modul Handling Pesanan Retur (Returns Management) — *Kritis*
Saat ini status pesanan hanya bergerak satu arah maju (`PENDING ➔ PROCESSING ➔ READY ➔ SENT`). Jika barang sudah diterima pelanggan, tidak ada mekanisme untuk menangani retur.

* **A. Retur Penjualan (Customer Sales Return / RMA):**
  * **Pencatatan Klaim Retur**: Formulir komplain retur (nomor RMA, foto bukti cacat, alasan: cacat produksi, rusak di perjalanan, salah ukuran/kain, dll).
  * **Alur Fisik Barang**: Barang masuk ke area karantina gudang (*Quarantine / Defect Holding*).
  * **Keputusan Tindakan (*Disposition*)**:
    1. *Tukar Unit Baru (Replacement)*: Menerbitkan SPK pengganti tanpa menambah tagihan baru.
    2. *Perbaikan (Rework/Repair)*: Masuk kembali ke lantai produksi untuk dibongkar/diperbaiki.
    3. *Kembali ke Stok (Restock)*: Jika barang hanya salah kirim dan masih mulus.
    4. *Afkir / Buang (Scrap)*: Jika rusak total dan tidak bisa diperbaiki.
  * **Alur Finansial & Akuntansi**:
    * Penerbitan *Credit Note* pemotong piutang atau pengembalian dana (*Refund*).
    * Jurnal akuntansi pembalik: `Debit: Retur Penjualan`, `Kredit: Piutang Dagang / Kas & Bank`, serta penyesuaian persediaan dan HPP.

* **B. Retur Pembelian Bahan Baku (Vendor/Supplier Return):**
  * Saat PO bahan baku diterima, sering kali ditemukan kain robek, busa kempes, atau kayu basah/melengkung.
  * Diperlukan fitur penerimaan parsial dengan nota retur supplier (*Debit Note*) untuk memotong hutang dagang (*Accounts Payable*).

---

### 2. Quality Control (QC Gate) & Manajemen Limbah/Susut (Scrap Rate)
* **Kondisi Saat Ini**: Job card langsung berubah dari `IN_PROGRESS` ke `COMPLETED`. Bahan baku dipotong sesuai angka teoritis BOM.
* **Kebutuhan Realita Manufaktur**:
  * **Incoming QC**: Pemeriksaan bahan baku dari supplier saat tiba di pintu gudang sebelum masuk ke stok aktif.
  * **In-Process & Final QC**: Pemeriksaan checklist kualitas sebelum barang dipindahkan ke area pengiriman (misal: kerapian jahitan, kestabilan rangka, dimensi busa, kelengkapan aksesoris kaki/baut).
  * **Scrap / Waste Rate (Tingkat Susut Bahan)**: Dalam pemotongan kayu dan kain, pasti ada sisa/limbah terbuang (waste 5–10%). BOM perlu mendukung faktor susut (*yield factor*) agar stok tercatat akurat dengan fisik gudang.

---

### 3. Persediaan Barang Jadi (Finished Goods) & Manajemen Lokasi Gudang
* **Kondisi Saat Ini**: Modul inventaris hanya memiliki stok *Raw Material* (Bahan Baku) dan Bahan Setengah Jadi. Sistem murni 100% *Make-to-Order* (MTO).
* **Kebutuhan Realita Manufaktur**:
  * **Make-to-Stock (MTS)**: Pabrik sering memproduksi stok penyangga (*buffer stock*) untuk produk terlaris saat musim sepi (*low season*). Saat order masuk, sales bisa langsung mengalokasikan stok Barang Jadi tanpa perlu SPK produksi baru.
  * **Pemisahan Lokasi Gudang**:
    1. Gudang Bahan Baku (*Raw Material Warehouse*)
    2. Gudang Barang Jadi (*Finished Goods Warehouse*)
    3. Area Transit Siap Muat (*Staging Area*)
    4. Gudang Karantina / Barang Rusak (*Defect / Quarantine Storage*)

---

### 4. Alur Pembayaran Realistis: Uang Muka (Down Payment / DP) & Termin B2B
* **Kondisi Saat Ini**: Invoice baru terbit secara otomatis saat pengiriman barang berstatus selesai (`DELIVERED` / `SENT`).
* **Kebutuhan Realita Manufaktur**:
  * **Wajib DP untuk Order Custom**: Pabrik tidak akan memulai proses potong bahan sebelum ada bukti pembayaran Uang Muka (DP 30%–50%).
  * **Validasi Terbit SPK**: SPK produksi hanya boleh divalidasi/diproses jika pesanan sudah berstatus *DP Paid*.
  * **Termin Pembayaran Fleksibel**:
    * Faktur Uang Muka (DP Invoice).
    * Faktur Pelunasan Sebelum Kirim (Cash Before Delivery).
    * Piutang Berjangka (*Term of Payment / TOP 14, 30, 60 hari*) untuk mitra toko mebel atau proyek B2B.

---

### 5. SPK Rework (Pekerjaan Ulang) & Selisih Bahan (Material Variance)
* **Kondisi Saat Ini**: Tidak ada jenis SPK perbaikan. Konsumsi material terkunci pada formula BOM awal.
* **Kebutuhan Realita Manufaktur**:
  * **SPK Rework**: Jika ada unit yang gagal QC atau diretur oleh konsumen, diterbitkan SPK perbaikan khusus yang mereferensikan unit asal.
  * **Material Variance**: Pengeluaran bahan tambahan (misal butuh tambahan 1,5 meter kain karena salah potong) dapat dicatat dengan kategori *Biaya Rework / Kerusakan Internal*, tanpa mengacaukan BOM standar produk.

---

### 6. Rekapitulasi Upah Borongan Operator (Piece-Rate Production Payroll)
* **Kondisi Saat Ini**: Sistem sudah mencatat tarif borongan (`fixedLaborCost`) per operasi dan nama operator pada Job Card.
* **Kebutuhan Realita Manufaktur**:
  * Modul rekapitulasi upah mingguan/bulanan per pekerja: *"Berapa unit pekerjaan yang diselesaikan oleh Operator A dalam periode tertentu, dan berapa total upah borongan yang harus dibayarkan?"*
  * Fitur pencetakan slip upah borongan (*Payroll Slip*) untuk mandor/bagian keuangan.

---

### 7. Penanganan Logistik: Gagal Kirim & Ekspedisi Luar
* **Kondisi Saat Ini**: Pengiriman hanya memiliki status `READY_TO_SHIP ➔ IN_TRANSIT ➔ DELIVERED`.
* **Kebutuhan Realita Manufaktur**:
  * **Gagal Kirim (*Failed Delivery / Reschedule*)**: Saat supir tiba di lokasi, jika penerima tidak ada, jalanan tidak bisa dilewati truk, atau pembeli membatalkan sepihak, armada harus dapat mencatat status gagal kirim beserta catatan alasan dan foto lokasi, lalu mengembalikan barang ke gudang.
  * **Pengiriman via Ekspedisi Pihak Ketiga**: Dukungan pengiriman luar kota melalui kargo pihak ketiga (Dakota, Indah Cargo, Deliveree) yang mencakup nama ekspedisi, nomor resi / AWB, dan link tracking.

---

### 8. Perencanaan Kebutuhan Bahan Baku Otomatis (MRP / Auto-Requisition)
* **Kondisi Saat Ini**: Admin gudang harus memeriksa status stok menipis secara manual.
* **Kebutuhan Realita Manufaktur**:
  * Perhitungan agregat kebutuhan bahan dari seluruh SPK aktif/pending dibandingkan dengan stok tersedia (*available stock*).
  * Sistem otomatis menghasilkan draf pengajuan pembelian (*Purchase Requisition / Draft PO*) ke supplier untuk material yang mengalami kekurangan (*shortage*).

---

### 9. Pemeliharaan Mesin & Downtime Tracking (Asset Maintenance)
* **Kondisi Saat Ini**: Sudah ada modul aset dan log servis riwayat perbaikan.
* **Kebutuhan Realita Manufaktur**:
  * **Jadwal Perawatan Berkala (*Preventive Maintenance*)**: Notifikasi berkala servis mesin utama (mesin potong, kompresor jok, mesin jahit).
  * **Log Mesin Rusak (*Breakdown Downtime*)**: Pencatatan durasi mesin mati yang berdampak pada keterlambatan jadwal produksi.

---

### 10. Fondasi Teknis: Multi-User Concurrency & Migrasi Database
* **Kondisi Saat Ini**: State aplikasi masih tersimpan pada **`localStorage` browser**.
* **Kebutuhan Realita Manufaktur**:
  * Lingkungan pabrik melibatkan banyak user secara bersamaan: Sales di kantor/lapangan, Gudang di area logistik, Supervisor di lantai pabrik, dan Driver di smartphone.
  * Menggunakan `localStorage` berarti data tidak tersinkronisasi antar perangkat.
  * Diperlukan migrasi ke database terpusat (PostgreSQL / Supabase / Prisma) dengan otentikasi role-based yang aman dan update real-time.

---

## Matriks Prioritas Implementasi

| Tahap | Modul / Fitur | Tingkat Urgensi | Estimasi Dampak Operasional |
| :--- | :--- | :---: | :--- |
| **Fase 1** | **Handling Pesanan Retur (RMA)** & Jurnal Akuntansi Retur | 🔥 Sangat Tinggi | Menutup kebocoran pencatatan barang rusak/kembali |
| **Fase 2** | **Alur Pembayaran DP & Termin B2B** sebelum SPK terbit | 🔥 Sangat Tinggi | Mengurangi risiko kerugian modal kerja |
| **Fase 3** | **Quality Control (QC Gate)** & Penanganan Gagal Kirim | ⚡ Tinggi | Menjamin standar mutu & kelancaran logistik armada |
| **Fase 4** | **Gudang Barang Jadi (Finished Goods)** & SPK Rework | ⚡ Tinggi | Fleksibilitas Make-to-Stock & efisiensi perbaikan |
| **Fase 5** | **Rekap Upah Borongan Operator (Payroll Produksi)** | 💡 Sedang | Mempermudah administrasi upah tukang/mandor |
| **Fase 6** | **MRP (Perencanaan Bahan Otomatis)** & Ekspedisi Pihak Ketiga | 💡 Sedang | Otomasi pengadaan bahan & ekspansi jangkauan kirim |
| **Fase 7** | **Migrasi Database Terpusat (Multi-User Backend)** | 🚀 Fondasi Jangka Panjang | Sinkronisasi multi-perangkat di seluruh area pabrik |

---

*Catatan: Dokumen ini disimpan di root direktori proyek sebagai referensi. Pengerjaan perbaikan akan dimulai sesuai arahan dan prioritas yang dipilih pengguna.*
