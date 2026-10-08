# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Mandatory Project UI & Development Rules

1. **Reusable Component Architecture & Eksekusi Komponen**:
   - Selalu gunakan komponen reusable resmi yang ada di `src/components/ui/` (`Button`, `ActionMenu`, `Input`, `Select`, `Modal`, `CurrencyInput`, `Badge`, `Card`, `Table`, dll).
   - **Tuntaskan Refaktor Saat Mengedit**: Saat diminta memperbaiki atau mengubah sebuah halaman, DILARANG mengambil jalan pintas dengan hanya menambal bagian luarnya saja sementara elemen yang disentuh masih menggunakan markup usang/komponen mentah. Selaraskan dan ganti dengan komponen resmi yang seharusnya.
   - **Ekstraksi Komponen Wajib**: Jika suatu bagian UI berpotensi digunakan berulang atau memerlukan banyak props/logika tampilan dan belum ada di `src/components/ui/`, JANGAN malas: buat komponen reusable baru di `src/components/ui/` terlebih dahulu sebelum menggunakannya.
2. **Desain Profesional & Industrial (No Gimmick & Standard Icons)**: Terapkan estetika industrial yang tenang, rapi, bersih, dan fungsional.
   - **Ikon Standar & Familiar**: Ikon fungsional yang familiar (seperti Add `Plus`, Edit `Edit2`, Delete `Trash2`, Close `X`, OK `Check`) WAJIB digunakan pada menu aksi baris/item.
   - **Hindari Ikon Gimmick**: JANGAN PERNAH menambahkan ikon dekoratif yang tidak familiar/tidak intuitif di header, title, atau tombol aksi fungsional (misal: ikon troli belanja di tombol pengadaan).
   - **Tombol Standar**: Gunakan komponen `Button` resmi dengan variant standar (`primary`, `secondary`, `outline`, `ghost`, `danger`).
3. **Ringkas, User-Centric Copywriting & Proporsional Width**:
   - Label tombol dan menu aksi harus to-the-point dan ringkas (contoh: `Edit` / `Delete`).
   - Lebar container/popover menu dropdown (`ActionMenu`) WAJIB proporsional dan memiliki *breathing room* yang wajar (`w-max min-w-[108px]`), tidak terlalu mepet/terjepit ke teks dan tidak melompong/terlalu lebar.
4. **Standardized Modal Actions**: Penggunaan Modal (`Modal.tsx`): Jika modal memiliki action button (seperti Simpan, Batal, Hapus, Kirim, dll), SELALU gunakan prop `actions`. JANGAN PERNAH menyimpan action button di dalam `children`.
5. **Dual Theme Color Coverage**: Penggunaan warna: Selalu terapkan class styling warna secara konsisten untuk kedua tema: Dark Mode (`dark:...`) dan Light Mode.
6. **Design System & Aesthetics Guidance**: Selalu ikuti `/frontend-design` (`.agents/skills/frontend-design/SKILL.md`) setiap kali mengedit UI atau membuat halaman baru untuk panduan visual design, tipografi, micro-animation, serta estetika profesional yang terhindar dari tampilan template default.
7. **Prinsip Simplicity & Standar Aplikasi Profesional (Anti-Overengineering & Anti-Clutter)**:
   - **Form Bersih & To-the-Point**: JANGAN PERNAH menambahkan container banner edukasi/informasi alur kerja (seperti kotak alert biru/indigo penjelas alur) di dalam modal atau form kecuali diminta secara eksplisit oleh user. Form harus bersih, rapi, dan fungsional tanpa teks menggurui yang merusak estetika.
   - **Pesan Notifikasi & Toast Singkat**: Toast/notifikasi harus to-the-point dan wajar seperti aplikasi profesional pada umumnya (contoh: "Pengajuan berhasil dibuat", bukan narasi panjang yang memberitahu data dikirim ke divisi mana).
   - **Hindari Detail Gimmick & Over-explanation**: JANGAN ngide menambah detail berlebihan yang tidak penting, membingungkan, atau tidak lazim ada pada aplikasi profesional. Tetap sederhana, intuitif, dan sesuai standar industri.
