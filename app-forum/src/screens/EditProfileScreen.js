// src/screens/EditProfileScreen.js

import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert,
  ScrollView, ActivityIndicator, Image, TouchableOpacity,
  Platform // <-- Adicionar Platform aqui
} from 'react-native';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen = ({ route, navigation }) => {
  const { user: initialUser } = route.params;
  const { signOut } = useContext(AuthContext);

  const [username, setUsername] = useState(initialUser.username);
  const [email, setEmail] = useState(initialUser.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState(initialUser.profile_picture_url);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') { // Permissões são necessárias apenas para apps nativos
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Desculpe, precisamos de permissões de galeria para isso funcionar!');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImageUri(result.assets[0].uri);
      setProfilePictureUrl(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setProfilePictureUrl(null);
    setSelectedImageUri(null); // Garante que a remoção sobreponha uma seleção de imagem anterior.
  };

  const handleUpdateProfile = async () => {
    if (newPassword && newPassword !== confirmNewPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação de senha não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você não está logado.');
        signOut();
        return;
      }

      let finalProfilePictureUrl = profilePictureUrl;
      if (selectedImageUri) {
        const formData = new FormData();

        if (Platform.OS === 'web') {
          // Na web, a URI da imagem é um blob. Precisamos buscá-lo para enviá-lo como um arquivo.
          const response = await fetch(selectedImageUri);
          const blob = await response.blob();
          formData.append('profilePicture', blob, `profile_${initialUser.id}.jpg`);
        } else {
          // Para nativo (iOS/Android), a estrutura com uri, name e type é a correta.
          const filename = selectedImageUri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image';

          formData.append('profilePicture', {
            uri: selectedImageUri,
            name: filename,
            type,
          });
        }

        try {
          const uploadResponse = await api.post('/uploads/profile-picture', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${userToken}`,
            },
          });
          finalProfilePictureUrl = uploadResponse.data.imageUrl;
        } catch (uploadError) {
          console.error('Erro ao fazer upload da imagem de perfil:', uploadError.response?.data || uploadError.message);
          Alert.alert('Erro de Upload', 'Não foi possível fazer upload da foto de perfil. Verifique o console para detalhes.');
          setIsSubmitting(false);
          return;
        }
      }

      const updateData = {
        username: username.trim() === initialUser.username ? undefined : username.trim(),
        email: email.trim() === initialUser.email ? undefined : email.trim(),
        profile_picture_url: finalProfilePictureUrl === initialUser.profile_picture_url ? undefined : finalProfilePictureUrl,
      };

      if (newPassword) {
        updateData.old_password = oldPassword;
        updateData.new_password = newPassword;
      }

      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([, value]) => value !== undefined)
      );

      if (Object.keys(filteredUpdateData).length === 0 && !selectedImageUri) { // Adicionado !selectedImageUri
        Alert.alert('Aviso', 'Nenhuma alteração detectada para salvar.');
        setIsSubmitting(false);
        return;
      }

      const response = await api.put(
        '/users/me',
        filteredUpdateData,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert('Sucesso', response.data.message);
      navigation.goBack();

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Ocorreu um erro ao atualizar o perfil.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#00370dff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <TouchableOpacity onPress={pickImage} style={styles.profilePictureContainer}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.profilePicture} />
          ) : (
            <Ionicons name="camera-outline" size={80} color="#2cc650ff" style={styles.profilePicturePlaceholder} />
          )}
          <Text style={styles.changePhotoText}>Trocar foto de perfil</Text>
        </TouchableOpacity>
        {profilePictureUrl && (
          <TouchableOpacity onPress={handleRemoveImage} style={styles.removeButton}>
            <Text style={styles.removePhotoText}>Remover foto</Text>
          </TouchableOpacity>
        )}

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

        <Text style={styles.sectionTitle}>Mudar Senha (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha Antiga"
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Nova Senha"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar Nova Senha"
          value={confirmNewPassword}
          onChangeText={setConfirmNewPassword}
          secureTextEntry
        />

        <Button
          title={isSubmitting ? "Salvando..." : "Salvar Alterações"}
          onPress={handleUpdateProfile}
          disabled={isSubmitting}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bfffe5ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#2cc650ff', 
    paddingTop: 40,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00370dff', 
  },
  scrollViewContent: {
    padding: 20,
    alignItems: 'center',
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#3cf570ff', 
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FDE8F0', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    marginTop: 10,
    color: '#3cf570ff', 
    textDecorationLine: 'underline',
  },
  removeButton: {
    marginTop: -10,
    marginBottom: 20,
  },
  removePhotoText: {
    color: '#E11D48', 
    textDecorationLine: 'underline',
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#2cc650ff', 
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00370dff', 
    marginTop: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
    width: '100%',
  },
  saveButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#3cf570ff',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#F9A8D4', 
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EditProfileScreen;