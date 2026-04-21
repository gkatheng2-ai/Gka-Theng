import React, { useState } from 'react';
import { Search, Edit, MoreHorizontal, MessageSquare, Users, Bell, Menu, User, Settings, LogOut, Shield, ChevronRight, Check, UserPlus, Phone, Eye, EyeOff, Lock, UserX, Smartphone, Filter, SortAsc } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';
import { Conversation, User as UserType, UserPrivacy, PrivacyLevel } from '../lib/types';

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  currentUser: UserType;
  onSearch: (query: string) => void;
  onShowProfile: (userId: string) => void;
  onUpdateUser: (updatedUser: Partial<UserType>) => void;
  onOpenGroupSettings?: (id: string) => void;
  onOpenAddFriend?: () => void;
  onStartCall?: (type: 'voice' | 'video', target: UserType) => void;
  onLogout: () => void;
  allUsers: Record<string, UserType>;
  friends: UserType[];
}

type Tab = 'chats' | 'friends' | 'notifications' | 'menu';

export const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  activeId, 
  onSelect, 
  currentUser,
  onSearch,
  onShowProfile,
  onUpdateUser,
  onOpenGroupSettings,
  onOpenAddFriend,
  onStartCall,
  onLogout,
  allUsers,
  friends
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Friends filtering and sorting state
  const [friendsSearch, setFriendsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'away' | 'offline'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Local form state
  const [formName, setFormName] = useState(currentUser.name);
  const [formEmail, setFormEmail] = useState('alex.rivera@example.com');
  const [formUsername, setFormUsername] = useState('alex_rivera');
  
  // Sync local form state when currentUser updates
  React.useEffect(() => {
    if (currentUser) {
      setFormName(currentUser.name);
    }
  }, [currentUser?.name]);

  const [privacySettings, setPrivacySettings] = useState<UserPrivacy>(currentUser.privacy || {
    status: 'everyone',
    bio: 'everyone',
    activityFeed: 'everyone'
  });

  const handleUpdatePrivacy = (key: keyof UserPrivacy, level: PrivacyLevel) => {
    const newSettings = { ...privacySettings, [key]: level };
    setPrivacySettings(newSettings);
    onUpdateUser({ privacy: newSettings });
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      onUpdateUser({ name: formName });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangeAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleUpdateUserLocal = (updatedUser: Partial<UserType>) => {
    onUpdateUser(updatedUser);
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-400';
      case 'offline': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const StatusIndicator = ({ status }: { status: string | undefined }) => (
    <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900", getStatusColor(status))} />
  );


  const filteredFriends = React.useMemo(() => {
    return friends
      .filter(friend => {
        const matchesSearch = friend.name.toLowerCase().includes(friendsSearch.toLowerCase());
        const matchesStatus = statusFilter === 'all' || friend.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
  }, [friendsSearch, statusFilter, sortOrder]);

  const notifications = [
    { id: 'n1', type: 'request', user: 'Vichea Long', content: 'sent you a friend request', time: '2m ago' },
    { id: 'n2', type: 'add', user: 'Samboo Fc', content: 'added you to a new group chat', time: '15m ago' },
    { id: 'n3', type: 'request', user: 'Nita Ros', content: 'sent you a friend request', time: '1h ago' },
  ];
  return (
    <div className="w-80 h-full bg-slate-900/40 border-r border-slate-800 flex flex-col pt-2">
      {/* Story-like status avatars (Sleek style) */}
      <div className="p-4 flex gap-4 overflow-x-auto no-scrollbar scroll-smooth border-b border-slate-800/50 mb-2">
        <div className="shrink-0 text-center space-y-1.5 cursor-pointer group" onClick={() => currentUser?.id && onShowProfile(currentUser.id)}>
          <div className="w-13 h-13 rounded-full border-2 border-indigo-600 p-0.5 transition-transform group-hover:scale-105">
            <img src={currentUser?.avatar} className="w-full h-full rounded-full grayscale group-hover:grayscale-0 transition-all" alt="Me" />
          </div>
          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-slate-300">Story</span>
        </div>
        {conversations.map(c => {
           const userId = c.participants.find(id => id !== currentUser?.id);
           return (
             <div key={c.id} className="shrink-0 text-center space-y-1.5 cursor-pointer group" onClick={() => userId && onShowProfile(userId)}>
               <div className="w-13 h-13 rounded-full border-2 border-slate-800 p-0.5 transition-transform group-hover:scale-105 group-hover:border-slate-600">
                 <img src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`} className="w-full h-full rounded-full" alt={c.name} />
               </div>
               <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider group-hover:text-slate-300 truncate w-12 mx-auto">{c.name.split(' ')[0]}</span>
             </div>
           );
        })}
      </div>

      {/* Main Content Area based on Tab */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-2 px-2">
        {activeTab === 'chats' && (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 rounded-xl",
                  activeId === conv.id 
                    ? "bg-indigo-600/20 border-l-4 border-indigo-500 rounded-l-none" 
                    : "hover:bg-slate-800/50"
                )}
              >
                <div className="relative shrink-0">
                  <img 
                    src={conv.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} 
                    className="w-12 h-12 rounded-full border border-slate-700" 
                    alt={conv.name} 
                  />
                  {conv.type === 'direct' && (
                    <StatusIndicator status={allUsers[conv.participants.find(id => id !== currentUser?.id) || '']?.status} />
                  )}
                  {conv.type === 'group' && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-indigo-600 rounded flex items-center justify-center border-2 border-slate-900">
                      <span className="text-[7px] text-white font-black">{conv.participants.length}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-center gap-2">
                       <h4 className={cn("text-sm font-semibold truncate max-w-[120px]", activeId === conv.id ? "text-white" : "text-slate-100")}>
                         {conv.name}
                       </h4>
                       {conv.type === 'group' && (
                         <div className="text-[8px] bg-slate-800 text-slate-500 px-1 rounded border border-slate-700">GP</div>
                       )}
                    </div>
                    {conv.lastMessage && (
                      <span className="text-[10px] opacity-50 shrink-0 font-medium">
                        {formatTime(conv.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className={cn(
                      "text-xs truncate max-w-[140px]",
                      conv.unreadCount ? "text-indigo-300 font-medium" : "text-slate-500"
                    )}>
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                    <div className="flex items-center gap-2">
                      {conv.type === 'group' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenGroupSettings?.(conv.id);
                          }}
                          className="p-1 text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                      {conv.unreadCount ? (
                        <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-[9px] text-white font-bold">{conv.unreadCount}</span>
                        </div>
                      ) : (
                        <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-4 pt-2">
            <div className="px-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Active Friends</h3>
                <button 
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors flex items-center gap-1",
                    sortOrder === 'desc' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                  title="Toggle alphabetical sort"
                >
                  <SortAsc size={14} className={cn(sortOrder === 'desc' && "rotate-180")} />
                  <span className="text-[10px] font-bold uppercase">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </button>
              </div>

              {/* Search and Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text"
                    value={friendsSearch}
                    onChange={(e) => setFriendsSearch(e.target.value)}
                    placeholder="Search friends..."
                    className="w-full bg-slate-800/50 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                  {(['all', 'online', 'away', 'offline'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap border",
                        statusFilter === status 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20" 
                          : "bg-slate-800/50 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {filteredFriends.length > 0 ? (
                filteredFriends.map(friend => (
                  <div 
                    key={friend.id}
                    onClick={() => onShowProfile(friend.id)}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/50 rounded-xl cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={friend.avatar} className="w-11 h-11 rounded-full border border-slate-700" alt={friend.name} />
                        <StatusIndicator status={friend.status} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-200">{friend.name}</span>
                        <span className={cn(
                          "text-[10px] uppercase font-bold tracking-tighter", 
                          friend.status === 'online' ? "text-emerald-400" : friend.status === 'away' ? "text-amber-400" : "text-slate-500"
                        )}>
                          {friend.status === 'online' ? 'Available' : friend.status === 'away' ? 'Away' : `Seen ${friend.lastSeen ? formatTime(friend.lastSeen) : 'long ago'}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(conversations.find(c => c.participants.includes(friend.id))?.id || friend.id);
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartCall?.('voice', friend);
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                      >
                        <Phone size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-600 mb-3">
                    <UserX size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 mb-1">No friends found</p>
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Try a different search or filter</p>
                </div>
              )}
            </div>
            <button 
              onClick={onOpenAddFriend}
              className="w-full mt-4 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:border-slate-700 hover:text-slate-300 transition-all active:scale-95"
            >
              <UserPlus size={18} />
              <span className="text-sm font-semibold">Find and add friends</span>
            </button>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 pt-2">
            <h3 className="px-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">Recent Notifications</h3>
            <div className="space-y-2">
              {notifications.map(notif => (
                <div key={notif.id} className="p-3 bg-slate-800/30 border border-slate-800/50 rounded-xl hover:border-slate-700 transition-all cursor-pointer group">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                      {notif.type === 'request' ? <UserPlus size={18} /> : <Users size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 leading-normal">
                        <span className="font-bold text-white">{notif.user}</span> {notif.content}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">{notif.time}</span>
                    </div>
                  </div>
                  {notif.type === 'request' && (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">Accept</button>
                      <button className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors">Decline</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6 pt-4 px-2">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <img src={currentUser?.avatar} className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 mb-4" alt={currentUser?.name} />
                <button 
                  onClick={handleChangeAvatar}
                  className="absolute bottom-4 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg border-2 border-slate-900 group-hover:scale-110 transition-transform"
                >
                  <Edit size={14} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-white mb-0.5">{currentUser?.name}</h3>
              <p className="text-xs text-slate-500 font-medium">@{formUsername} • Active Now</p>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="w-full p-3 flex items-center justify-between bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-3 text-slate-300">
                  <User size={18} className="text-indigo-400" />
                  <span className="text-sm font-semibold">Profile Settings</span>
                </div>
                <ChevronRight size={16} className={cn("text-slate-600 transition-transform", isEditingProfile && "rotate-90")} />
              </button>
              {isEditingProfile && (
                <div className="mt-2 p-4 bg-slate-800/30 rounded-xl border border-slate-800 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                    <input 
                      type="text" 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-900 border-none rounded-lg text-sm text-slate-300 py-2 px-3 focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                    <input 
                      type="email" 
                      value={formEmail} 
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-slate-900 border-none rounded-lg text-sm text-slate-300 py-2 px-3 focus:ring-1 focus:ring-indigo-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">@</span>
                      <input 
                        type="text" 
                        value={formUsername} 
                        onChange={(e) => setFormUsername(e.target.value)}
                        className="w-full bg-slate-900 border-none rounded-lg text-sm text-slate-300 py-2 pl-7 pr-3 focus:ring-1 focus:ring-indigo-500" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className={cn(
                      "w-full py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95",
                      saveSuccess 
                        ? "bg-emerald-500 text-white" 
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                    )}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : saveSuccess ? (
                      <>
                        <Check size={14} />
                        Saved
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              )}
              <button 
                onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                className="w-full p-3 flex items-center justify-between bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
              >
                <div className="flex items-center gap-3 text-slate-300">
                  <Shield size={18} className="text-indigo-400" />
                  <span className="text-sm font-semibold">Privacy & Security</span>
                </div>
                <ChevronRight size={16} className={cn("text-slate-600 transition-transform", isPrivacyOpen && "rotate-90")} />
              </button>
              {isPrivacyOpen && (
                <div className="mt-2 p-3 bg-slate-800/30 rounded-xl border border-slate-800 space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Profile Visibility</h4>
                    
                    <div className="space-y-4">
                      {/* Status Privacy */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <Eye size={12} className="text-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-300">Online Status</span>
                        </div>
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                          {(['everyone', 'friends', 'nobody'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => handleUpdatePrivacy('status', level)}
                              className={cn(
                                "flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all",
                                privacySettings.status === level 
                                  ? "bg-indigo-600 text-white shadow-lg" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bio Privacy */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <User size={12} className="text-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-300">Profile Bio</span>
                        </div>
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                          {(['everyone', 'friends', 'nobody'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => handleUpdatePrivacy('bio', level)}
                              className={cn(
                                "flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all",
                                privacySettings.bio === level 
                                  ? "bg-indigo-600 text-white shadow-lg" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Activity Privacy */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <Users size={12} className="text-indigo-400" />
                          <span className="text-[10px] font-bold text-slate-300">Activity Feed</span>
                        </div>
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                          {(['everyone', 'friends', 'nobody'] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => handleUpdatePrivacy('activityFeed', level)}
                              className={cn(
                                "flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all",
                                privacySettings.activityFeed === level 
                                  ? "bg-indigo-600 text-white shadow-lg" 
                                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/50 pt-2 space-y-1">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">Other Settings</h4>
                    <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <Check size={16} className="text-slate-500 group-hover:text-indigo-400" />
                        <span className="text-xs text-slate-300 font-medium">Read Receipts</span>
                      </div>
                      <div className="w-8 h-4 bg-indigo-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer group border-t border-slate-800/50 mt-1 pt-2">
                      <div className="flex items-center gap-3">
                        <Lock size={16} className="text-indigo-400" />
                        <span className="text-xs text-slate-300 font-medium">End-to-End Encryption</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-400/10 px-2 py-0.5 rounded">Active</span>
                    </div>
                  </div>
                </div>
              )}
              <button className="w-full p-3 flex items-center justify-between bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700">
                <div className="flex items-center gap-3 text-slate-300">
                  <Settings size={18} className="text-indigo-400" />
                  <span className="text-sm font-semibold">General App Settings</span>
                </div>
                <ChevronRight size={16} className="text-slate-600" />
              </button>
            </div>

            <button 
              onClick={onLogout}
              className="w-full mt-6 py-3 px-4 flex items-center justify-center gap-3 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
            >
              <LogOut size={18} />
              Logout from Nexus
            </button>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleAvatarFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Bottom Nav (Sleek Theme) */}
      <div className="border-t border-slate-800/80 p-2 bg-slate-900/50 backdrop-blur-sm flex justify-around">
        <button 
          onClick={() => setActiveTab('chats')}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            activeTab === 'chats' ? "text-indigo-400 bg-indigo-400/10" : "text-slate-500 hover:bg-slate-800"
          )}
        >
          <MessageSquare size={20} />
        </button>
        <button 
          onClick={() => setActiveTab('friends')}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            activeTab === 'friends' ? "text-indigo-400 bg-indigo-400/10" : "text-slate-500 hover:bg-slate-800"
          )}
        >
          <Users size={20} />
        </button>
        <button 
          onClick={() => setActiveTab('notifications')}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            activeTab === 'notifications' ? "text-indigo-400 bg-indigo-400/10" : "text-slate-500 hover:bg-slate-800"
          )}
        >
          <Bell size={20} />
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={cn(
            "p-2.5 rounded-xl transition-all",
            activeTab === 'menu' ? "text-indigo-400 bg-indigo-400/10" : "text-slate-500 hover:bg-slate-800"
          )}
        >
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
};
