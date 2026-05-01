import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi, saveToken, getToken, removeToken } from '../services/api';

interface AuthContextData {
  user: any;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  socialLogin: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar token guardado al iniciar la app
    const bootstrapAsync = async () => {
      try {
        const userToken = await getToken('access_token');
        if (userToken) {
          setToken(userToken);
          // Traer datos reales del perfil
          const userData = await userApi.getMe();
          setUser(userData);
        }
      } catch (e) {
        console.error('Error restaurando el token o perfil:', e);
        // Si el token es inválido, limpiar
        await removeToken('access_token');
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.access_token) {
        await saveToken('access_token', response.access_token);
        
        // Obtener perfil completo tras login exitoso ANTES de setear el token
        // Esto evita que la pantalla parpadee hacia Home antes de saber el rol
        const userData = await userApi.getMe();
        setUser(userData);
        setToken(response.access_token);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      await authApi.register(data);
    } catch (error) {
      throw error;
    }
  };

  const socialLogin = async (data: any) => {
    try {
      const response = await authApi.socialLogin(data);
      if (response.access_token) {
        await saveToken('access_token', response.access_token);
        
        // Obtener perfil completo ANTES de setear el token
        const userData = await userApi.getMe();
        setUser(userData);
        setToken(response.access_token);
      }
    } catch (error) {
       console.error("❌ Error en socialLogin Context:", error);
       throw error;
    }
  };

  const logout = async () => {
    await removeToken('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, socialLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
