# Atur — API Client Desktop

> **Atur** berasal dari bahasa Jawa, bermakna _menghaturkan_ atau _menyampaikan_ — seperti _atur ulem_ (menyampaikan undangan). Dalam konteks ini, Atur adalah aplikasi untuk menghaturkan request ke API.

Atur adalah aplikasi desktop ringan untuk menguji REST API. Dibangun sebagai alternatif Postman yang sepenuhnya **offline**, **gratis**, dan **ringan** — berjalan di Windows, macOS, dan Linux.

---

## ✨ Fitur

### HTTP Request
- Method: **GET**, **POST**, **PUT**, **PATCH**, **DELETE**, **HEAD**, **OPTIONS**
- Editor **Headers** key-value
- **Body** editor: raw (JSON, XML, text), `form-data`, `x-www-form-urlencoded`, none
- **Upload file** (multipart/form-data) — gratis, tanpa batasan versi berbayar
- **Authentication**: Basic Auth, Bearer Token, API Key

### Response
- Status code & status text dengan color badge
- **JSON Tree viewer** — ekspansi/collapse node untuk response JSON
- Tab **Body** (raw text / tree) dan **Headers**
- Durasi response (ms) dan ukuran body (bytes)

### Multi-Tab
- Buka banyak request dalam **tab** terpisah
- Setiap tab menyimpan state request & response secara independen
- Tutup tab, buat tab baru, load dari history/koleksi

### Koleksi & Environment
- Simpan request ke dalam **koleksi** (folder-based)
- **Import / Export** koleksi (format JSON)
- **Environment variables** dengan sintaks `{{nama_variabel}}`
- Syntax highlighting otomatis untuk `{{var}}` di URL, headers, dan body

### History
- Riwayat semua request tersimpan **lokal** di mesin pengguna
- Klik item history untuk memuat ulang request
- Hapus history per item atau clear all

### cURL Import / Export
- **Export** request ke perintah `curl` (siap copy-paste)
- **Import** perintah `curl` menjadi request di Atur
- Modal dengan tab Export dan Import

### Sidebar
- Panel **Koleksi** dan **History** dengan tab navigasi
- Sidebar dapat **di-resize** (drag divider)
- Toggle collapse sidebar

---

## 🖥️ Platform

| OS      | Status      |
| ------- | ----------- |
| Windows | ✅ Didukung |
| macOS   | ✅ Didukung |
| Linux   | ✅ Didukung |

---

## 🛠️ Tech Stack

| Layer    | Teknologi                                  |
| -------- | ------------------------------------------ |
| Backend  | Go (Golang) — `net/http`, `mime/multipart` |
| Frontend | Vanilla JS (ES Modules), HTML, CSS         |
| Desktop  | [Wails v2](https://wails.io)               |

---

## 🚀 Instalasi & Menjalankan

### Prasyarat

- [Go](https://golang.org/dl/) versi 1.22 atau lebih baru
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)
- Node.js (dibutuhkan Wails untuk build frontend)
- **Linux**: `libgtk-3-dev` dan `libwebkit2gtk-4.0-dev`

```bash
# Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Menjalankan Mode Development

```bash
git clone https://github.com/username/atur.git
cd atur
wails dev
```

### Build untuk Production

```bash
# Build untuk platform saat ini
wails build

# Output ada di ./build/bin/
```

---

## 📁 Struktur Project

```
atur/
├── main.go                       # Entry point Wails
├── app.go                        # Struct App & binding ke frontend
├── wails.json                    # Konfigurasi Wails
├── go.mod
├── .github/workflows/
│   └── release.yml               # CI/CD release otomatis
├── internal/
│   ├── requester/
│   │   ├── requester.go          # Core HTTP client & env substitution
│   │   ├── multipart.go          # Multipart/form-data builder (file upload)
│   │   └── curl.go               # Export/Import cURL command
│   ├── history/
│   │   └── history.go            # Simpan & load history request (JSON)
│   └── collection/
│       └── collection.go         # Koleksi & environment variables (JSON)
├── frontend/
│   ├── index.html                # UI utama
│   ├── style.css                 # Styling (dark theme)
│   └── js/
│       ├── main.js               # Entry point & event bindings
│       ├── ui.js                 # Render response, sidebar, tree toggle
│       ├── request.js            # Panggil backend via Wails binding
│       ├── tabs.js               # Manajemen tab multi-request
│       ├── collection.js         # Manajemen koleksi & environment
│       ├── curl.js               # UI modal import/export cURL
│       ├── jsonTree.js           # JSON tree viewer (expandable)
│       └── highlight.js          # Highlight {{var}} di input fields
└── wailsjs/                      # Generated Wails bindings (auto)
```

---

## 📦 Download

Binary siap pakai tersedia di halaman **[Releases](https://github.com/username/atur/releases)**.

---

## �️ Roadmap

Semua fitur yang direncanakan telah selesai diimplementasikan:

- [x] Kirim request HTTP dasar (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- [x] Upload file (multipart/form-data)
- [x] History request
- [x] Koleksi request
- [x] Environment variables (`{{var}}` syntax + highlighting)
- [x] Tab multi-request
- [x] Auth helper (Bearer Token, Basic Auth, API Key)
- [x] Export/Import curl command
- [x] Export/Import koleksi (format JSON)

---

## 🤝 Kontribusi

Kontribusi sangat disambut! Silakan buka _issue_ untuk laporan bug atau ide fitur, atau langsung buat _pull request_.

1. Fork repository ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur`
3. Commit perubahan: `git commit -m 'feat: tambah nama fitur'`
4. Push ke branch: `git push origin feat/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

[MIT License](LICENSE)

---

<p align="center">Dibuat dengan ❤️ menggunakan Go & Wails</p>
