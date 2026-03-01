# Atur — API Client Desktop

> **Atur** adalah aplikasi desktop ringan untuk menguji REST API, sebagai alternatif Postman yang berjalan offline dan gratis. Dibangun dengan Go (Wails) + Vanilla JS/HTML/CSS.

---

## Tech Stack

| Layer    | Teknologi                                   |
| -------- | ------------------------------------------- |
| Backend  | Go (Golang) + `net/http` + `mime/multipart` |
| Frontend | Vanilla JS, HTML, CSS                       |
| Desktop  | Wails v2                                    |
| Build    | Cross-platform (Windows, macOS, Linux)      |

---

## Struktur Project

```
atur/
├── main.go                  # Entry point Wails
├── app.go                   # Struct App & binding ke frontend
├── internal/
│   ├── requester/
│   │   ├── requester.go     # Core HTTP client logic
│   │   └── multipart.go     # File upload handler
│   ├── history/
│   │   └── history.go       # Simpan & load history request
│   └── collection/
│       └── collection.go    # Koleksi & environment variables
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── main.js          # Entry JS
│       ├── ui.js            # Render & DOM manipulation
│       ├── request.js       # Panggil backend via Wails binding
│       └── collection.js    # Manajemen koleksi
├── wails.json
└── go.mod
```

---

## 🌿 Git & Branching

- Branch utama: `main` (protected, tidak boleh push langsung)
- Branch fitur: `feat/nama-fitur`
- Branch bugfix: `fix/nama-bug`
- Format commit: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Contoh: `feat: tambah halaman dashboard`

---

## Fitur Utama

### Phase 1 — MVP (Prioritas Utama)

- [x] Pilih HTTP method: GET, POST, PUT, PATCH, DELETE
- [x] Input URL
- [x] Editor Headers (key-value pairs)
- [x] Editor Body:
  - Raw (JSON, Text)
  - Form-data (termasuk file upload)
  - x-www-form-urlencoded
- [x] Tampilkan response:
  - Status code + status text
  - Response headers
  - Response body (dengan syntax highlight sederhana)
  - Response time & ukuran

### Phase 2 — Quality of Life

- [x] History request (disimpan lokal)
- [x] Simpan request ke koleksi
- [x] Environment variables (`{{base_url}}`, `{{token}}`, dll)
- [x] Tab multi-request

### Phase 3 — Advanced

- [x] Auth helper: Bearer Token, Basic Auth, API Key
- [ ] Export request ke curl command
- [ ] Import dari curl command
- [ ] Export/import koleksi (format JSON)

---

## Konvensi Kode

### Go (Backend)

- Gunakan `net/http` standard library untuk HTTP client — **jangan** tambah library HTTP eksternal
- Semua fungsi yang di-expose ke frontend harus terdaftar di `app.go` sebagai method dari struct `App`
- Error dikembalikan sebagai struct `Response` dengan field `Error string`, bukan panic
- Format penamaan: `camelCase` untuk fungsi exported ke frontend, `snake_case` tidak digunakan

```go
// Contoh struct Response
type Response struct {
    StatusCode int               `json:"statusCode"`
    Status     string            `json:"status"`
    Headers    map[string]string `json:"headers"`
    Body       string            `json:"body"`
    Duration   int64             `json:"duration"` // dalam millisecond
    Size       int               `json:"size"`     // dalam bytes
    Error      string            `json:"error"`
}
```

### JavaScript (Frontend)

- Gunakan Vanilla JS murni — **tidak ada** framework atau library eksternal kecuali disetujui
- Panggil fungsi Go melalui `window.go.main.App.<NamaFungsi>()`
- Pisahkan logika UI (`ui.js`) dari logika request (`request.js`)
- Gunakan `async/await` untuk semua pemanggilan ke backend

```js
// Contoh pemanggilan ke backend
async function sendRequest(payload) {
  try {
    const response = await window.go.main.App.SendRequest(payload);
    return response;
  } catch (err) {
    console.error("Gagal kirim request:", err);
  }
}
```

### CSS

- Gunakan CSS Variables untuk warna & tema
- Tidak menggunakan framework CSS (Bootstrap, Tailwind, dll)
- Dukung tema gelap (dark mode) sejak awal menggunakan `prefers-color-scheme`

```css
:root {
  --color-bg: #1e1e2e;
  --color-surface: #2a2a3d;
  --color-primary: #7c6af7;
  --color-text: #cdd6f4;
  --color-border: #45475a;
}
```

---

## Cara Setup & Menjalankan

```bash
# 1. Install Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 2. Clone / masuk ke direktori project
cd atur

# 3. Jalankan mode development
wails dev

# 4. Build untuk production (semua platform)
wails build
```

---

## Panduan untuk AI Coding Assistant

Saat membantu mengembangkan project ini, ikuti aturan berikut:

1. **Jangan ubah tech stack** — tetap gunakan Go + Wails + Vanilla JS tanpa menambah dependency baru tanpa konfirmasi.
2. **Utamakan phase yang aktif** — fokus pada fitur di Phase 1 terlebih dahulu sebelum Phase 2 atau 3.
3. **Selalu kembalikan error dengan elegan** — jangan biarkan panic atau unhandled error di Go maupun JS.
4. **Kode harus cross-platform** — hindari hardcode path separator atau OS-specific behavior.
5. **Komentar dalam Bahasa Indonesia** — komentar kode menggunakan Bahasa Indonesia agar konsisten dengan identitas project.
6. **Nama fungsi dalam Bahasa Inggris** — nama fungsi, variabel, dan struct tetap dalam Bahasa Inggris mengikuti konvensi Go dan JS.
7. **File upload wajib menggunakan `mime/multipart`** — jangan gunakan cara lain untuk handle multipart/form-data.
8. **Simpan data lokal menggunakan file JSON** — untuk history dan koleksi, gunakan penyimpanan berbasis file JSON di direktori user (bukan database).

---

## Referensi

- [Wails v2 Documentation](https://wails.io/docs/introduction)
- [Go net/http](https://pkg.go.dev/net/http)
- [Go mime/multipart](https://pkg.go.dev/mime/multipart)

---

## 📌 Catatan Tambahan

- Dokumentasi API tersedia di `docs/api.md`
- Keputusan teknis yang sudah final didokumentasikan di `docs/decisions/`
- Jika ada ambiguitas dalam task, tanyakan sebelum menulis kode
