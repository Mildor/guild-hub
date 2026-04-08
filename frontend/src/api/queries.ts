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

export interface RaiderIoProfile {
  name: string;
  mythic_plus_scores_by_season: { scores: { all: number } }[];
  raid_progression: Record<string, { summary: string }>;
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

const deleteMyAccount = async () => {
  const { data } = await api.delete('/users/me');
  return data;
};

export const useDeleteMyAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      await queryClient.clear();
    },
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
      await queryClient.invalidateQueries({
        queryKey: ['characters'],
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

const setRosterCharacter = async (characterId: string) => {
  const { data } = await api.patch(`/characters/${characterId}/roster`);
  return data;
};

export const useSetRosterCharacter = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setRosterCharacter,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['characters', userId] }),
        queryClient.invalidateQueries({ queryKey: ['characters', 'roster'] }),
      ]);
    },
    onError: (error) => {
      console.error('❌ Erreur setting roster character:', error);
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

export const useGetRaiderIoProfile = (characterId?: string) => {
  return useQuery({
    queryKey: ['raiderio', characterId],
    queryFn: async () => {
      const { data } = await api.get<RaiderIoProfile | null>(
        `/characters/${characterId}/raiderio`,
      );
      return data;
    },
    enabled: !!characterId,
    staleTime: 5 * 60 * 1000,
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
      // Invalider tous les caches d'événements
      await queryClient.invalidateQueries({ queryKey: ['events'] });
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
  const { data } = await api.patch<CharacterWithUser>(`/characters/${id}/guild-roster`, { inRoster });
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

// ==================== STRATEGIES ====================

export interface Strategy {
  id: string;
  bossName: string;
  raidName: string;
  positioningImageUrl: string | null;
  generalMechanics: string;
  tankNotes: string | null;
  healerNotes: string | null;
  dpsNotes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    battletag: string;
  };
}

export interface CreateStrategyPayload {
  bossName: string;
  raidName: string;
  positioningImageUrl?: string;
  generalMechanics: string;
  tankNotes?: string;
  healerNotes?: string;
  dpsNotes?: string;
  imageFile?: File;
}

export interface UpdateStrategyPayload extends Partial<CreateStrategyPayload> {}

export const useGetStrategies = () => {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const { data } = await api.get<Strategy[]>('/strategies');
      return data;
    },
    retry: 1,
  });
};

export const useCreateStrategy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStrategyPayload & { imageFile?: File }) => {
      const { imageFile, ...strategyData } = payload;

      if (imageFile) {
        // Si fichier présent, envoyer FormData
        const formData = new FormData();
        formData.append('bossName', strategyData.bossName);
        formData.append('raidName', strategyData.raidName);
        formData.append('generalMechanics', strategyData.generalMechanics);
        if (strategyData.positioningImageUrl) {
          formData.append('positioningImageUrl', strategyData.positioningImageUrl);
        }
        if (strategyData.tankNotes) formData.append('tankNotes', strategyData.tankNotes);
        if (strategyData.healerNotes) formData.append('healerNotes', strategyData.healerNotes);
        if (strategyData.dpsNotes) formData.append('dpsNotes', strategyData.dpsNotes);
        formData.append('imageFile', imageFile);

        const { data } = await api.post<Strategy>('/strategies', formData);
        return data;
      } else {
        // Sinon, envoyer JSON normal
        const { data } = await api.post<Strategy>('/strategies', strategyData);
        return data;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
};

export const useUpdateStrategy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: (UpdateStrategyPayload & { id: string; imageFile?: File }) | (UpdateStrategyPayload & { id: string })) => {
      const p = payload as any;
      const { imageFile, ...strategyData } = p;

      if (imageFile) {
        // Si fichier présent, envoyer FormData
        const formData = new FormData();
        if (strategyData.bossName) formData.append('bossName', strategyData.bossName);
        if (strategyData.raidName) formData.append('raidName', strategyData.raidName);
        if (strategyData.generalMechanics) formData.append('generalMechanics', strategyData.generalMechanics);
        if (strategyData.positioningImageUrl) {
          formData.append('positioningImageUrl', strategyData.positioningImageUrl);
        }
        if (strategyData.tankNotes) formData.append('tankNotes', strategyData.tankNotes);
        if (strategyData.healerNotes) formData.append('healerNotes', strategyData.healerNotes);
        if (strategyData.dpsNotes) formData.append('dpsNotes', strategyData.dpsNotes);
        formData.append('imageFile', imageFile);

        const { data } = await api.patch<Strategy>(`/strategies/${id}`, formData);
        return data;
      } else {
        // Sinon, envoyer JSON normal
        const { data } = await api.patch<Strategy>(`/strategies/${id}`, strategyData);
        return data;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
};

export const useDeleteStrategy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/strategies/${id}`);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });
};

// ==================== POLLS ====================

export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  user: {
    id: string;
    battletag: string;
  };
  option: {
    id: string;
    text: string;
  };
}

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  votes?: PollVote[];
}

export interface Poll {
  id: string;
  question: string;
  description: string | null;
  createdAt: string;
  isActive: boolean;
  createdById: string;
  createdBy: {
    id: string;
    battletag: string;
  };
  options: PollOption[];
  votes: PollVote[];
}

export interface CreatePollPayload {
  question: string;
  description?: string;
  options: string[];
}

export interface VotePollPayload {
  pollId: string;
  optionId: string;
}

export interface WowTokenPricePoint {
  id: string;
  price: number;
  createdAt: string;
}

export interface WowTokenResponse {
  currentPrice: number | null;
  history: WowTokenPricePoint[];
}

export const useGetWowToken = () => {
  return useQuery({
    queryKey: ['wow-token'],
    queryFn: async () => {
      const { data } = await api.get<WowTokenResponse>('/blizzard/token');
      return data;
    },
    retry: 1,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useGetPolls = () => {
  return useQuery({
    queryKey: ['polls'],
    queryFn: async () => {
      const { data } = await api.get<Poll[]>('/polls');
      return data;
    },
    retry: 1,
  });
};

export const useCreatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePollPayload) => {
      const { data } = await api.post<Poll>('/polls', payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};

export const useVotePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: VotePollPayload) => {
      const { data } = await api.post(`/polls/${pollId}/vote`, { optionId });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};

export const useTogglePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pollId: string) => {
      const { data } = await api.patch(`/polls/${pollId}/toggle`);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};

// ==================== USERS ====================

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
