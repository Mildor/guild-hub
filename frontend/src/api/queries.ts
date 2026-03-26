import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/auth';
import type { Character } from '@/types/character';

// Récupère l'utilisateur actuel
export const useGetMe = () => {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/auth/me');
      return data;
    },
    enabled: !!token, // Ne faire la requête que si token existe
    retry: 1, // Retry une fois en cas d'erreur
  });
};

// Récupère les personnages d'un utilisateur
export const useGetMyCharacters = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['characters', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data } = await api.get<Character[]>(`/characters/user/${userId}`);
      return data;
    },
    enabled: !!userId, // Ne faire la requête que si userId existe
    retry: 1,
    staleTime: 0, // Les données sont toujours "stale", force le refetch
  });
};

// Synchronise les personnages avec l'API Blizzard
const syncCharacters = async () => {
  const { data } = await api.post('/characters/sync');
  return data;
};

// Mutation pour synchroniser les caractères
export const useSyncCharacters = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncCharacters,
    onSuccess: async () => {
      // Refetch immédiatement les personnages
      await queryClient.refetchQueries({
        queryKey: ['characters', userId],
      });
    },
    onError: (error) => {
      console.error('❌ Erreur sync:', error);
    },
  });
};

// Lance un personnage en tant que Main
const setMainCharacter = async (characterId: string) => {
  const { data } = await api.patch(`/characters/${characterId}/main`);
  return data;
};

// Mutation pour définir un personnage comme Main
export const useSetMainCharacter = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setMainCharacter,
    onSuccess: async () => {
      // Refetch immédiatement les personnages
      await queryClient.refetchQueries({
        queryKey: ['characters', userId],
      });
    },
    onError: (error) => {
      console.error('❌ Erreur setting main:', error);
    },
  });
};
