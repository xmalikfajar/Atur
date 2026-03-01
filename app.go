package main

import (
	"context"

	"atur/internal/collection"
	"atur/internal/history"
	"atur/internal/requester"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App adalah struct utama yang di-bind ke frontend Wails
type App struct {
	ctx context.Context
}

// NewApp membuat instance App baru
func NewApp() *App {
	return &App{}
}

// startup dipanggil saat aplikasi pertama kali dimulai
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// --- Request ---

// SendRequest mengirim HTTP request dan mengembalikan response.
// Sebelum dikirim, variabel environment di-substitusi ke URL, headers, dan body.
func (a *App) SendRequest(payload requester.RequestPayload) requester.Response {
	// Substitusi environment variables jika ada
	if len(payload.EnvVars) > 0 {
		payload = requester.SubstituteEnv(payload)
	}
	return requester.Send(payload)
}

// OpenFileDialog membuka dialog pemilihan file native OS dan mengembalikan path file yang dipilih
func (a *App) OpenFileDialog() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Pilih File",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// --- History ---

// GetHistory mengembalikan daftar history request yang tersimpan
func (a *App) GetHistory() ([]history.HistoryItem, error) {
	return history.Load()
}

// SaveHistory menyimpan satu item ke history
func (a *App) SaveHistory(item history.HistoryItem) error {
	return history.Save(item)
}

// DeleteHistory menghapus semua history
func (a *App) DeleteHistory() error {
	return history.Clear()
}

// --- Collection ---

// GetCollections mengembalikan semua koleksi yang tersimpan
func (a *App) GetCollections() ([]collection.Collection, error) {
	return collection.LoadAll()
}

// SaveCollection menyimpan atau memperbarui sebuah koleksi
func (a *App) SaveCollection(col collection.Collection) error {
	return collection.Save(col)
}

// DeleteCollection menghapus koleksi berdasarkan ID
func (a *App) DeleteCollection(id string) error {
	return collection.Delete(id)
}

// --- Environment ---

// GetEnvironments mengembalikan semua environment yang tersimpan
func (a *App) GetEnvironments() ([]collection.Environment, error) {
	return collection.LoadEnvironments()
}

// SaveEnvironment menyimpan atau memperbarui sebuah environment
func (a *App) SaveEnvironment(env collection.Environment) error {
	return collection.SaveEnvironment(env)
}

// DeleteEnvironment menghapus environment berdasarkan ID
func (a *App) DeleteEnvironment(id string) error {
	return collection.DeleteEnvironment(id)
}
