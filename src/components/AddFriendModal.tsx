import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, Mail, AtSign, Check, UserMinus, Loader2 } from 'lucide-react';
import { User } from '../lib/types';
import { cn } from '../lib/utils';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  currentFriends: User[];
  onAddFriend: (user: User) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ 
  isOpen, 
  onClose, 
  allUsers, 
  currentFriends,
  onAddFriend 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return allUsers.filter(user => {
      const q = searchQuery.toLowerCase();
      const matchesName = user.name.toLowerCase().includes(q);
      const matchesUsername = user.username?.toLowerCase().includes(q);
      const matchesEmail = user.email?.toLowerCase().includes(q);
      
      return matchesName || matchesUsername || matchesEmail;
    });
  }, [searchQuery, allUsers]);

  const handleAdd = (user: User) => {
    setAddedIds(prev => new Set(prev).add(user.id));
    onAddFriend(user);
  };

  const isAlreadyFriend = (userId: string) => {
    return currentFriends.some(f => f.id === userId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="text-indigo-500" size={24} />
                Find Friends
              </h2>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 pb-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search by name, @username, or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 text-slate-200 placeholder-slate-500 transition-all"
                />
              </div>
              <p className="mt-3 text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">
                {searchQuery.trim() ? `Found ${filteredResults.length} users` : 'Start typing to discover people'}
              </p>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-2">
              <div className="space-y-2">
                {filteredResults.map(user => {
                  const alreadyFriend = isAlreadyFriend(user.id);
                  const justAdded = addedIds.has(user.id);

                  return (
                    <div 
                      key={user.id} 
                      className="p-3 bg-slate-800/30 border border-slate-800/50 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-700" alt={user.name} />
                          <div className={cn(
                            "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900",
                            user.status === 'online' ? "bg-emerald-500" : user.status === 'away' ? "bg-amber-400" : "bg-slate-500"
                          )} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-100 truncate">{user.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {user.username && (
                              <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5">
                                <AtSign size={10} />
                                {user.username}
                              </span>
                            )}
                            {user.email && (
                              <span className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-1">
                                <Mail size={10} />
                                {user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => !alreadyFriend && !justAdded && handleAdd(user)}
                        disabled={alreadyFriend || justAdded}
                        className={cn(
                          "p-2.5 rounded-xl transition-all active:scale-95",
                          alreadyFriend || justAdded
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                        )}
                      >
                        {alreadyFriend || justAdded ? <Check size={18} /> : <UserPlus size={18} />}
                      </button>
                    </div>
                  );
                })}

                {searchQuery.trim() && filteredResults.length === 0 && (
                  <div className="text-center py-10 opacity-50">
                    <UserMinus className="mx-auto mb-3 text-slate-600" size={32} />
                    <p className="text-sm font-bold text-slate-400">No users found</p>
                    <p className="text-[10px] uppercase font-black tracking-tighter">Try a different keyword</p>
                  </div>
                )}

                {!searchQuery.trim() && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800/30 flex items-center justify-center mb-4">
                      <Search size={32} className="opacity-20" />
                    </div>
                    <p className="text-xs font-bold text-slate-500">Discover new connections</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/20">
               <p className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-widest leading-relaxed">
                 Nexus intelligently matches you with people based on mutual interests and professional circles.
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
