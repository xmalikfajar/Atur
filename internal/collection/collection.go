package collection

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// RequestItem merepresentasikan satu request yang tersimpan dalam koleksi
type RequestItem struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Method   string            `json:"method"`
	URL      string            `json:"url"`
	Headers  map[string]string `json:"headers"`
	Body     string            `json:"body"`
	BodyType string            `json:"bodyType"`
}

// Collection merepresentasikan sebuah koleksi yang berisi beberapa request
type Collection struct {
	ID       string        `json:"id"`
	Name     string        `json:"name"`
	Requests []RequestItem `json:"requests"`
}

// Environment merepresentasikan satu set environment variables
type Environment struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Variables map[string]string `json:"variables"`
}

// dataDir mengembalikan direktori penyimpanan data Atur
func dataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(configDir, "atur")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

// collectionsFile mengembalikan path file JSON koleksi
func collectionsFile() (string, error) {
	dir, err := dataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "collections.json"), nil
}

// environmentsFile mengembalikan path file JSON environment
func environmentsFile() (string, error) {
	dir, err := dataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "environments.json"), nil
}

// --- Collections ---

// LoadAll membaca semua koleksi dari file JSON
func LoadAll() ([]Collection, error) {
	path, err := collectionsFile()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Collection{}, nil
	}
	if err != nil {
		return nil, err
	}

	var cols []Collection
	if err := json.Unmarshal(data, &cols); err != nil {
		return nil, err
	}
	return cols, nil
}

// Save menyimpan atau memperbarui koleksi berdasarkan ID
func Save(col Collection) error {
	cols, err := LoadAll()
	if err != nil {
		return err
	}

	// Cari koleksi yang sudah ada berdasarkan ID
	found := false
	for i, c := range cols {
		if c.ID == col.ID {
			cols[i] = col
			found = true
			break
		}
	}

	// Jika belum ada, tambahkan sebagai koleksi baru
	if !found {
		cols = append(cols, col)
	}

	return writeCollections(cols)
}

// Delete menghapus koleksi berdasarkan ID
func Delete(id string) error {
	cols, err := LoadAll()
	if err != nil {
		return err
	}

	filtered := make([]Collection, 0, len(cols))
	for _, c := range cols {
		if c.ID != id {
			filtered = append(filtered, c)
		}
	}

	return writeCollections(filtered)
}

// writeCollections menulis slice Collection ke file JSON
func writeCollections(cols []Collection) error {
	path, err := collectionsFile()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cols, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

// --- Environments ---

// LoadEnvironments membaca semua environment dari file JSON
func LoadEnvironments() ([]Environment, error) {
	path, err := environmentsFile()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Environment{}, nil
	}
	if err != nil {
		return nil, err
	}

	var envs []Environment
	if err := json.Unmarshal(data, &envs); err != nil {
		return nil, err
	}
	return envs, nil
}

// SaveEnvironment menyimpan atau memperbarui environment berdasarkan ID
func SaveEnvironment(env Environment) error {
	envs, err := LoadEnvironments()
	if err != nil {
		return err
	}

	found := false
	for i, e := range envs {
		if e.ID == env.ID {
			envs[i] = env
			found = true
			break
		}
	}

	if !found {
		envs = append(envs, env)
	}

	return writeEnvironments(envs)
}

// DeleteEnvironment menghapus environment berdasarkan ID
func DeleteEnvironment(id string) error {
	envs, err := LoadEnvironments()
	if err != nil {
		return err
	}

	filtered := make([]Environment, 0, len(envs))
	for _, e := range envs {
		if e.ID != id {
			filtered = append(filtered, e)
		}
	}

	return writeEnvironments(filtered)
}

// writeEnvironments menulis slice Environment ke file JSON
func writeEnvironments(envs []Environment) error {
	path, err := environmentsFile()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(envs, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
