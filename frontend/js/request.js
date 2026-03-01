/**
 * request.js — Logika pengiriman request ke backend Go via Wails binding
 */

/**
 * sendRequest — Mengirim HTTP request melalui backend Go
 * @param {Object} payload - Data request (method, url, headers, body, bodyType, formFields)
 * @returns {Object} Response dari backend
 */
export async function sendRequest(payload) {
  try {
    const response = await window.go.main.App.SendRequest(payload);
    return response;
  } catch (err) {
    console.error("Gagal mengirim request:", err);
    return {
      error: "Gagal menghubungi backend: " + String(err),
      statusCode: 0,
      status: "",
      headers: {},
      body: "",
      duration: 0,
      size: 0,
    };
  }
}
