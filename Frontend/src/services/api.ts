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
        const errorMessage = typeof respError.detail === 'object' 
          ? JSON.stringify(respError.detail) 
          : respError.detail;
        throw new Error(errorMessage || 'Error en el login social');
    }
    return response.json();
  },

};

export const userApi = {
  getMe: async () => {
    const response = await authenticatedFetch('/auth/me');
    if (!response.ok) {
      throw new Error('No se pudo obtener el perfil');
    }
    return response.json();
  },

  updateProfile: async (userId: number, data: any) => {
    const response = await authenticatedFetch(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al actualizar el perfil');
    }
    return response.json();
  }
};

export const vehicleApi = {
  getVehicles: async () => {
    const response = await authenticatedFetch('/vehicles/');
    if (!response.ok) {
      throw new Error('No se pudieron obtener los vehículos');
    }
    return response.json();
  },

  createVehicle: async (data: { license_plate: string; model: string }) => {
    const response = await authenticatedFetch('/vehicles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al registrar el vehículo');
    }
    return response.json();
  },

  updateVehicle: async (id: number, data: any) => {
    const response = await authenticatedFetch(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al actualizar el vehículo');
    }
    return response.json();
  },

  deleteVehicle: async (id: number) => {
    const response = await authenticatedFetch(`/vehicles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error al eliminar el vehículo');
    }
    return response.json();
  }
};

export const parkingApi = {
  getParkings: async () => {
    const response = await authenticatedFetch('/parkings/');
    if (!response.ok) {
      throw new Error('No se pudieron obtener las cocheras');
    }
    return response.json();
  },

  createParking: async (data: { name: string; base_hourly_rate: number }) => {
    const response = await authenticatedFetch('/parkings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al registrar la cochera');
    }
    return response.json();
  },

  updateParking: async (id: number, data: any) => {
    const response = await authenticatedFetch(`/parkings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al actualizar la cochera');
    }
    return response.json();
  },

  deleteParking: async (id: number) => {
    const response = await authenticatedFetch(`/parkings/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error al eliminar la cochera');
    }
    return response.json();
  },

  getParkingAvailability: async (id_parking: number) => {
    const response = await authenticatedFetch(`/parkings/${id_parking}/availability`);
    if (!response.ok) {
      throw new Error('No se pudo obtener la disponibilidad de la cochera');
    }
    return response.json();
  },

  getAllParkingsAvailability: async () => {
    const response = await authenticatedFetch('/parkings/availability/all');
    if (!response.ok) {
      throw new Error('No se pudo obtener la disponibilidad de las cocheras');
    }
    return response.json();
  }
};

export const bookingApi = {
  createBooking: async (data: { 
    id_vehicle: number; 
    id_parking: number; 
    id_category: number; 
    expected_start_time: string; 
    expected_end_time: string; 
  }) => {
    const response = await authenticatedFetch('/bookings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al crear la reserva');
    }
    return response.json();
  },

  getMyBookings: async () => {
    const response = await authenticatedFetch('/bookings/me');
    if (!response.ok) {
      throw new Error('No se pudieron obtener las reservas');
    }
    return response.json();
  },

  updateBookingStatus: async (id_booking: number, new_status: string) => {
    const response = await authenticatedFetch(`/bookings/${id_booking}/status?new_status=${new_status}`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al actualizar el estado de la reserva');
    }
    return response.json();
  },
};

export const categoryApi = {
  getCategories: async (id_parking: number) => {
    const response = await authenticatedFetch(`/parkings/${id_parking}/categories/`);
    if (!response.ok) {
      throw new Error('No se pudieron obtener las categorías');
    }
    return response.json();
  },

  createCategory: async (id_parking: number, data: { name: string; max_capacity: number; price_multiplier: number }) => {
    const response = await authenticatedFetch(`/parkings/${id_parking}/categories/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al crear la categoría');
    }
    return response.json();
  },

  updateCategory: async (id_parking: number, id_category: number, data: any) => {
    const response = await authenticatedFetch(`/parkings/${id_parking}/categories/${id_category}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al actualizar la categoría');
    }
    return response.json();
  },

  deleteCategory: async (id_parking: number, id_category: number) => {
    const response = await authenticatedFetch(`/parkings/${id_parking}/categories/${id_category}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Error al eliminar la categoría');
    }
    return response.json();
  },
};

export const adminApi = {
  getAllUsers: async () => {
    const response = await authenticatedFetch('/auth/users');
    if (!response.ok) {
      throw new Error('No se pudieron obtener los usuarios');
    }
    return response.json();
  },

  updateUser: async (userId: number, data: any) => {
    const response = await authenticatedFetch(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al actualizar el usuario');
    }
    return response.json();
  },

  deleteUser: async (userId: number) => {
    const response = await authenticatedFetch(`/auth/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Error al eliminar el usuario');
    }
    return response.json();
  }
};
