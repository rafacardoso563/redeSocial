// src/services/api.js

import axios from 'axios';

// A URL base do seu backend
// ATENÇÃO: Se você estiver rodando em um dispositivo físico ou emulador,
// 'localhost' não funcionará. Você precisará usar o IP da sua máquina.
// Ex: http://192.168.1.XX:3001
// Para web, 'localhost' funciona.
const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Adiciona um interceptor que será executado antes de cada requisição
api.interceptors.request.use(
  (config) => {
    // Se os dados da requisição são uma instância de FormData (upload de arquivo),
    // o axios/navegador definirá o Content-Type correto com o 'boundary'.
    // Portanto, removemos qualquer 'Content-Type' que possa ter sido definido manualmente.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      // Para todas as outras requisições, garantimos que o Content-Type seja 'application/json'.
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;