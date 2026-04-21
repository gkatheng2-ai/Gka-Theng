export interface Activity {
  id: string;
  type: 'post' | 'media' | 'status_change';
  content: string;
  timestamp: number;
}

export type PrivacyLevel = 'everyone' | 'friends' | 'nobody';

export interface UserPrivacy {
  status: PrivacyLevel;
  bio: PrivacyLevel;
  activityFeed: PrivacyLevel;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number;
  bio?: string;
  location?: string;
  activityFeed?: Activity[];
  privacy?: UserPrivacy;
}

export interface Message {
  id: string;
  senderId: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice';
  timestamp: number;
  isEncrypted?: boolean;
  mediaUrl?: string;
  senderName?: string;
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: Message;
  participants: string[];
  type: 'direct' | 'group';
  unreadCount?: number;
}

export interface SearchResult {
  messages: Message[];
  conversations: Conversation[];
}
