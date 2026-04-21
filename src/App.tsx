/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Search, Lock, MessageSquare, Users, Bell, Menu, Phone, Video } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { UserProfile } from './components/UserProfile';
import { CallOverlay } from './components/CallOverlay';
import { GroupSettingsModal } from './components/GroupSettingsModal';
import { AddFriendModal } from './components/AddFriendModal';
import { E2EEProvider, useE2EE } from './components/E2EEProvider';
import { User, Message, Conversation, Activity } from './lib/types';
import { Auth } from './components/Auth';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import Peer from 'simple-peer';

// Mock initial data
const CURRENT_USER: User = {
  id: 'me-123',
  name: 'Alex Rivera',
  username: 'alex_rivera',
  email: 'alex.rivera@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  status: 'online'
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Samboo Fc',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Samboo',
    participants: ['me-123', 'u-1'],
    type: 'direct',
    lastMessage: { id: 'm-0', senderId: 'u-1', conversationId: 'conv-1', content: 'The audio call ended.', timestamp: Date.now() - 3600000, type: 'text' }
  },
  {
    id: 'conv-2',
    name: 'Sothea Sour',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sothea',
    participants: ['me-123', 'u-2'],
    type: 'direct',
    lastMessage: { id: 'm-1', senderId: 'u-2', conversationId: 'conv-2', content: 'The audio call ended.', timestamp: Date.now() - 7200000, type: 'text' }
  },
  {
    id: 'conv-3',
    name: 'ThAy Mii',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thay',
    participants: ['me-123', 'u-3'],
    type: 'direct',
    unreadCount: 1,
    lastMessage: { id: 'm-2', senderId: 'u-3', conversationId: 'conv-3', content: 'You missed an audio call from ThAy.', timestamp: Date.now() - 86400000, type: 'text' }
  },
  {
    id: 'conv-group-1',
    name: 'Nexus Alpha Team',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nexus-alpha',
    participants: ['me-123', 'u-1', 'u-2', 'u-3'],
    type: 'group',
    lastMessage: { id: 'm-group-1', senderId: 'u-1', conversationId: 'conv-group-1', content: 'Welcome to the Nexus Alpha group!', timestamp: Date.now() - 43200000, type: 'text' }
  }
];

const MOCK_PROFILES: Record<string, User> = {
  'u-1': {
    id: 'u-1',
    name: 'Samboo Fc',
    username: 'samboo_fc',
    email: 'samboo@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Samboo',
    status: 'online',
    bio: 'Avid football fan and full-stack developer. Love connecting over sports and code.',
    location: 'Bangkok, Thailand',
    activityFeed: [
      { id: 'a1', type: 'post', content: 'Just finished a major sprint! Feeling good.', timestamp: Date.now() - 10000000 },
      { id: 'a2', type: 'media', content: 'Shared a photo from the stadium.', timestamp: Date.now() - 20000000 }
    ]
  },
  'u-2': {
    id: 'u-2',
    name: 'Sothea Sour',
    username: 'sothea_sour',
    email: 'sothea@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sothea',
    status: 'offline',
    bio: 'Photographer and visual storyteller. Capturing moments one frame at a time.',
    location: 'Phnom Penh, Cambodia',
    activityFeed: [
      { id: 'a3', type: 'media', content: 'New photo series: Sunset in the city.', timestamp: Date.now() - 50000000 }
    ]
  },
  'u-3': {
    id: 'u-3',
    name: 'ThAy Mii',
    username: 'thay_mii',
    email: 'thay@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thay',
    status: 'online',
    bio: 'Product Designer at Nexus. Building the future of real-time communication.',
    location: 'Singapore',
    activityFeed: [
      { id: 'a4', type: 'status_change', content: 'Changed status to Active.', timestamp: Date.now() - 5000000 }
    ]
  }
};

function MainApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(INITIAL_CONVERSATIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friends, setFriends] = useState<User[]>(Object.values(MOCK_PROFILES));
  const [allUsers, setAllUsers] = useState<Record<string, User>>(MOCK_PROFILES);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  // Call State
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'on-call'>('idle');
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callUser, setCallUser] = useState<User | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingSignal, setIncomingSignal] = useState<any>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [callQuality, setCallQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [isCallReconnecting, setIsCallReconnecting] = useState(false);
  const peerRef = useRef<Peer.Instance | null>(null);
  
  const { encrypt } = useE2EE();

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Real-time sync for user profile
        unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            setCurrentUser(userDoc.data() as User);
          } else {
            // Fallback if doc doesn't exist yet (e.g. during signup)
            setCurrentUser({
              id: user.uid,
              name: user.displayName || 'Anonymous',
              email: user.email || '',
              avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
              status: 'online'
            });
          }
          setAuthLoading(false);
        }, (error) => {
          console.error("Firestore sync error:", error);
          setAuthLoading(false);
        });
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !socket) return;

    const handleVisibilityChange = () => {
      const status = document.visibilityState === 'visible' ? 'online' : 'away';
      socket.emit('update_status', { userId: currentUser.id, status });
      updateDoc(doc(db, 'users', currentUser.id), { 
        status,
        lastSeen: Date.now()
      }).catch(console.error);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);
    
    // Initial status update
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
      // When unmounting or disconnecting, set to offline
      if (currentUser) {
        updateDoc(doc(db, 'users', currentUser.id), { 
          status: 'offline',
          lastSeen: Date.now()
        }).catch(console.error);
      }
    };
  }, [currentUser?.id, socket]);

  useEffect(() => {
    if (!currentUser) return;

    // Initialize Socket.io
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', currentUser);
    });

    newSocket.on('history', (history: Message[]) => {
      setMessages(history);
    });

    // Real-time status sync via Firestore for everyone
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: Record<string, User> = {};
      snapshot.forEach(doc => {
        usersData[doc.id] = doc.data() as User;
      });
      setAllUsers(prev => ({ ...prev, ...usersData }));
      
      // Update friends list if they exist in Firestore
      setFriends(prev => prev.map(f => usersData[f.id] ? { ...f, ...usersData[f.id] } : f));
    });

    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // Update last message in specific conversation
      setConversations(prev => prev.map(conv => {
        if (conv.id === message.conversationId) {
          return { ...conv, lastMessage: message };
        }
        return conv;
      }));
    });

    newSocket.on('message_deleted', ({ messageId, updatedMessage }: { messageId: string, updatedMessage: Message }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? updatedMessage : m));
    });

    newSocket.on('user_typing', ({ userId, conversationId, isTyping }: { userId: string, conversationId: string, isTyping: boolean }) => {
      setTypingUsers(prev => {
        const current = prev[conversationId] || [];
        if (isTyping) {
          if (current.includes(userId)) return prev;
          return { ...prev, [conversationId]: [...current, userId] };
        } else {
          return { ...prev, [conversationId]: current.filter(id => id !== userId) };
        }
      });
    });

    newSocket.on('user_status', ({ userId, status }: { userId: string, status: User['status'] }) => {
      setFriends(prev => prev.map(f => f.id === userId ? { ...f, status } : f));
      setAllUsers(prev => {
        if (prev[userId]) {
          return { ...prev, [userId]: { ...prev[userId], status } };
        }
        return prev;
      });
    });

    newSocket.on('incoming_call', ({ from, signal, type }: { from: User, signal: any, type: 'voice' | 'video' }) => {
      setCallStatus('incoming');
      setCallUser(from);
      setCallType(type);
      setIncomingSignal(signal);
    });

    newSocket.on('call_accepted', (signal: any) => {
      setCallStatus('on-call');
      peerRef.current?.signal(signal);
    });

    newSocket.on('call_ended', () => {
      handleEndCall();
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSendMessage = useCallback(async (content: string, type: Message['type'] = 'text', mediaUrl?: string) => {
    if (!socket || !currentUser) return;

    // Encrypt the message content
    const encryptedContent = await encrypt(content);

    const message: Partial<Message> = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      conversationId: activeConversationId,
      content: encryptedContent,
      type,
      mediaUrl,
      isEncrypted: true
    };

    socket.emit('send_message', message);
  }, [socket, activeConversationId, encrypt, currentUser]);

  const handleDeleteMessage = useCallback((messageId: string, forEveryone: boolean) => {
    if (!socket || !currentUser) return;
    socket.emit('delete_message', { messageId, forEveryone, userId: currentUser.id });
  }, [socket, currentUser]);

  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId) || conversations[0],
    [conversations, activeConversationId]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    return conversations.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Filter messages for active conversation AND search query if search is specific
  const activeMessages = useMemo(() => 
    messages.filter(m => m.conversationId === activeConversationId),
    [messages, activeConversationId]
  );

  const handleShowProfile = useCallback((userId: string) => {
    const profile = allUsers[userId] || (userId === currentUser?.id ? currentUser : null);
    if (profile) setSelectedProfileUser(profile);
  }, [currentUser, allUsers]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!socket || !currentUser) return;
    socket.emit('typing', { userId: currentUser.id, conversationId: activeConversationId, isTyping });
  }, [socket, activeConversationId, currentUser]);

  const handleStartCall = async (type: 'voice' | 'video', target?: User) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === 'video' ? { facingMode: 'user' } : false,
      audio: true
    });
    setLocalStream(stream);
    setCallType(type);
    setCallStatus('calling');
    
    const targetUser = target || allUsers[activeConversation?.participants?.find(p => p !== currentUser?.id) || ''] || null;
    setCallUser(targetUser);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket?.emit('call_user', {
        to: targetUser?.id,
        from: currentUser,
        signal: data,
        type: type
      });
    });

    peer.on('stream', (stream) => {
      setRemoteStream(stream);
    });

    // Monitor connection quality and state
    const pc = (peer as any)._pc as RTCPeerConnection;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'disconnected' || state === 'failed') {
          setIsCallReconnecting(true);
          setCallQuality('poor');
        } else if (state === 'connected' || state === 'completed') {
          setIsCallReconnecting(false);
          setCallQuality('good');
        }
      };
    }

    peerRef.current = peer;
  };

  const handleAcceptCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video' ? { facingMode: 'user' } : false,
      audio: true
    });
    setLocalStream(stream);
    setCallStatus('on-call');

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket?.emit('answer_call', {
        to: callUser?.id,
        signal: data
      });
    });

    peer.on('stream', (stream) => {
      setRemoteStream(stream);
    });

    // Monitor connection quality and state
    const pc = (peer as any)._pc as RTCPeerConnection;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'disconnected' || state === 'failed') {
          setIsCallReconnecting(true);
          setCallQuality('poor');
        } else if (state === 'connected' || state === 'completed') {
          setIsCallReconnecting(false);
          setCallQuality('good');
        }
      };
    }

    peer.signal(incomingSignal);
    peerRef.current = peer;
  };

  const handleUpdateUser = async (updatedUser: Partial<User>) => {
    if (!currentUser) return;
    setCurrentUser(prev => prev ? ({ ...prev, ...updatedUser }) : null);
    
    // Sync to Firestore
    try {
      await updateDoc(doc(db, 'users', currentUser.id), updatedUser);
    } catch (error) {
      console.error("Failed to sync user updates to Firestore:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleUpdateGroup = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === id) {
        return { ...conv, ...updates };
      }
      return conv;
    }));
  };

  const handleAddFriend = (user: User) => {
    if (!currentUser) return;
    if (!friends.some(f => f.id === user.id)) {
      setFriends(prev => [...prev, user]);
      
      // Also automatically create a conversation for the new friend
      const newConvId = `conv-new-${user.id}`;
      const newConversation: Conversation = {
        id: newConvId,
        name: user.name,
        avatar: user.avatar,
        participants: [currentUser.id, user.id],
        type: 'direct',
      };
      
      setConversations(prev => [newConversation, ...prev]);
    }
  };

  const handleEndCall = () => {
    socket?.emit('end_call', { to: callUser?.id });
    peerRef.current?.destroy();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setCallUser(null);
    setIncomingSignal(null);
    setFacingMode('user');
    setCallQuality('good');
    setIsCallReconnecting(false);
    peerRef.current = null;
  };

  const handleFlipCamera = async () => {
    if (callType !== 'video' || !localStream || !peerRef.current) return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStream.getVideoTracks()[0];
      
      if (oldVideoTrack && newVideoTrack) {
        peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, localStream);
        oldVideoTrack.stop();
        localStream.removeTrack(oldVideoTrack);
        localStream.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStream.getTracks()));
        setFacingMode(newFacingMode);
      }
    } catch (error) {
      console.error("Camera flip failed:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center animate-pulse shadow-xl shadow-indigo-600/20">
          <MessageSquare className="w-9 h-9 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></div>
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
      {/* Sleek Theme Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Nexus</span>
        </div>
        
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative flex items-center group">
            <Search className="absolute left-3 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
            <input 
              type="text" 
              placeholder="Search messages, photos, and files..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-300 placeholder-slate-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
            <Lock size={12} fill="currentColor" fillOpacity={0.2} />
            End-to-End Encrypted
          </div>
          <div className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={() => currentUser && handleShowProfile(currentUser.id)}>
            <img src={currentUser?.avatar} className="w-9 h-9 rounded-full border-2 border-indigo-500" alt="Me" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <Sidebar 
          conversations={filteredConversations} 
          activeId={activeConversationId}
          onSelect={setActiveConversationId}
          currentUser={currentUser}
          allUsers={allUsers}
          friends={friends}
          onSearch={setSearchQuery} // Keeping search in sidebar too for mobile resilience
          onShowProfile={handleShowProfile}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
          onOpenAddFriend={() => setIsAddFriendModalOpen(true)}
          onStartCall={handleStartCall}
          onOpenGroupSettings={(id) => {
            setActiveConversationId(id);
            setIsGroupSettingsOpen(true);
          }}
        />
        <ChatArea 
          conversation={activeConversation}
          messages={activeMessages}
          currentUser={currentUser}
          allUsers={allUsers}
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onShowProfile={handleShowProfile}
          typingUsers={typingUsers[activeConversationId] || []}
          onTyping={handleTyping}
          onStartCall={handleStartCall}
          onOpenGroupSettings={() => setIsGroupSettingsOpen(true)}
        />
      </main>

      {selectedProfileUser && currentUser && (
        <UserProfile 
          user={selectedProfileUser} 
          isOpen={!!selectedProfileUser} 
          onClose={() => setSelectedProfileUser(null)} 
          isFriend={selectedProfileUser.id !== currentUser.id && !!MOCK_PROFILES[selectedProfileUser.id]}
        />
      )}

      {activeConversation.type === 'group' && (
        <GroupSettingsModal 
          isOpen={isGroupSettingsOpen}
          onClose={() => setIsGroupSettingsOpen(false)}
          conversation={activeConversation}
          allUsers={Object.values(allUsers) as User[]}
          onUpdateGroup={handleUpdateGroup}
        />
      )}

      <AddFriendModal 
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        allUsers={(Object.values(allUsers) as User[]).filter(u => u.id !== currentUser?.id)}
        currentFriends={friends}
        onAddFriend={handleAddFriend}
      />

      {callStatus !== 'idle' && callUser && (
        <CallOverlay 
          isOpen={callStatus !== 'idle'}
          type={callType}
          user={callUser}
          isIncoming={callStatus === 'incoming'}
          onAccept={handleAcceptCall}
          onReject={handleEndCall}
          onFlipCamera={handleFlipCamera}
          localStream={localStream}
          remoteStream={remoteStream}
          connectionQuality={callQuality}
          isReconnecting={isCallReconnecting}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <E2EEProvider>
      <MainApp />
    </E2EEProvider>
  );
}

