import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AppRole, type SharedProfile, type User } from '@/types/auth';
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

export interface FailedLoginAttempt {
  id: string;
  provider: string;
  identifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface FailedLoginAttemptsResponse {
  items: FailedLoginAttempt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export interface RaiderIoGuildProfile {
  name: string;
  realm: string;
  raid_progression?: Record<string, { summary: string }>;
  raid_rankings?: Record<string, unknown>;
}

export interface RaiderIoGuildLeaderboardEntry {
  characterId: string;
  name: string;
  realm: string;
  class: string;
  avatarUrl: string | null;
  battletag: string;
  rioScore: number;
  bestKeyLevel: number | null;
}

export interface RaiderIoGuildUnlinkedMember {
  name: string;
  realm: string;
  class: string | null;
  guildRank: number | null;
}

export interface BlizzardRealmOption {
  slug: string;
  name: string;
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

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  eventDate?: string;
}

export interface CreateCharacterPayload {
  userId: string;
  name: string;
  realm: string;
  class: string;
  activeSpec: string;
  gameRole: 'TANK' | 'HEALER' | 'DPS';
}

export interface UpdateCharacterPayload {
  ilvl?: number;
  activeSpec?: string;
  gameRole?: 'TANK' | 'HEALER' | 'DPS';
  isMain?: boolean;
}

export interface SharedAccountConfig {
  userId: string;
  isSharedAccount: boolean;
}

export interface SharedProfileAssignment {
  characterId: string;
  sharedProfile: SharedProfile | null;
}

// Récupère l'utilisateur actuel
export const useGetMe = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/auth/me');
      return data;
    },
    retry: false,
  });
};

export const useGetBlizzardRealms = () => {
  return useQuery({
    queryKey: ['blizzard', 'realms'],
    queryFn: async () => {
      const { data } = await api.get<BlizzardRealmOption[]>('/blizzard/realms');
      return data;
    },
    staleTime: 1000 * 60 * 60,
  });
};

const deleteMyAccount = async () => {
  const { data } = await api.delete('/users/me');
  return data;
};

const deleteUserByAdmin = async (id: string) => {
  const { data } = await api.delete(`/users/${id}`);
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

export const useDeleteUserByAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserByAdmin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useGetMySharedAccountConfig = () => {
  return useQuery({
    queryKey: ['users', 'me', 'shared-account'],
    queryFn: async () => {
      const { data } = await api.get<SharedAccountConfig>('/users/me/shared-account');
      return data;
    },
  });
};

const updateMySharedAccountConfig = async (isSharedAccount: boolean) => {
  const { data } = await api.patch<SharedAccountConfig>('/users/me/shared-account', {
    isSharedAccount,
  });
  return data;
};

export const useUpdateMySharedAccountConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMySharedAccountConfig,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['users', 'me', 'shared-account'] }),
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
      ]);
    },
  });
};

const assignMySharedProfiles = async (assignments: SharedProfileAssignment[]) => {
  const { data } = await api.patch<Character[]>('/characters/shared-profiles', {
    assignments,
  });
  return data;
};

export const useAssignMySharedProfiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignMySharedProfiles,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['professions'] }),
      ]);
    },
  });
};

export const useGetAllMyCharactersForSharedConfig = (
  userId: string | null | undefined,
) => {
  return useQuery({
    queryKey: ['characters', userId, 'shared-config-all'],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const { data } = await api.get<Character[]>(
        `/characters/user/${userId}/all-for-shared-config`,
      );
      return data;
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 0,
  });
};

// Récupère les personnages d'un utilisateur
export const useGetMyCharacters = (
  userId: string | null | undefined,
  activeSharedProfile?: SharedProfile | null,
) => {
  return useQuery({
    queryKey: ['characters', userId, activeSharedProfile ?? 'none'],
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
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['characters'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['professions'],
        }),
      ]);
    },
    onError: (error) => {
      console.error('❌ Erreur sync:', error);
    },
  });
};

export interface SyncAllCharactersResult {
  totalUsers: number;
  processedUsers: number;
  syncedCharacters: number;
  failedUsers: Array<{
    userId: string;
    battletag: string;
    reason: string;
  }>;
}

const syncAllCharacters = async () => {
  const { data } = await api.post<SyncAllCharactersResult>('/characters/sync-all');
  return data;
};

export const useSyncAllCharacters = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncAllCharacters,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['professions'] }),
      ]);
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

const createCharacter = async (payload: CreateCharacterPayload) => {
  const { data } = await api.post<CharacterWithUser>('/characters', payload);
  return data;
};

export const useCreateCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCharacter,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['characters', 'roster'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
  });
};

