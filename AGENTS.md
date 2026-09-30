# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Mandatory Project UI & Development Rules

1. **Reusable Component Architecture**: Selalu gunakan komponen reusable yang ada di `src/components/ui/` (seperti `Button`, `ActionMenu`, `Input`, `Select`, `Modal`, `CurrencyInput`, `Badge`, `Card`, dll). JANGAN PERNAH membuat styling inline raw HTML yang memecah konsistensi atau menulis ulang komponen yang bukan komponen tunggal. Jika komponen yang dibutuhkan belum ada di `src/components/ui/` (terutama komponen yang berpotensi digunakan berulang atau memerlukan banyak props), buat komponen baru yang reusable di `src/components/ui/`.
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


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
