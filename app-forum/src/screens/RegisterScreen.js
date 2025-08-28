// src/screens/RegisterScreen.js

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import api from '../services/api'; // Importa a instância do Axios

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      // console.log('Cadastro bem-sucedido:', response.data);
      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso! Faça login para continuar.');
      navigation.navigate('Login'); // Volta para a tela de login após o cadastro
    } catch (error) {
      console.error('Erro no cadastro:', error.response?.data || error.message);
      Alert.alert('Erro no Cadastro', error.response?.data?.message || 'Ocorreu um erro ao tentar cadastrar.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crie sua conta</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome de Usuário"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.botao} onPress={handleRegister}>
        <Text style={styles.botaoTexto}>Cadastrar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>Já tem uma conta? Faça login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#bfffe5ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#00370dff', 
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#2cc650ff',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#FFFFFF', // Fundo branco para contraste
  },
  loginText: {
    marginTop: 20,
    color: '#3cf570ff', 
    textDecorationLine: 'underline',
  },
  botao: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#3cf570ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  
  botaoTexto: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  }
});

export default RegisterScreen;