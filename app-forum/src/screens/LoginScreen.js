import React, { useState, useContext } from 'react'; // Importa useContext
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import api from '../services/api';
import AuthContext from '../context/AuthContext'; // Importa o AuthContext

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { signIn } = useContext(AuthContext); // Pega a função signIn do contexto

  const handleLogin = async () => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      Alert.alert('Sucesso', 'Login realizado com sucesso!');
      // Chamar signIn para salvar o token e atualizar o estado global
      await signIn(response.data.token, response.data.user); // Passa o token e os dados do usuário
      // Não precisa de navigation.replace('Home') aqui, o AppNavigator fará a transição
    } catch (error) {
      console.error('Erro no login:', error.response?.data || error.message);
      Alert.alert('Erro no Login', error.response?.data?.message || 'Ocorreu um erro ao tentar fazer login.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo!</Text>
      <TextInput
        style={styles.input}
        placeholder="Usuário ou E-mail"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.botao} onPress={handleLogin}>
        <Text style={styles.botaoTexto}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Não tem uma conta? Cadastre-se</Text>
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
  registerText: {
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

export default LoginScreen;