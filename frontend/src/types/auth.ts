export enum AppRole {
  ADMIN = 'ADMIN',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export interface User {
  userId: string;
  battletag?: string;
  appRole: AppRole;
  isSharedAccount?: boolean;
  theme?: string;
}

export type SharedProfile = 'A' | 'B' | 'C' | 'D' | 'E';

export interface SharedAccountProfile {
  code: SharedProfile;
  name: string;
}
