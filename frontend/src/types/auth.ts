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
}

export type SharedProfile = 'A' | 'B' | 'C';
