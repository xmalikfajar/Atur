package requester

import (
	"bytes"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
)

// mimeByFilename menentukan MIME type berdasarkan ekstensi file.
// Fallback ke application/octet-stream jika tidak dikenali.
func mimeByFilename(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if mimeType := mime.TypeByExtension(ext); mimeType != "" {
		return mimeType
	}
	// Fallback manual untuk ekstensi umum yang mungkin tidak ter-register di OS
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".pdf":
		return "application/pdf"
	case ".xlsx":
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case ".xls":
		return "application/vnd.ms-excel"
	case ".csv":
		return "text/csv"
	}
	return "application/octet-stream"
}

// buildMultipart membangun multipart/form-data body dari daftar FormField.
// Mengembalikan reader, content-type (dengan boundary), dan error jika ada.
func buildMultipart(fields []FormField) (io.Reader, string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	for _, field := range fields {
		if field.Key == "" {
			continue
		}

		if field.IsFile {
			// Buka file dari path lokal
			file, err := os.Open(field.FilePath)
			if err != nil {
				return nil, "", fmt.Errorf("gagal membuka file '%s': %w", field.FilePath, err)
			}
			defer file.Close()

			// Ambil nama file dari path
			fileName := filepath.Base(field.FilePath)

			// Detect MIME type dari ekstensi — ini yang dibaca multer sebagai file.mimetype
			mimeType := mimeByFilename(fileName)

			// Buat header part secara manual agar bisa set Content-Type yang benar
			// (CreateFormFile hardcode application/octet-stream)
			h := make(textproto.MIMEHeader)
			h.Set("Content-Disposition",
				fmt.Sprintf(`form-data; name="%s"; filename="%s"`, field.Key, fileName))
			h.Set("Content-Type", mimeType)

			part, err := writer.CreatePart(h)
			if err != nil {
				return nil, "", fmt.Errorf("gagal membuat form file untuk key '%s': %w", field.Key, err)
			}

			// Salin isi file ke part
			if _, err := io.Copy(part, file); err != nil {
				return nil, "", fmt.Errorf("gagal menyalin isi file '%s': %w", field.FilePath, err)
			}
		} else {
			// Field teks biasa
			if err := writer.WriteField(field.Key, field.Value); err != nil {
				return nil, "", fmt.Errorf("gagal menulis field '%s': %w", field.Key, err)
			}
		}
	}

	// Tutup writer untuk menulis boundary penutup
	if err := writer.Close(); err != nil {
		return nil, "", fmt.Errorf("gagal menutup multipart writer: %w", err)
	}

	return &buf, writer.FormDataContentType(), nil
}
