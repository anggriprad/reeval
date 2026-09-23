# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Mandatory Project UI & Development Rules

1. **Reusable Component Architecture**: Pastikan setiap pembuatan halaman baru menggunakan komponen reusable yang ada di `src/components/ui/` (seperti `Input`, `Select`, `Button`, `Modal`, `CurrencyInput`, `Badge`, `Card`, dll). Jika komponen yang dibutuhkan belum ada dan berpotensi digunakan berulang (default UI component), buatlah komponen baru yang reusable di `src/components/ui/` agar dapat digunakan lagi di halaman lain.
2. **Standardized Modal Actions**: Penggunaan Modal (`Modal.tsx`): Jika modal memiliki action button (seperti Simpan, Batal, Hapus, Kirim, dll), SELALU gunakan prop `actions`. JANGAN PERNAH menyimpan action button di dalam `children`.
3. **Dual Theme Color Coverage**: Penggunaan warna: Selalu terapkan class styling warna secara konsisten untuk kedua tema: Dark Mode (`dark:...`) dan Light Mode.
4. **Design System & Aesthetics Guidance**: Selalu ikuti `/frontend-design` (`.agents/skills/frontend-design/SKILL.md`) untuk panduan visual design, tipografi, micro-animation, serta estetika yang tidak terlihat seperti standar template default.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
