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
	Method     string            `json:"method"`
	URL        string            `json:"url"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`       // untuk raw body (JSON, text)
	BodyType   string            `json:"bodyType"`   // "raw", "form-data", "urlencoded", "none"
	FormFields []FormField       `json:"formFields"` // untuk form-data & urlencoded
	EnvVars    map[string]string `json:"envVars"`    // environment variables aktif
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

	// Untuk form-data dan urlencoded, Content-Type HARUS selalu di-set
	// karena multipart boundary unik per request dan harus match body.
	// Untuk tipe lain, hanya set jika user belum menentukan.
	if contentType != "" {
		switch payload.BodyType {
		case "form-data", "urlencoded":
			// Selalu override — boundary multipart tidak bisa ditebak user
			req.Header.Set("Content-Type", contentType)
		default:
			// Raw: hanya set jika belum ada
			if req.Header.Get("Content-Type") == "" {
				req.Header.Set("Content-Type", contentType)
			}
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

// SubstituteEnv mengganti semua placeholder {{key}} di URL, headers, dan body
// dengan nilai dari map EnvVars pada payload
func SubstituteEnv(payload RequestPayload) RequestPayload {
	replace := func(s string) string {
		for k, v := range payload.EnvVars {
			s = strings.ReplaceAll(s, "{{"+k+"}}", v)
		}
		return s
	}

	payload.URL = replace(payload.URL)
	payload.Body = replace(payload.Body)

	newHeaders := make(map[string]string, len(payload.Headers))
	for k, v := range payload.Headers {
		newHeaders[replace(k)] = replace(v)
	}
	payload.Headers = newHeaders

	for i, f := range payload.FormFields {
		payload.FormFields[i].Key = replace(f.Key)
		payload.FormFields[i].Value = replace(f.Value)
	}

	return payload
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
