// src/screens/HomeScreen.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, Button, StyleSheet, Alert,
  FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, Platform
} from 'react-native';
import AuthContext from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // <-- Novo

const HomeScreen = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);
  // ADICIONE ESTA LINHA PARA DEBUG
  console.log('Objeto USER na HomeScreen:', JSON.stringify(user, null, 2));

  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({});
  const [newPostImage, setNewPostImage] = useState(null); // <-- Alterado: para armazenar o asset da imagem

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      // Usamos o 'user' do AuthContext como a fonte da verdade para o ID do usuário.
      const userId = user ? user.id : null;
      const userToken = await AsyncStorage.getItem('userToken');

      // 1. Buscar a lista principal de posts.
      const postsResponse = await api.get(`/posts?q=${searchTerm}`);

      let initialUserLikes = {};
      let initialUserFavorites = {};

      // 2. Se o usuário estiver logado, buscar seus likes e favoritos.
      //    Isso é feito em um bloco try/catch separado para que, se falhar,
      //    os posts ainda sejam exibidos.
      if (userId && userToken) {
        try {
          const [likesResponse, favoritesResponse] = await Promise.all([
            api.get(`/users/${userId}/likes`, {
              headers: { Authorization: `Bearer ${userToken}` }
            }),
            api.get(`/users/${userId}/favorites`, {
              headers: { Authorization: `Bearer ${userToken}` }
            })
          ]);

          likesResponse.data.forEach(like => { initialUserLikes[like.post_id] = true; });
          favoritesResponse.data.forEach(favorite => { initialUserFavorites[favorite.post_id] = true; });

        } catch (userSpecificError) {
          console.error('Erro ao buscar dados de likes/favoritos do usuário:', userSpecificError.response?.data || userSpecificError.message);
          // Não lançamos um alerta aqui para não interromper a experiência.
          // O usuário ainda verá os posts, mas talvez sem seus likes/favoritos marcados.
        }
      }

      // 3. Atualizar o estado da UI com todos os dados obtidos.
      setPosts(postsResponse.data);
      setUserLikes(initialUserLikes);
      setUserFavorites(initialUserFavorites);

    } catch (error) {
      // Este catch agora lida principalmente com falhas na busca principal de posts.
      console.error('Erro principal ao buscar posts:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível carregar os posts.');
    } finally {
      setLoadingPosts(false);
    }
  }, [user, searchTerm]); // A função será recriada se o usuário (login/logout) ou a busca mudar.

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]); // O useEffect agora depende da função 'fetchPosts' memoizada.

  useEffect(() => {
    // Pedir permissão para acessar a galeria de imagens (só precisa ser feito uma vez)
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Desculpe, precisamos de permissões de galeria para isso funcionar!');
      }
    })();
  }, []); // Array de dependências vazio para garantir que rode apenas uma vez.

  const pickPostImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Ajuste conforme preferir
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setNewPostImage(result.assets[0]);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Erro', 'Título e conteúdo do post não podem ser vazios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você precisa estar logado para criar um post.');
        signOut();
        return;
      }

      let imageUrlToSave = null;
      if (newPostImage) {
        // Faça o upload da imagem do post primeiro
        const formData = new FormData();
        const uri = newPostImage.uri; // e.g., blob:http://localhost:19006/a1b2c3d4-e5f6-7890-1234-567890abcdef
        let fileName = newPostImage.fileName; // Pode ser null/undefined para URIs blob
        let type = newPostImage.mimeType; // e.g., image/jpeg

        // Fallback para fileName e type se não fornecidos pelo ImagePicker (comum na web para URIs blob)
        if (!fileName) {
          fileName = uri.split('/').pop(); // Obtém o ID único da URI blob
          // Tenta inferir a extensão do mimeType se o fileName não tiver uma
          if (type && type.includes('/') && !fileName.includes('.')) {
            fileName += '.' + type.split('/')[1];
          } else if (!type) {
            // Padrão para jpeg se mimeType também estiver faltando
            type = 'image/jpeg';
            if (!fileName.includes('.')) {
              fileName += '.jpeg';
            }
          }
        }
        if (!type) {
          // Fallback para type se ainda estiver faltando
          type = 'image/jpeg';
        }

        // A construção do FormData é diferente para web e nativo
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          console.log('Web upload: Appending blob with name:', fileName, 'and type:', type, 'size:', blob.size);
          formData.append('postImage', blob, fileName);
          // Para depurar o conteúdo do FormData (apenas web)
          for (let pair of formData.entries()) {
            console.log(`FormData entry: ${pair[0]}, ${pair[1] instanceof Blob ? `Blob (${pair[1].type}, ${pair[1].size} bytes)` : pair[1]}`);
          }
        } else {
          formData.append('postImage', {
            uri: uri,
            name: fileName,
            type: type,
          });
        }
        
        try {
          const uploadResponse = await api.post('/uploads/post-image', formData, {
            // É crucial anular o Content-Type para que o navegador/axios
            // o defina como 'multipart/form-data' com o 'boundary' correto.
            headers: {
              'Authorization': `Bearer ${userToken}`,
              'Content-Type': null, // Força a remoção de qualquer 'Content-Type' padrão da instância do axios
            },
          });
          imageUrlToSave = uploadResponse.data.imageUrl; // URL retornada pelo backend
        } catch (uploadError) {
          console.error('Erro ao fazer upload da imagem do post:', uploadError.response?.data || uploadError.message);
          Alert.alert('Erro de Upload', 'Não foi possível fazer upload da imagem do post.');
          setIsSubmitting(false);
          return;
        }
      }

      await api.post(
        '/posts',
        { title: newPostTitle, content: newPostContent, image_url: imageUrlToSave }, // Envia a URL da imagem
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert('Sucesso', 'Post criado com sucesso!');
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage(null); // Limpa a imagem selecionada
      fetchPosts(); // Recarrega os posts
    } catch (error) {
      console.error('Erro ao criar post:', error.response?.data || error.message);
      Alert.alert('Erro ao Criar Post', error.response?.data?.message || 'Ocorreu um erro ao criar o post.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Você precisa estar logado para curtir posts.');
        signOut();
        return;
      }
      const response = await api.post(
        `/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const liked = response.data.liked;
      setUserLikes(prevLikes => ({
        ...prevLikes,
        [postId]: liked,
      }));

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes_count: liked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1) }
            : post
        )
      );

    } catch (error) {
      console.error('Erro ao curtir/descurtir:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível processar o like.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    }
  };

  const handleToggleFavorite = async (postId) => {
    // Atualização otimista da UI para feedback instantâneo
    const originalFavorites = { ...userFavorites };
    setUserFavorites(prevFavorites => ({
      ...prevFavorites,
      [postId]: !prevFavorites[postId],
    }));

    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        Alert.alert('Erro', 'Você precisa estar logado para favoritar posts.');
        setUserFavorites(originalFavorites); // Reverte a UI
        signOut();
        return;
      }
      // A API deve apenas alternar o estado
      await api.post(
        `/posts/${postId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      // A UI já foi atualizada, não é necessário um alerta de sucesso.
    } catch (error) {
      // Reverte a alteração na UI em caso de erro na API
      setUserFavorites(originalFavorites);
      console.error('Erro ao favoritar/desfavoritar:', error.response?.data || error.message);
      Alert.alert('Erro', error.response?.data?.message || 'Não foi possível processar o favorito.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    }
  };

  const handleDeletePost = async (postId) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Você tem certeza que deseja excluir este post?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const userToken = await AsyncStorage.getItem('userToken');
              await api.delete(`/posts/${postId}`, {
                headers: { Authorization: `Bearer ${userToken}` }
              });
              Alert.alert('Sucesso', 'Post excluído.');
              // Remove o post do estado para atualizar a UI sem recarregar tudo
              setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
            } catch (error) {
              // Log detalhado para depuração no console do Metro
              console.error('Erro detalhado ao excluir o post:', JSON.stringify(error.response || error, null, 2));

              // Monta uma mensagem de erro mais informativa para o usuário
              let errorMessage = 'Não foi possível excluir o post.';
              if (error.response) {
                // O servidor respondeu com um status de erro (4xx ou 5xx)
                const { status, data } = error.response;
                const serverMessage = data?.message || (typeof data === 'string' ? data.substring(0, 100) : 'Erro no servidor.');
                errorMessage = `Erro ${status}: ${serverMessage}`;
              } else if (error.request) {
                // A requisição foi feita, mas não houve resposta
                errorMessage = 'Não foi possível conectar ao servidor. Verifique a rede.';
              } else {
                // Erro na configuração da requisição
                errorMessage = `Ocorreu um erro inesperado: ${error.message}`;
              }
              Alert.alert('Erro na Exclusão', errorMessage);
              if (error.response?.status === 401) {
                signOut();
              }
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // No navegador
      if (window.confirm('Deseja realmente sair?')) {
        signOut();
      }
    } else {
      // Em dispositivos móveis
      Alert.alert('Sair', 'Deseja realmente sair?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair', onPress: async () => {
            await signOut();
          }
        }
      ]);
    };
  };

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      {/* Botão de exclusão para o autor do post */}
      {user && user.id === item.author_id && (
        <TouchableOpacity onPress={() => handleDeletePost(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
      )}
      <View style={styles.postHeader}>
        {item.profile_picture_url ? (
          <Image source={{ uri: `http://localhost:3001${item.profile_picture_url}` }} style={styles.profilePicture} />
        ) : (
          <Ionicons name="person-circle" size={40} color="#ccc" style={styles.profilePicturePlaceholder} />
        )}
        <Text style={styles.postUsername}>{item.username}</Text>
      </View>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent}>{item.content}</Text>
      {item.image_url && <Image source={{ uri: `http://localhost:3001${item.image_url}` }} style={styles.postImage} />}
      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.interactionButton} onPress={() => handleToggleLike(item.id)}>
          <Ionicons
            name={userLikes[item.id] ? 'heart' : 'heart-outline'}
            size={24}
            color={userLikes[item.id] ? '#3cf570ff' : '#5F5F5F'}
          />
          <Text style={styles.interactionText}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
          <Ionicons name="chatbubble-outline" size={24} color="#5F5F5F" />
          <Text style={styles.interactionText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.interactionButton} onPress={() => handleToggleFavorite(item.id)}>
          <Ionicons
            name={userFavorites[item.id] ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={userFavorites[item.id] ? '#EC4899' : '#5F5F5F'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Restante do conteúdo da sua HomeScreen */}
      <View style={styles.header}>
        <View>
          <Text style={styles.mainTitle}>Fórum do App</Text>
          {user && <Text style={styles.welcomeText}>Olá, {user.username}!</Text>}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={30} color="#3cf570ff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar posts por título ou conteúdo..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={fetchPosts}
        />
        <TouchableOpacity onPress={fetchPosts} style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Seção para criar novo post */}
      <View style={styles.createPostContainer}>
        <TextInput
          style={styles.input}
          placeholder="Título do seu post"
          value={newPostTitle}
          onChangeText={setNewPostTitle}
        />
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="O que você quer compartilhar?"
          value={newPostContent}
          onChangeText={setNewPostContent}
          multiline
        />
        <TouchableOpacity onPress={pickPostImage} style={styles.imagePickerButton}>
          <Ionicons name="image-outline" size={24} color="#3cf570ff" />
          <Text style={styles.imagePickerButtonText}>Adicionar Imagem</Text>
        </TouchableOpacity>
        {newPostImage && (
          <Image source={{ uri: newPostImage.uri }} style={styles.previewImage} />
        )}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleCreatePost}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? "Publicando..." : "Criar Post"}</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Posts */}
      {loadingPosts ? (
        <ActivityIndicator size="large" color="#3cf570ff" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPostItem}
          contentContainerStyle={styles.postList}
          ListEmptyComponent={<Text style={styles.noPostsText}>Nenhum post encontrado. Tente ajustar sua pesquisa ou seja o primeiro a postar!</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    backgroundColor: '#bfffe5ff', 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 40, // Área segura para iOS
    paddingBottom: 15,
    backgroundColor: '#fff',
    // Borda removida, usará sombra para separação
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  mainTitle: {
    fontSize: 26, // Um pouco maior
    fontWeight: 'bold',
    color: '#00370dff', 
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    marginRight: 15,
  },
  logoutButton: { // Novo estilo para logout
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FDE8F0', 
  },
  logoutButtonText: { // Novo estilo para o texto de logout
    color: '#BE185D', // Tom de magenta escuro
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12, // Mais arredondado
    marginHorizontal: 15,
    marginTop: 20,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Sombra mais suave
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    padding: 12, // Mais preenchimento
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3cf570ff', 
    padding: 10, // Mais preenchimento
    borderRadius: 8, // Mais arredondado
  },
  createPostContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 20, // Margem consistente
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, // Sombra mais suave
    shadowRadius: 5,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2cc650ff', 
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#bfffe5ff', 
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8F0', 
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  imagePickerButtonText: {
    marginLeft: 10,
    color: '#3cf570ff', 
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 180, // Um pouco mais alto
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  submitButton: { // Novo estilo para o botão de enviar
    backgroundColor: '#3cf570ff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: { // Novo estilo para o botão desabilitado
    backgroundColor: '#F9A8D4',
  },
  submitButtonText: { // Novo estilo para o texto do botão
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postList: {
    paddingHorizontal: 15,
    paddingBottom: 20, // Adiciona preenchimento na parte inferior
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 20, // Mais preenchimento
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, // Sombra mais suave
    shadowRadius: 5,
    elevation: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 5, // Aumenta a área de toque
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profilePicture: {
    width: 44, // Um pouco maior
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  profilePicturePlaceholder: {
    marginRight: 12,
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#00370dff', // Tom de marrom-rosado escuro
  },
  postTitle: {
    fontSize: 20, // Maior
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#00370dff', // Tom de marrom-rosado escuro
  },
  postContent: {
    fontSize: 16, // Maior
    lineHeight: 24, // Mais altura de linha
    color: '#638b6eff',
  },
  postImage: {
    width: '100%',
    height: 220, // Imagem mais alta
    borderRadius: 8,
    marginTop: 15,
    resizeMode: 'cover',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#FDE8F0', // Borda rosa bem clara
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#638b6eff', 
    fontWeight: '500',
  },
  noPostsText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#638b6eff', 
  },
  welcomeText: {
    fontSize: 14,
    color: '#638b6eff', 
  },
});

export default HomeScreen;