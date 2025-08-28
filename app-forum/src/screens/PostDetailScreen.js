import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Button, ActivityIndicator, Alert, Image, TouchableOpacity, FlatList
} from 'react-native';
import api from '../services/api';
import AuthContext from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  // Use o AuthContext para obter dados do usuário e token
  const { user, userToken, signOut } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchPostAndComments();
  }, [postId]); // Adicionado postId como dependência para recarregar se o post mudar (ex: navegação entre posts)

  const fetchPostAndComments = async () => {
    setLoading(true);
    try {
      const postResponse = await api.get(`/posts/${postId}`);
      setPost(postResponse.data);

      const commentsResponse = await api.get(`/comments/${postId}`);
      setComments(commentsResponse.data);

    } catch (error) {
      console.error('Erro ao buscar detalhes do post/comentários:', error.response?.data || error.message);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do post.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newCommentContent.trim()) {
      Alert.alert('Erro', 'O comentário não pode ser vazio.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      if (!userToken) {
        Alert.alert('Erro de Autenticação', 'Você precisa estar logado para comentar.');
        signOut();
        return;
      }

      await api.post(
        `/comments/${postId}`,
        { content: newCommentContent },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert('Sucesso', 'Comentário adicionado!');
      setNewCommentContent('');
      fetchPostAndComments();
    } catch (error) {
      console.error('Erro ao criar comentário:', error.response?.data || error.message);
      Alert.alert('Erro ao Comentar', error.response?.data?.message || 'Ocorreu um erro ao adicionar o comentário.');
      if (error.response?.status === 401 || error.response?.status === 403) {
        signOut();
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
  const confirmar = window.confirm("Você tem certeza que deseja excluir este comentário?");
  if (!confirmar) return;

  try {
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      alert("Sua sessão expirou.");
      signOut();
      return;
    }

    // Chama o backend para excluir no MySQL
    await api.delete(`/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    // Atualiza o estado local
    setComments(prev => prev.filter(c => c.id !== commentId));
    setPost(prev => prev ? { ...prev, comments_count: Math.max(0, prev.comments_count - 1) } : null);

    alert("Comentário excluído com sucesso.");
  } catch (error) {
    console.error("Erro ao excluir comentário:", error.response?.data || error.message);
    alert("Erro: não foi possível excluir.");
    if (error.response?.status === 401 || error.response?.status === 403) {
      signOut();
    }
  }
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3cf570ff" />
        <Text>Carregando post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Post não encontrado.</Text>
      </View>
    );
  }

  const renderCommentItem = ({ item }) => (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAuthorContainer}>
          {item.profile_picture_url ? (
            <Image source={{ uri: `http://localhost:3001${item.profile_picture_url}` }} style={styles.commentProfilePicture} />
          ) : (
            <Ionicons name="person-circle" size={30} color="#2cc650ff" style={styles.commentProfilePicturePlaceholder} />
          )}
          <Text style={styles.commentUsername}>{item.username}</Text>
        </View>
        <View style={styles.commentActionsContainer}>
          <Text style={styles.commentTimestamp}>
            {new Date(item.created_at).toLocaleString('pt-BR')}
          </Text>
          {/* Usa user.id do AuthContext e optional chaining (?) para segurança */}
          {user?.id === item.user_id && (
            <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color="#E11D48" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#00370dff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Post</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Detalhes do Post */}
        <View style={styles.postDetailCard}>
          <View style={styles.postHeader}>
            {post.profile_picture_url ? (
              <Image source={{ uri: `http://localhost:3001${post.profile_picture_url}` }} style={styles.profilePicture} />
            ) : (
              <Ionicons name="person-circle" size={40} color="#ccc" style={styles.profilePicturePlaceholder} />
            )}
            <Text style={styles.postUsername}>{post.username}</Text>
          </View>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postContent}>{post.content}</Text>
          {post.image_url && <Image source={{ uri: `http://localhost:3001${post.image_url}` }} style={styles.postImage} />}
          <View style={styles.postStatsContainer}>
            <Text style={styles.postStats}>{post.likes_count} Curtidas</Text>
            <Text style={styles.postStats}>{post.comments_count} Comentários</Text>
          </View>
        </View>

        {/* Seção de Comentários */}
        <Text style={styles.commentsTitle}>Comentários</Text>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCommentItem}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.noCommentsText}>Nenhum comentário ainda. Seja o primeiro!</Text>}
        />

        {/* Campo para Adicionar Comentário */}
        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Adicione um comentário..."
            value={newCommentContent}
            onChangeText={setNewCommentContent}
            multiline
          />
          <Button
            title={isSubmittingComment ? "Enviando..." : "Comentar"}
            onPress={handleCreateComment}
            disabled={isSubmittingComment}
          />
        </View>
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
    borderBottomColor: '#FBCFE8', 
    paddingTop: 40, // Para iOS SafeArea
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
    paddingBottom: 20, // Espaçamento inferior para a scrollview
  },
  postDetailCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,

  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicture: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profilePicturePlaceholder: {
    marginRight: 10,
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#638b6eff',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#00370dff', 
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#638b6eff', 
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginTop: 10,
    resizeMode: 'cover',
  },
  postStatsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE8F0', 
    paddingTop: 10,
    justifyContent: 'space-around',
  },
  postStats: {
    fontSize: 14,
    color: '#638b6eff', 
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    color: '#00370dff', 
  },
  commentCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    
  },
  commentProfilePicture: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  commentProfilePicturePlaceholder: {
    marginRight: 8,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#00370dff', 
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#638b6eff',
  },
  commentAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 10,
  },
  commentContent: {
    fontSize: 14,
    color: '#638b6eff', 
    marginLeft: 38, // Alinha com o conteúdo do post, abaixo da foto/nome
  },

  addCommentContainer: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#FBCFE8', 
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#bfffe5ff', 
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3cf570ff', 
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#F9A8D4', 
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PostDetailScreen;