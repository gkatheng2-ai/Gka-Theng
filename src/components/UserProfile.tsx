import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Info, Calendar, MessageCircle, Image as ImageIcon, Video, Phone, FileText, Share2, Lock } from 'lucide-react';
import { User, Activity } from '../lib/types';
import { cn, formatTime } from '../lib/utils';

interface UserProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isFriend?: boolean;
  onStartCall?: (type: 'voice' | 'video', target: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, isOpen, onClose, isFriend = true, onStartCall }) => {
  const canSeeStatus = !user.privacy?.status || user.privacy.status === 'everyone' || (user.privacy.status === 'friends' && isFriend);
  const canSeeBio = !user.privacy?.bio || user.privacy.bio === 'everyone' || (user.privacy.bio === 'friends' && isFriend);
  const canSeeActivity = !user.privacy?.activityFeed || user.privacy.activityFeed === 'everyone' || (user.privacy.activityFeed === 'friends' && isFriend);

  const handleStartCall = (type: 'voice' | 'video') => {
    onStartCall?.(type, user);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header / Cover Area */}
            <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative shrink-0">
               <button 
                 onClick={onClose}
                 className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
               >
                 <X size={20} />
               </button>
            </div>

            {/* Profile Info */}
            <div className="px-8 pb-8 flex-1 overflow-y-auto no-scrollbar">
              <div className="relative -mt-12 mb-6">
                <div className="relative inline-block">
                  <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-slate-900 shadow-xl" alt={user.name} />
                  {canSeeStatus && (
                    <div className={cn(
                      "absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-slate-900",
                      user.status === 'online' ? "bg-emerald-500" : user.status === 'away' ? "bg-amber-400" : "bg-slate-500"
                    )} />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-indigo-400 font-medium text-sm">@{user.name.toLowerCase().replace(' ', '_')}</p>
                    {user.status !== 'online' && user.lastSeen && (
                      <>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Seen {formatTime(user.lastSeen)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                    <MessageCircle size={18} />
                  </button>
                  <button 
                    onClick={() => handleStartCall('voice')}
                    className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                    title="Voice Call"
                  >
                    <Phone size={18} />
                  </button>
                  <button 
                    onClick={() => handleStartCall('video')}
                    className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
                    title="Video Call"
                  >
                    <Video size={18} />
                  </button>
                  <button className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin size={16} className="text-indigo-400" />
                  <span className="text-sm font-medium">{user.location || 'San Francisco, CA'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar size={16} className="text-indigo-400" />
                  <span className="text-sm font-medium">Joined April 2026</span>
                </div>
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">About</h3>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      {canSeeBio ? (user.bio || "Digital nomad, design enthusiast, and tech explorer.") : "This user has restricted their bio visibility."}
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Activity</h3>
                  <div className="space-y-3">
                    {!canSeeActivity ? (
                      <div className="p-6 bg-slate-800/20 rounded-2xl border border-dashed border-slate-800 text-center">
                        <Lock size={20} className="mx-auto text-slate-700 mb-2" />
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">Activity Restricted by User</p>
                      </div>
                    ) : user.activityFeed?.map((activity) => (
                      <div key={activity.id} className="flex gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-indigo-400">
                          {activity.type === 'media' ? <ImageIcon size={16} /> : activity.type === 'post' ? <FileText size={16} /> : <Info size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-200 line-clamp-1">{activity.content}</p>
                          <span className="text-[10px] text-slate-500">{formatTime(activity.timestamp)}</span>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-6">
                         <p className="text-xs text-slate-500">No recent activity to show.</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Shared Media</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="aspect-square bg-slate-800 rounded-xl overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer">
                        <img src={`https://picsum.photos/seed/${user.id}-${i}/200/200`} className="w-full h-full object-cover" alt="Shared" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
