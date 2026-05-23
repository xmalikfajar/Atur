package requester

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

// ExportToCurl mengonversi RequestPayload menjadi perintah curl yang dapat dijalankan
// Semua placeholder environment variable akan disubstitusi sebelum generate curl
func ExportToCurl(payload RequestPayload) (string, error) {
	var curl strings.Builder

	// Mulai dengan "curl"
	curl.WriteString("curl")

	// Tambahkan method jika bukan GET
	if payload.Method != "" && payload.Method != "GET" {
		curl.WriteString(fmt.Sprintf(` -X %s`, payload.Method))
	}

	// Tambahkan URL (quote untuk keamanan)
	curl.WriteString(fmt.Sprintf(` '%s'`, payload.URL))

	// Tambahkan headers
	if len(payload.Headers) > 0 {
		for key, val := range payload.Headers {
			// Escape kutip dalam header value
			escapedVal := strings.ReplaceAll(val, "'", "'\\''")
			curl.WriteString(fmt.Sprintf(` -H '%s: %s'`, key, escapedVal))
		}
	}

	// Tambahkan body sesuai tipe
	switch payload.BodyType {
	case "raw":
		if payload.Body != "" {
			// Raw body bisa JSON, XML, text, dll
			// Escape kutip single dalam body
			escapedBody := strings.ReplaceAll(payload.Body, "'", "'\\''")
			curl.WriteString(fmt.Sprintf(` --data '%s'`, escapedBody))
		}

	case "urlencoded":
		// URL-encoded form data
		bodyStr, _ := buildURLEncodedString(payload.FormFields)
		if bodyStr != "" {
			escapedBody := strings.ReplaceAll(bodyStr, "'", "'\\''")
			curl.WriteString(fmt.Sprintf(` --data '%s'`, escapedBody))
		}

	case "form-data":
		// Multipart form data
		// Untuk form-data dengan file, kita perlu use -F (form parameter)
		for _, field := range payload.FormFields {
			if field.IsFile {
				// File upload menggunakan -F 'key=@/path/to/file'
				curl.WriteString(fmt.Sprintf(` -F '%s=@%s'`, field.Key, field.FilePath))
			} else {
				// Form field biasa menggunakan -F 'key=value'
				escapedVal := strings.ReplaceAll(field.Value, "'", "'\\''")
				curl.WriteString(fmt.Sprintf(` -F '%s=%s'`, field.Key, escapedVal))
			}
		}
	}

	return curl.String(), nil
}

// buildURLEncodedString membuat query string dari FormField
// Ini adalah helper untuk ExportToCurl
func buildURLEncodedString(fields []FormField) (string, error) {
	params := url.Values{}
	for _, field := range fields {
		if !field.IsFile {
			params.Add(field.Key, field.Value)
		}
	}
	return params.Encode(), nil
}

// ImportFromCurl mengurai perintah curl dan mengembalikan RequestPayload
// Catatan: Ini adalah parser sederhana dan mungkin tidak handle semua edge case
func ImportFromCurl(curlCommand string) (RequestPayload, error) {
	payload := RequestPayload{
		Method:  "GET",
		Headers: make(map[string]string),
	}

	// Bersihkan prefix 'curl ' jika ada
	cmd := strings.TrimSpace(curlCommand)
	if strings.HasPrefix(cmd, "curl ") {
		cmd = cmd[5:]
	}

	// Parser sederhana: split by spasi tapi respek quotes
	tokens := parseShellTokens(cmd)

	for i := 0; i < len(tokens); i++ {
		token := tokens[i]

		switch token {
		case "-X", "--request":
			// Method
			if i+1 < len(tokens) {
				payload.Method = strings.ToUpper(tokens[i+1])
				i++
			}

		case "-H", "--header":
			// Header
			if i+1 < len(tokens) {
				header := tokens[i+1]
				// Format: "Key: Value"
				if idx := strings.Index(header, ":"); idx != -1 {
					key := strings.TrimSpace(header[:idx])
					val := strings.TrimSpace(header[idx+1:])
					payload.Headers[key] = val
				}
				i++
			}

		case "-d", "--data":
			// Raw body
			if i+1 < len(tokens) {
				payload.Body = tokens[i+1]
				payload.BodyType = "raw"
				i++
			}

		case "-F", "--form":
			// Form data
			if i+1 < len(tokens) {
				field := parseFormField(tokens[i+1])
				payload.FormFields = append(payload.FormFields, field)
				payload.BodyType = "form-data"
				i++
			}

		case "-G", "--get":
			// GET method
			payload.Method = "GET"

		case "-I", "--head":
			// HEAD method
			payload.Method = "HEAD"

		default:
			// URL (token tanpa prefix - atau hanya URL)
			if !strings.HasPrefix(token, "-") && payload.URL == "" {
				payload.URL = token
			}
		}
	}

	return payload, nil
}

// parseShellTokens membagi command string dengan respek terhadap quoted strings
// Ini adalah parser sederhana untuk curl command
func parseShellTokens(cmd string) []string {
	var tokens []string
	var current strings.Builder
	inQuote := false
	quoteChar := rune(0)
	escaped := false

	for _, ch := range cmd {
		if escaped {
			current.WriteRune(ch)
			escaped = false
			continue
		}

		if ch == '\\' {
			escaped = true
			continue
		}

		if !inQuote && (ch == '\'' || ch == '"') {
			inQuote = true
			quoteChar = ch
			continue
		}

		if inQuote && ch == quoteChar {
			inQuote = false
			quoteChar = 0
			continue
		}

		if !inQuote && (ch == ' ' || ch == '\t' || ch == '\n') {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			continue
		}

		current.WriteRune(ch)
	}

	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}

// parseFormField mengurai satu form field dari format curl
// Format: "key=value" atau "key=@/path/to/file"
func parseFormField(field string) FormField {
	result := FormField{}

	if idx := strings.Index(field, "="); idx != -1 {
		result.Key = field[:idx]
		value := field[idx+1:]

		// Check if it's a file (dimulai dengan @)
		if strings.HasPrefix(value, "@") {
			result.IsFile = true
			result.FilePath = value[1:]
		} else {
			result.IsFile = false
			result.Value = value
		}
	}

	return result
}

// GenerateRequestScript membuat script (shell script atau batch) untuk menjalankan curl
// Berguna untuk export request sebagai standalone script
func GenerateRequestScript(payload RequestPayload, osType string) (string, error) {
	curl, err := ExportToCurl(payload)
	if err != nil {
		return "", err
	}

	// osType bisa "linux", "darwin", "windows"
	if osType == "windows" {
		// Windows batch file
		return fmt.Sprintf("@echo off\n%s\n", curl), nil
	}

	// Linux/macOS shell script
	return fmt.Sprintf("#!/bin/bash\n%s\n", curl), nil
}

// ExportToCurlFile menyimpan curl command ke file
func ExportToCurlFile(payload RequestPayload, filepath string) error {
	curl, err := ExportToCurl(payload)
	if err != nil {
		return err
	}

	file, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(curl)
	return err
}
