const API = '/backend/api/v1';
const COMMUNE_STORAGE_KEY = 'sgaec_commune_id';

export function setSelectedCommuneId(id: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(COMMUNE_STORAGE_KEY, id);
  }
}

function tenantHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const communeId = window.localStorage.getItem(COMMUNE_STORAGE_KEY);
  return communeId ? { 'X-Commune-Id': communeId } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: path === '/auth/me' ? {} : tenantHeaders(),
  });
  if (response.status === 401 && path !== '/auth/login') redirectToLogin();
  if (!response.ok) throw new Error(await getError(response));
  return response.json() as Promise<T>;
}

export async function apiGetBlob(path: string): Promise<Blob> {
  return apiGetDownloadBlob(path, 'application/pdf');
}

export async function apiGetDownloadBlob(path: string, expectedType: string): Promise<Blob> {
  const response = await fetch(`${API}${path}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: tenantHeaders(),
  });
  if (response.status === 401) redirectToLogin();
  if (!response.ok) throw new Error(await getError(response));
  if (!response.headers.get('content-type')?.startsWith(expectedType)) {
    throw new Error(`Le service n’a pas renvoyé le format attendu (${expectedType}).`);
  }
  return response.blob();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      ...tenantHeaders(),
      'Content-Type': 'application/json',
      'X-SGAEC-Request': '1',
    },
    body: JSON.stringify(body),
  });
  if (response.status === 401 && path !== '/auth/login') redirectToLogin();
  if (!response.ok) throw new Error(await getError(response));
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      ...tenantHeaders(),
      'Content-Type': 'application/json',
      'X-SGAEC-Request': '1',
    },
    body: JSON.stringify(body),
  });
  if (response.status === 401) redirectToLogin();
  if (!response.ok) throw new Error(await getError(response));
  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      ...tenantHeaders(),
      'X-SGAEC-Request': '1',
    },
  });
  if (response.status === 401) redirectToLogin();
  if (!response.ok) throw new Error(await getError(response));
  return response.json() as Promise<T>;
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/connexion') {
    window.location.assign('/connexion');
  }
}

async function getError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((item: { msg?: string }) => item.msg || 'Donnée invalide').join(' · ');
  } catch { /* Réponse non JSON */ }
  return `Erreur HTTP ${response.status}`;
}
