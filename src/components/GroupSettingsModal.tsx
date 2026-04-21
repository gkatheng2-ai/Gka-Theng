import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, UserPlus, UserMinus, Check, Save } from 'lucide-react';
import { Conversation, User } from '../lib/types';
import { cn } from '../lib/utils';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  allUsers: User[];
  onUpdateGroup: (id: string, updates: Partial<Conversation>) => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  isOpen,
  onClose,
  conversation,
  allUsers,
  onUpdateGroup
}) => {
  const [name, setName] = useState(conversation.name);
  const [avatar, setAvatar] = useState(conversation.avatar || '');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(conversation.participants);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API delay
    setTimeout(() => {
      onUpdateGroup(conversation.id, {
        name,
        avatar,
        participants: selectedParticipants
      });
      setIsSaving(false);
      onClose();
    }, 800);
  };

  const handleChangeAvatar = () => {
    const newSeed = Math.random().toString(36).substring(7);
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`);
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
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-xl font-bold text-white tracking-tight">Group Settings</h2>
              <button 
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <img 
                    src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.id}`} 
                    className="w-32 h-32 rounded-3xl border-4 border-slate-800 p-1 bg-slate-900 shadow-xl" 
                    alt="Group Avatar" 
                  />
                  <button 
                    onClick={handleChangeAvatar}
                    className="absolute bottom-2 right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg border-2 border-slate-900 hover:scale-110 transition-transform"
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tap to change avatar</p>
              </div>

              {/* Name Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Group Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-slate-200 focus:ring-2 focus:ring-indigo-600 transition-all placeholder-slate-600"
                />
              </div>

              {/* Members Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Members ({selectedParticipants.length})</label>
                   <span className="text-[10px] text-indigo-400 font-bold uppercase cursor-pointer hover:underline">Add Others</span>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                  {allUsers.map(user => {
                    const isSelected = selectedParticipants.includes(user.id);
                    return (
                      <div 
                        key={user.id} 
                        onClick={() => handleToggleParticipant(user.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border group",
                          isSelected ? "bg-indigo-600/10 border-indigo-500/30" : "bg-slate-800/40 border-transparent hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-700" alt={user.name} />
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-semibold transition-colors", isSelected ? "text-indigo-400" : "text-slate-200")}>{user.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium">@{user.name.toLowerCase().replace(/\s+/g, '_')}</span>
                          </div>
                        </div>
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-600 group-hover:text-slate-400"
                        )}>
                          {isSelected ? <Check size={14} /> : <UserPlus size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
              <button 
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/10",
                  (isSaving || !name.trim()) ? "bg-slate-800 text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-500"
                )}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    Update Group Details
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
