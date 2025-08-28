// src/context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Para persistir o token

// Instalar AsyncStorage:
// npx expo install @react-native-async-storage/async-storage

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null); // <-- Adicionar estado para o usuário
  const [isLoading, setIsLoading] = useState(true); // Para carregar o token ao iniciar

  // Função para salvar o token e o usuário (se necessário)
  const signIn = async (token, userData) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      // Salva os dados do usuário no AsyncStorage para persistência
      if (userData && userData.id) {
        // Salva o ID do usuário separadamente para fácil acesso
        await AsyncStorage.setItem('userId', userData.id.toString());
      }
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUserToken(token);
      setUser(userData); // <-- Atualiza o estado do usuário
    } catch (e) {
      console.error('Erro ao salvar token/dados no AsyncStorage', e);
    }
  };

  // Função para remover o token ao fazer logout
  const signOut = async () => {
    try {
      console.log('AuthContext: Iniciando signOut().');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData'); // <-- Remove os dados do usuário
      await AsyncStorage.removeItem('userId'); // <-- Remove o ID do usuário
      setUserToken(null);
      setUser(null); // <-- Limpa o estado do usuário
      console.log('AuthContext: userToken e userData removidos.');
    } catch (e) {
      console.error('AuthContext: Erro ao remover dados do AsyncStorage:', e);
    }
  };
  // Carregar o token ao iniciar o aplicativo
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedUserData = await AsyncStorage.getItem('userData');
        if (token) {
          setUserToken(token);
        }
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
        }
      } catch (e) {
        console.error('Erro ao carregar dados de autenticação do AsyncStorage', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  return (
    <AuthContext.Provider value={{ userToken, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;