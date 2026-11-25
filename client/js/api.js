const FITBUDDY_API_URL = 'http://localhost:3000';

function getAuthToken() {
    return sessionStorage.getItem('fitbuddy_token');
}

async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getAuthToken();

    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(
        FITBUDDY_API_URL + path,
        {
            ...options,
            headers
        }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            data?.message || 'Request failed'
        );

        error.status = response.status;
        error.code = data?.code;
        error.data = data;

        throw error;
    }

    return data;
}