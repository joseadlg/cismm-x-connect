
export interface Speaker {
  id: number;
  name: string;
  photoUrl: string;
  title: string;
  company: string;
  bio: string;
  social: {
    linkedin?: string;
    twitter?: string;
  };
}

export interface Exhibitor {
  id: number;
  name: string;
  logoUrl: string;
  description: string;
  contact: string;
  website: string;
  standNumber: string;
  category: 'Aparatología' | 'Micropigmentación' | 'Cosmética' | 'Software';
}

export interface AgendaSession {
  id: number;
  title: string;
  speakerIds: number[];
  startTime: string;
  endTime: string;
  room: string;
  description: string;
  day: 'Viernes' | 'Sábado' | 'Domingo';
  track?: 'Medicina Estética' | 'Spa' | 'PMU';
}

export interface DemoSession {
  id: number;
  title: string;
  exhibitorId: number;
  time: string;
  description: string;
}

export type UserRole = 'admin' | 'exhibitor' | 'attendee';

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  photoUrl: string;
  interests: string[];
  isAdmin?: boolean; // Deprecated in favor of role
  role: UserRole;
  exhibitorId?: number; // For exhibitors
  track: 'Medicina Estética' | 'Spa' | 'PMU' | 'General';
  deviceId?: string; // For device binding security
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  photoUrl: string;
}

export interface NewsPost {
  id: number;
  title: string;
  content: string;
  authorName: string;
  authorRole: 'admin' | 'exhibitor';
  timestamp: string; // ISO format
  category: 'promotion' | 'announcement' | 'alert' | 'general';
}

export type View = 'DASHBOARD' | 'AGENDA' | 'SPEAKERS' | 'EXHIBITORS' | 'SCANNER' | 'PROFILE' | 'GAMIFICATION' | 'INFO' | 'ADMIN' | 'MY_STAND' | 'NEWS';