8. **Bebas Double Scroll pada Konten Modal**: Untuk setiap konten di dalam modal (`Modal.tsx`), defaultnya JANGAN PERNAH membuat container anak dengan pembatasan tinggi (seperti `max-h-... overflow-y-auto` atau `overflow-scroll`) yang memicu double scroll di dalam modal. Seluruh konten harus mengalir secara normal dan biarkan container modal (`Modal.tsx`) yang mengontrol scrolling alaminya secara penuh.
9. **Dev Server Start Trigger**: Jika user menyebut frasa seperti "ayo mulai", "lets go", "let's go", atau semacamnya yang menandakan permulaan sesi/pekerjaan, asisten WAJIB langsung menjalankan development server di terminal (`npm run dev` / `npm.cmd run dev` di Windows) secara background/daemon.
10. **Harmonisasi Card & Table (Edge-to-Edge Table Rule)**:
    - **Wajib Gunakan Komponen `Table`**: JANGAN PERNAH membuat tabel data menggunakan tag raw HTML manual (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`). SELALU gunakan komponen resmi `Table` dari `src/components/ui/Table.tsx`.
    - **Jika di Dalam Card Hanya Ada Table (Sole Child Pattern)**:
      - Card **WAJIB menghilangkan padding internalnya (`p-0 overflow-hidden`)** agar tabel menempel sempurna ke tepi batas kartu (*edge-to-edge*) tanpa gap atau margin putih canggung di sekeliling tabel.
      - Komponen `Table` di dalam Card **TIDAK BOLEH menggandakan border, shadow, atau rounded corner** (`embedded` / `border-0 shadow-none rounded-none`) karena frame luar sudah ditangani oleh Card.
      - Tempatkan komponen `Table` secara langsung sebagai anak tunggal di dalam `<Card><Table ... /></Card>` (manfaatkan prop bawaan `emptyTitle` & `emptyDescription` pada `Table`, DILARANG membungkusnya dengan percabangan conditional `<EmptyState>` manual di luar `Table` yang memecah hierarki deteksi *sole child*).
11. **Disiplin Data Grid & List (Kurasi Data & Anti-Redundansi Kolom)**:
    - **Kurasi Kolom (Minimal Esensial)**: Tabel ringkasan hanya menampilkan data primer untuk identifikasi cepat dan aksi (maksimal 4–6 kolom utama). Informasi detail mendalam adalah ranah halaman atau modal detail.
    - **Anti-Redundansi Kolom**: DILARANG mengulang informasi atau konsep yang sama pada kolom yang berbeda dalam satu baris data (baik melalui teks, badge, maupun sub-label tambahan).
    - **Netralitas Visual**: Mayoritas sel tabel WAJIB berupa teks netral biasa. Badge dan aksen warna HANYA digunakan untuk status diskrit yang memerlukan perhatian (contoh: *Pending*, *Selesai*, *Ditolak*). Nilai kategori atau jenis reguler cukup teks netral biasa.
    - **Standar Penjajaran Kolom**:
      - Kolom teks, nama, kategori: rata kiri (`text-left`).
      - Kolom angka nominal, kuantitas, persentase: rata kanan (`text-right`).
      - Kolom badge status pendek dan menu aksi: rata tengah (`text-center`).
12. **Eliminasi Tuntas Kode Usang Saat Migrasi Alur / Halaman (Zero Zombie Code & Legacy Modal Rule)**:
    - **Pembersihan Total (*Clean Sweep*)**: Saat suatu fitur atau alur UX dimigrasikan dari modal ke halaman mandiri (*dedicated page*) atau arsitektur baru, SELURUH elemen modal lama, state pembuka modal (seperti `show...Modal`, `selected...Detail`), fungsi handler usang, dan conditional rendering modal terkait di halaman pemanggil WAJIB langsung dihapus tuntas.
    - **Dilarang Zombie/Ghost Modal**: DILARANG KERAS membiarkan markup modal lama tetap tertinggal di DOM/kode sumber yang dapat memicu *double modal* (modal lama muncul kembali di latar belakang), tabrakan state, atau membingungkan alur navigasi pengguna.
    - **Isolasi State Aksi**: Jika terdapat dialog aksi spesifik (seperti konfirmasi tolak atau batal), gunakan state target khusus yang independen (misal: `targetPOForCancel`), DILARANG mendaur ulang atau menumpangi state modal detail yang sudah didepresiasi.
13. **Standarisasi PageHeader (Tanpa Deskripsi & Tombol Ukuran Normal)**:
    - **Header Bersih Tanpa Deskripsi**: DILARANG menambahkan paragraf deskripsi, subtitle, atau metadata sekunder (seperti "Dibuat pada...", tanggal, nama pembuat) di dalam `PageHeader`. Judul `PageHeader` WAJIB bersih dan to-the-point (hanya judul halaman/nama entitas). Informasi metadata sekunder adalah ranah grid/kartu ringkasan konten halaman.
    - **Tombol Berukuran Normal**: Seluruh action button di dalam `PageHeader` WAJIB menggunakan ukuran normal (`size="md"` / default Button, DILARANG menggunakan `size="sm"`). Trigger icon menu (`ActionMenu`) di PageHeader juga wajib diselaraskan ke ukuran normal (`triggerSize="md"` / `h-9 w-9`) agar ketinggian tombol serasi dan proporsional.



<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
