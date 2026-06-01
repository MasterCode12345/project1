const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_PREFIX = '/api/v1';

const TOKEN_KEY = 'project1_access_token';
const REFRESH_TOKEN_KEY = 'project1_refresh_token';

// ─── Access token ────────────────────────────────────────────────────────────

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  // Notify same-tab listeners (storage event chỉ fire cross-tab)
  window.dispatchEvent(new Event('auth-updated'));
}

// ─── Refresh token ────────────────────────────────────────────────────────────
// rememberMe=true → localStorage (tồn tại sau khi đóng trình duyệt)
// rememberMe=false → sessionStorage (xóa khi đóng tab/trình duyệt)

export function getRefreshToken() {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function setRefreshToken(token, remember = true) {
  // Luôn xóa ở cả hai kho trước khi ghi
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  if (!token) return;
  if (remember) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

// Decode JWT payload để lấy role mà không cần gọi API
export function getUserRole() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null; // 'admin' | 'customer'
  } catch {
    return null;
  }
}

// Lấy userId từ JWT (dùng cho cart per-user)
export function getUserId() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id || null;
  } catch {
    return null;
  }
}

// ─── HTTP core ────────────────────────────────────────────────────────────────

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || 'Có lỗi xảy ra khi gọi API';
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }

  return payload?.data ?? payload;
}

// rawRequest — không có refresh interceptor, dùng nội bộ
async function rawRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    ...options,
    headers,
  });

  return parseResponse(response);
}

// ─── Auto-refresh singleton ───────────────────────────────────────────────────
// Đảm bảo chỉ có 1 request /auth/refresh chạy song song
// Các request 401 khác chờ cùng promise này

let _refreshPromise = null;

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  // Phát hiện remember-me dựa trên nơi lưu token cũ
  const wasRemembered = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));

  const result = await rawRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  setAuthToken(result.token);
  if (result.refresh_token) {
    setRefreshToken(result.refresh_token, wasRemembered);
  }
}

// ─── Force logout ─────────────────────────────────────────────────────────────
// Xóa toàn bộ token và phát event 'session-expired' để app redirect về /login.
// Gọi khi phiên thực sự hết hạn: refresh thất bại, hoặc access token hết hạn mà
// không còn refresh token để gia hạn.

export function forceLogout() {
  const wasLoggedIn = Boolean(getAuthToken()) || Boolean(getRefreshToken());
  setAuthToken(null); // dispatch 'auth-updated' để Header cập nhật ngay
  setRefreshToken(null);
  if (wasLoggedIn) {
    window.dispatchEvent(new Event('session-expired'));
  }
}

// ─── Public apiRequest — với 401 interceptor ─────────────────────────────────

export async function apiRequest(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    // Auto-refresh khi access token hết hạn (401), nhưng KHÔNG làm điều này
    // cho các route /auth/* để tránh vòng lặp vô tận
    const isAuthRoute = path.startsWith('/auth/');

    if (err.status === 401 && !isAuthRoute) {
      const hasRefreshToken = Boolean(getRefreshToken());

      if (hasRefreshToken) {
        try {
          // Dùng singleton — tránh nhiều request refresh song song
          if (!_refreshPromise) {
            _refreshPromise = doRefresh().finally(() => {
              _refreshPromise = null;
            });
          }
          await _refreshPromise;

          // Retry request gốc với access token mới
          return await rawRequest(path, options);
        } catch {
          // Refresh thất bại → phiên hết hạn → đăng xuất + redirect về /login
          forceLogout();
          throw err; // ném lại lỗi 401 gốc
        }
      } else if (getAuthToken()) {
        // Có access token nhưng đã hết hạn và không còn refresh token để gia hạn
        // → phiên hết hạn → đăng xuất + redirect về /login
        forceLogout();
      }
    }

    throw err;
  }
}

// ─── Query builder ────────────────────────────────────────────────────────────

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });
  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}
