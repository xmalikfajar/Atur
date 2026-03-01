package requester

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
)

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

			// Buat form file part
			part, err := writer.CreateFormFile(field.Key, fileName)
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
