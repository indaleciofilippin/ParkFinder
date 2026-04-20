import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, saveToken, getToken, removeToken } from '../services/api';

interface AuthContextData {
  user: any;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  socialLogin: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar token guardado al iniciar la app
    const bootstrapAsync = async () => {
      let userToken;
      try {
        userToken = await getToken('access_token');
        if (userToken) {
          // Aquí podríamos decodificar el JWT o llamar a un endpoint /me para traer datos
          setToken(userToken);
          setUser({ email: 'user@placeholder.com' }); // Simificado para demo
        }
      } catch (e) {
        console.error('Error restaurando el token:', e);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.access_token) {
        await saveToken('access_token', response.access_token);
        setToken(response.access_token);
        setUser({ email }); // Se podría extraer más del JWT si tuviera claims
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      await authApi.register(data);
      // Tras registrar, usualmente autologueas o lo mandas al login
    } catch (error) {
      throw error;
    }
  };

  const socialLogin = async (data: any) => {
    try {
      const response = await authApi.socialLogin(data);
      if (response.access_token) {
        await saveToken('access_token', response.access_token);
        setToken(response.access_token);
        setUser({ 
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name
        });
      }
    } catch (error) {
       throw error;
    }
  };

  const logout = async () => {
    await removeToken('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
