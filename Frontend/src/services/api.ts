import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.23:8000/api/v1';

export const saveToken = async (key: string, value: string) => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Error saving token', error);
  }
};

export const getToken = async (key: string) => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

export const removeToken = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('Error removing token', error);
  }
};

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getToken('access_token');
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  return response;
};

// API calls
export const authApi = {
  login: async (data: any) => {
    // Para FastAPI OAuth2PasswordRequestForm enviamos en format URL-encoded
    const formData = new URLSearchParams();
    formData.append('username', data.email);
    formData.append('password', data.password);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const respError = await response.json().catch(() => ({}));
      throw new Error(respError.detail || 'Error en el login');
    }
    return response.json();
  },

  register: async (data: any) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const respError = await response.json().catch(() => ({}));
      throw new Error(respError.detail || 'Error en el registro');
    }
    return response.json();
  },

  socialLogin: async (data: any) => {
    const response = await fetch(`${API_URL}/auth/social-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        const respError = await response.json().catch(() => ({}));
        throw new Error(respError.detail || 'Error en el login social');
    }
    return response.json();
  },

  // Ejemplo de ruta protegida (Get Users)
  getUsers: async () => {
    const response = await authenticatedFetch('/auth/users');
    if (!response.ok) {
      throw new Error('No se pudieron obtener los usuarios');
    }
    return response.json();
  }
};
