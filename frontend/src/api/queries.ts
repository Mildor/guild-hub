import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { AppRole, type User } from '@/types/auth';
import type { Character } from '@/types/character';

export interface CharacterWithUser extends Character {
  user: {
    id: string;
    battletag: string;
  };
}

export interface AdminUser {
  id: string;
  battletag: string;
  appRole: AppRole;
  createdAt: string;
}

export interface EventWithMeta {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    battletag: string;
  };
  _count: {
    attendances: number;
  };
}

export type AttendanceStatus = 'ACCEPTED' | 'TENTATIVE' | 'LATE' | 'DECLINED';

export interface EventAttendance {
  eventId: string;
  userId: string;
  characterId: string | null;
  status: AttendanceStatus;
  user: {
    id: string;
    battletag: string;
  };
  character: Character | null;
}

export interface EventDetail {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    battletag: string;
  };
  attendances: EventAttendance[];
}

export interface CreateEventPayload {
  title: string;
  description: string;
  eventDate: string;
  autoInviteRoster?: boolean;
}

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

export const useGetRoster = () => {
  return useQuery({
    queryKey: ['characters', 'roster'],
    queryFn: async () => {
      const { data } = await api.get<CharacterWithUser[]>('/characters/roster');
      return data;
    },
    retry: 1,
  });
};

export const useGetAllCharacters = (enabled = true) => {
  return useQuery({
    queryKey: ['characters', 'all'],
    queryFn: async () => {
      const { data } = await api.get<CharacterWithUser[]>('/characters/all');
      return data;
    },
    enabled,
    retry: 1,
  });
};

const deleteCharacter = async (id: string) => {
  const { data } = await api.delete(`/characters/${id}`);
  return data;
};

export const useDeleteCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCharacter,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['characters', 'all'] });
    },
  });
};

export const useGetAllEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data } = await api.get<EventWithMeta[]>('/events');
      return data;
    },
    retry: 1,
  });
};

export const useGetUpcomingEvents = () => {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: async () => {
      const { data } = await api.get<EventWithMeta[]>('/events/upcoming');
      return data;
    },
    retry: 1,
  });
};

export const useGetEvent = (id: string) => {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data } = await api.get<EventDetail>(`/events/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 15000,
    retry: 1,
  });
};

export interface UpsertAttendancePayload {
  eventId: string;
  status: AttendanceStatus;
  characterId?: string;
}

const upsertAttendance = async (payload: UpsertAttendancePayload) => {
  const { data } = await api.put<EventAttendance>('/attendances', payload);
  return data;
};

export const useUpsertAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertAttendance,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
    },
  });
};

const createEvent = async (payload: CreateEventPayload) => {
  const { data } = await api.post<EventWithMeta>('/events', payload);
  return data;
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events', 'upcoming'] });
    },
  });
};

const deleteEvent = async (id: string) => {
  const { data } = await api.delete(`/events/${id}`);
  return data;
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

const toggleRosterStatus = async ({ id, inRoster }: { id: string; inRoster: boolean }) => {
  const { data } = await api.patch<CharacterWithUser>(`/characters/${id}/roster`, { inRoster });
  return data;
};

export const useToggleRoster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleRosterStatus,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters', 'roster'] }),
        queryClient.invalidateQueries({ queryKey: ['characters', 'all'] }),
      ]);
    },
  });
};

export const useGetAllUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<AdminUser[]>('/users');
      return data;
    },
    retry: 1,
  });
};

const updateUserRole = async ({ id, role }: { id: string; role: AppRole }) => {
  const { data } = await api.patch<AdminUser>(`/users/${id}/role`, { role });
  return data;
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
