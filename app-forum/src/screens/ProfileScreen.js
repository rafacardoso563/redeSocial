// src/screens/ProfileScreen.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, Button, Image, TouchableOpacity, FlatList
} from 'react-native';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const { signOut } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [favoritePosts, setFavoritePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myPosts');

  useEffect(() => {
    // Adicionar um listener para focar na tela e recarregar os dados
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfileData();
    });
    return unsubscribe; // Limpar o listener
  }, [navigation]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Token de autenticação não encontrado.');
        signOut();
        return;
      }

      const userResponse = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setUser(userResponse.data);

      const myPostsResponse = await api.get('/users/me/posts', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setMyPosts(myPostsResponse.data);

      const favoritePostsResponse = await api.get('/users/me/favorites', {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      // CORREÇÃO AQUI: Use favoritePostsResponse.data
      setFavoritePosts(favoritePostsResponse.data); // LINHA CORRIGIDA

    } catch (error) {
      console.error('Erro ao buscar dados do perfil:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível carregar o perfil.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    const confirmar = window.confirm(
      "Você tem certeza que deseja excluir este post? Esta ação não pode ser desfeita."
    );
  
    if (!confirmar) return; // Se cancelar, não faz nada
  
    try {
      const userToken = await AsyncStorage.getItem("userToken");
      await api.delete(`/posts/${postId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
  
      setMyPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
      alert("Post excluído com sucesso.");
    } catch (error) {
      console.error(
        "Erro detalhado ao excluir o post:",
        JSON.stringify(error.response || error, null, 2)
      );
  
      let errorMessage = "Não foi possível excluir o post.";
      if (error.response) {
        const { status, data } = error.response;
        const serverMessage =
          data?.message ||
          (typeof data === "string"
            ? data.substring(0, 100)
            : "Erro no servidor.");
        errorMessage = `Erro ${status}: ${serverMessage}`;
      } else if (error.request) {
        errorMessage = "Não foi possível conectar ao servidor. Verifique a rede.";
      } else {
        errorMessage = `Ocorreu um erro inesperado: ${error.message}`;
      }
  
      alert(errorMessage);
    }
  };

  const renderPostItem = ({ item }) => {
    const navigateToDetail = () => navigation.navigate('PostDetail', { postId: item.id });

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <TouchableOpacity onPress={navigateToDetail} style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.postTitle}>{item.title}</Text>
          </TouchableOpacity>
          {activeTab === 'myPosts' && (
            <TouchableOpacity onPress={() => {
              handleDeletePost(item.id)}} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={22} color="#E11D48" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={navigateToDetail}>
          <Text style={styles.postContentPreview}>{item.content.substring(0, 100)}...</Text>
          <View style={styles.postStatsRow}>
            <Text style={styles.postStatItem}>{item.likes_count} Curtidas</Text>
            <Text style={styles.postStatItem}>{item.comments_count} Comentários</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3cf570ff" />
        <Text>Carregando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Perfil não encontrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#00370dff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile', { user })} style={styles.editButton}>
          <Ionicons name="settings-outline" size={24} color="#3cf570ff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Informações do Usuário */}
        <View style={styles.profileInfoCard}>
          {/* Garante que a URL da imagem esteja completa */}
          {user.profile_picture_url ? (
            <Image source={{ uri: `${api.defaults.baseURL.replace('/api', '')}${user.profile_picture_url}` }} style={styles.profilePicture} />
          ) : (
            <Ionicons name="person-circle" size={100} color="#2cc650ff" style={styles.profilePicturePlaceholder} />
          )}
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.memberSince}>Membro desde: {new Date(user.created_at).toLocaleDateString('pt-BR')}</Text>
        </View>

        {/* Abas de Navegação */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'myPosts' && styles.activeTab]}
            onPress={() => setActiveTab('myPosts')}
          >
            <Text style={[styles.tabText, activeTab === 'myPosts' && styles.activeTabText]}>Meus Posts ({myPosts.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'favorites' && styles.activeTab]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>Favoritos ({favoritePosts.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo da Aba Ativa */}
        {activeTab === 'myPosts' ? (
          myPosts.length > 0 ? (
            <FlatList
              data={myPosts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPostItem}
              scrollEnabled={false}
              contentContainerStyle={styles.postListContent}
            />
          ) : (
            <Text style={styles.noContentText}>Você ainda não fez nenhum post.</Text>
          )
        ) : (
          favoritePosts.length > 0 ? (
            <FlatList
              data={favoritePosts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPostItem}
              scrollEnabled={false}
              contentContainerStyle={styles.postListContent}
            />
          ) : (
            <Text style={styles.noContentText}>Você ainda não favoritou nenhum post.</Text>
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bfffe5ff', 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  editButton: {
    padding: 5,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  profileInfoCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#3cf570ff', 
  },
  profilePicturePlaceholder: {
    marginBottom: 15,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00370dff', 
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#8C7373', 
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: '#8C7373', 
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 15,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3cf570ff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8C7373', 
  },
  activeTabText: {
    color: '#3cf570ff', 
  },
  postListContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    borderColor: '#FDE8F0', 
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  deleteButton: {
    padding: 5,
    marginLeft: 10,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#638b6eff', 
  },
  postContentPreview: {
    fontSize: 14,
    color: '#638b6eff',
    marginBottom: 10,
  },
  postStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#FDE8F0', // Borda rosa bem clara
    paddingTop: 8,
  },
  postStatItem: {
    fontSize: 13,
    color: '#638b6eff', 
  },
  noContentText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#638b6eff', 
    marginHorizontal: 15,
  },
});

export default ProfileScreen;