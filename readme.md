# Atur

> **Atur** berasal dari bahasa Jawa, bermakna _menghaturkan_ atau _menyampaikan_ — seperti _atur ulem_ (menyampaikan undangan). Dalam konteks ini, Atur adalah aplikasi untuk menghaturkan request ke API.

Atur adalah aplikasi desktop ringan untuk menguji REST API. Dibuat sebagai alternatif Postman yang sepenuhnya **offline**, **gratis**, dan **ringan** — berjalan di Windows, macOS, dan Linux.

---

## ✨ Fitur

- Kirim HTTP request: GET, POST, PUT, PATCH, DELETE
- Editor headers dengan format key-value
- Body editor: raw JSON, form-data, x-www-form-urlencoded
- **Upload file** tanpa perlu versi berbayar
- Tampilkan response: status code, headers, body, durasi, dan ukuran
- Simpan koleksi request
- History request lokal
- Environment variables (`{{base_url}}`, `{{token}}`, dll)
- Export request ke perintah `curl`

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
| Frontend | Vanilla JS, HTML, CSS                      |
| Desktop  | [Wails v2](https://wails.io)               |

---

## 🚀 Instalasi & Menjalankan

### Prasyarat

- [Go](https://golang.org/dl/) versi 1.21 atau lebih baru
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)
- Node.js (dibutuhkan Wails untuk build frontend)

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
├── main.go                  # Entry point
├── app.go                   # Binding fungsi Go ke frontend
├── internal/
│   ├── requester/           # Core HTTP client & file upload
│   ├── history/             # Penyimpanan history request
│   └── collection/          # Koleksi & environment variables
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── main.js
│       ├── ui.js
│       ├── request.js
│       └── collection.js
└── wails.json
```

---

## 🗺️ Roadmap

- [x] Kirim request HTTP dasar
- [x] Upload file (multipart/form-data)
- [x] History request
- [x] Koleksi request
- [ ] Environment variables
- [ ] Tab multi-request
- [ ] Auth helper (Bearer, Basic Auth, API Key)
- [ ] Export/import ke format curl & JSON

---

## 🤝 Kontribusi

Kontribusi sangat disambut! Silakan buka _issue_ untuk laporan bug atau ide fitur, atau langsung buat _pull request_.

1. Fork repository ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m 'Tambah fitur: nama fitur'`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buat Pull Request

---

## 📄 Lisensi

[MIT License](LICENSE)

---

<p align="center">Dibuat dengan ❤️ menggunakan Go & Wails</p>
