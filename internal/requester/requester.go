package requester

import (
	"bytes"
	"io"
	"net/http"
	"strings"
	"time"
)

// RequestPayload adalah data request yang dikirim dari frontend
type RequestPayload struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`    // untuk raw body (JSON, text)
	BodyType string           `json:"bodyType"` // "raw", "form-data", "urlencoded", "none"
	FormFields []FormField   `json:"formFields"` // untuk form-data & urlencoded
}

// FormField merepresentasikan satu field pada form-data atau urlencoded
type FormField struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	IsFile   bool   `json:"isFile"`   // true jika field ini adalah file
	FilePath string `json:"filePath"` // path file di sistem lokal
}

// Response adalah hasil HTTP request yang dikembalikan ke frontend
type Response struct {
	StatusCode int               `json:"statusCode"`
	Status     string            `json:"status"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Duration   int64             `json:"duration"` // dalam millisecond
	Size       int               `json:"size"`     // dalam bytes
	Error      string            `json:"error"`
}

// Send mengirim HTTP request berdasarkan payload dan mengembalikan response
func Send(payload RequestPayload) Response {
	// Validasi URL
	if payload.URL == "" {
		return Response{Error: "URL tidak boleh kosong"}
	}

	// Validasi method
	if payload.Method == "" {
		payload.Method = "GET"
	}

	var (
		bodyReader  io.Reader
		contentType string
	)

	// Siapkan body berdasarkan tipe
	switch payload.BodyType {
	case "raw":
		bodyReader = strings.NewReader(payload.Body)
	case "urlencoded":
		bodyReader, contentType = buildURLEncoded(payload.FormFields)
	case "form-data":
		// Multipart dihandle di multipart.go
		var err error
		bodyReader, contentType, err = buildMultipart(payload.FormFields)
		if err != nil {
			return Response{Error: "Gagal membangun multipart body: " + err.Error()}
		}
	default:
		bodyReader = bytes.NewReader([]byte{})
	}

	// Buat HTTP request
	req, err := http.NewRequest(payload.Method, payload.URL, bodyReader)
	if err != nil {
		return Response{Error: "Gagal membuat request: " + err.Error()}
	}

	// Set headers dari payload
	for key, val := range payload.Headers {
		req.Header.Set(key, val)
	}

	// Set Content-Type otomatis jika belum di-set manual
	if contentType != "" {
		if _, exists := payload.Headers["Content-Type"]; !exists {
			req.Header.Set("Content-Type", contentType)
		}
	}

	// Kirim request dan ukur durasi
	client := &http.Client{Timeout: 30 * time.Second}
	start := time.Now()
	resp, err := client.Do(req)
	duration := time.Since(start).Milliseconds()

	if err != nil {
		return Response{
			Error:    "Gagal mengirim request: " + err.Error(),
			Duration: duration,
		}
	}
	defer resp.Body.Close()

	// Baca response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return Response{
			Error:    "Gagal membaca response body: " + err.Error(),
			Duration: duration,
		}
	}

	// Kumpulkan response headers
	respHeaders := make(map[string]string)
	for key, vals := range resp.Header {
		respHeaders[key] = strings.Join(vals, ", ")
	}

	return Response{
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
		Headers:    respHeaders,
		Body:       string(respBody),
		Duration:   duration,
		Size:       len(respBody),
	}
}

// buildURLEncoded membangun body untuk x-www-form-urlencoded
func buildURLEncoded(fields []FormField) (io.Reader, string) {
	params := make([]string, 0, len(fields))
	for _, f := range fields {
		if f.Key == "" {
			continue
		}
		params = append(params, f.Key+"="+f.Value)
	}
	body := strings.Join(params, "&")
	return strings.NewReader(body), "application/x-www-form-urlencoded"
}
