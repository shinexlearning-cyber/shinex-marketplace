/* Central API client. No secrets belong in frontend code. */
const API_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:5000/api"
  : "https://shinex-marketplace.onrender.com/api";

const API = {
  async request(path, options = {}) {
    const config = {...options, headers: {...(options.headers || {})}};
    if (config.body && !(config.body instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(config.body);
    }
    const res = await fetch(API_BASE + path, config);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data?.message || `Request failed (${res.status})`);
      err.status = res.status; err.data = data; throw err;
    }
    return data;
  },
  get(path, options={}) { return this.request(path, {method:"GET", ...options}); },
  post(path, body, options={}) { return this.request(path, {method:"POST", body, ...options}); },
  put(path, body, options={}) { return this.request(path, {method:"PUT", body, ...options}); },
  delete(path, options={}) { return this.request(path, {method:"DELETE", ...options}); }
};