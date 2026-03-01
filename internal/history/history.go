package history

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// HistoryItem merepresentasikan satu entri history request
type HistoryItem struct {
	ID         string            `json:"id"`
	Method     string            `json:"method"`
	URL        string            `json:"url"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	BodyType   string            `json:"bodyType"`
	StatusCode int               `json:"statusCode"`
	Duration   int64             `json:"duration"`
	Timestamp  time.Time         `json:"timestamp"`
}

// historyFile mengembalikan path file JSON untuk menyimpan history
func historyFile() (string, error) {
	// Simpan di direktori konfigurasi user agar cross-platform
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(configDir, "atur")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "history.json"), nil
}

// Load membaca semua history dari file JSON
func Load() ([]HistoryItem, error) {
	path, err := historyFile()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		// File belum ada, kembalikan slice kosong
		return []HistoryItem{}, nil
	}
	if err != nil {
		return nil, err
	}

	var items []HistoryItem
	if err := json.Unmarshal(data, &items); err != nil {
		return nil, err
	}
	return items, nil
}

// Save menambahkan satu item ke history dan menyimpannya ke file
func Save(item HistoryItem) error {
	items, err := Load()
	if err != nil {
		return err
	}

	// Tambahkan item baru di awal (history terbaru di atas)
	items = append([]HistoryItem{item}, items...)

	// Batasi history maksimal 100 item
	const maxHistory = 100
	if len(items) > maxHistory {
		items = items[:maxHistory]
	}

	return writeFile(items)
}

// Clear menghapus semua history
func Clear() error {
	return writeFile([]HistoryItem{})
}

// writeFile menulis slice HistoryItem ke file JSON
func writeFile(items []HistoryItem) error {
	path, err := historyFile()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