const updateCharacter = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateCharacterPayload;
}) => {
  const { data } = await api.patch<CharacterWithUser>(`/characters/${id}`, payload);
  return data;
};

export const useUpdateCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCharacter,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['characters', 'roster'] }),
      ]);
    },
  });
};

export const useSetRosterCharacter = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setRosterCharacter,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['characters'] }),
        queryClient.invalidateQueries({ queryKey: ['characters', userId] }),
        queryClient.invalidateQueries({ queryKey: ['characters', 'all'] }),
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

export const useGetGuildProfile = (realm: string, name: string) => {
  return useQuery({
    queryKey: ['raiderio', 'guild', 'profile', realm, name],
    queryFn: async () => {
      const { data } = await api.get<RaiderIoGuildProfile | null>(
        '/raiderio/guild/profile',
        {
          params: { realm, name },
        },
      );
      return data;
    },
    enabled: !!realm && !!name,
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetGuildLeaderboard = (realm: string, name: string) => {
  return useQuery({
    queryKey: ['raiderio', 'guild', 'leaderboard', realm, name],
    queryFn: async () => {
      const { data } = await api.get<RaiderIoGuildLeaderboardEntry[]>(
        '/raiderio/guild/leaderboard',
        {
          params: { realm, name },
        },
      );
      return data;
    },
    enabled: !!realm && !!name,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetGuildUnlinkedMembers = (realm: string, name: string) => {
  return useQuery({
    queryKey: ['blizzard', 'guild', 'unlinked-members', realm, name],
    queryFn: async () => {
      const { data } = await api.get<RaiderIoGuildUnlinkedMember[]>(
        '/blizzard/guild/unlinked-members',
        {
          params: { realm, name },
        },
      );
      return data;
    },
    enabled: !!realm && !!name,
    retry: 1,
    staleTime: 60 * 1000,
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

const updateEvent = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateEventPayload;
}) => {
  const { data } = await api.patch<EventWithMeta>(`/events/${id}`, payload);
  return data;
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEvent,
    onSuccess: async () => {
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

export const useToggleRoster = (userId?: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleRosterStatus,
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ['characters', 'roster'] }),
        queryClient.invalidateQueries({ queryKey: ['characters', 'all'] }),
      ];

      if (userId) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ['characters', userId] }),
        );
      }

      await Promise.all(invalidations);
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

export interface UpdatePollPayload {
  question?: string;
  description?: string;
  options?: string[];
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

export const useUpdatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, payload }: { pollId: string; payload: UpdatePollPayload }) => {
      const { data } = await api.patch(`/polls/${pollId}`, payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};

export const useDeletePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pollId: string) => {
      const { data } = await api.delete(`/polls/${pollId}`);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
};

// ==================== PROFESSIONS ====================

export interface ProfessionSearchResult {
  name: string;
  realm: string;
  class: string;
  profession: string;
  skillLevel: number;
}

export interface ProfessionSummary {
  totalCrafters: number;
  totalRecipes: number;
  topProfessions: Array<{
    profession: string;
    crafterCount: number;
  }>;
}

export interface ProfessionDirectoryCharacter {
  name: string;
  realm: string;
  class: string;
  skillLevel: number;
}

export interface ProfessionDirectoryEntry {
  profession: string;
  crafterCount: number;
  characters: ProfessionDirectoryCharacter[];
}

export const useSearchProfessions = (recipe: string) => {
  const normalizedRecipe = recipe.trim();

  return useQuery({
    queryKey: ['professions', 'search', normalizedRecipe],
    queryFn: async () => {
      const { data } = await api.get<ProfessionSearchResult[]>('/professions/search', {
        params: { recipe: normalizedRecipe },
      });
      return data;
    },
    enabled: normalizedRecipe.length > 0,
    retry: 1,
  });
};

export const useGuildProfessionsSummary = () => {
  return useQuery({
    queryKey: ['professions', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<ProfessionSummary>('/professions/summary');
      return data;
    },
    retry: 1,
  });
};

export const useGuildProfessionsDirectory = () => {
  return useQuery({
    queryKey: ['professions', 'directory'],
    queryFn: async () => {
      const { data } = await api.get<ProfessionDirectoryEntry[]>('/professions/directory');
      return data;
    },
    retry: 1,
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

export const useGetFailedLoginAttempts = (page = 1, limit = 50) => {
  return useQuery({
    queryKey: ['auth', 'failed-login-attempts', page, limit],
    queryFn: async () => {
      const { data } = await api.get<FailedLoginAttemptsResponse>(
        '/auth/failed-login-attempts',
        {
          params: { page, limit },
        },
      );
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
