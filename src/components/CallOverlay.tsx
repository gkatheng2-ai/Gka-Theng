import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, X, Mic, MicOff, VideoOff, PhoneOff, Maximize2, Minimize2, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { User } from '../lib/types';
import { cn } from '../lib/utils';

interface CallOverlayProps {
  isOpen: boolean;
  type: 'voice' | 'video';
  user: User;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onFlipCamera?: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionQuality?: 'good' | 'fair' | 'poor';
  isReconnecting?: boolean;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  isOpen,
  type,
  user,
  isIncoming,
  onAccept,
  onReject,
  onFlipCamera,
  localStream,
  remoteStream,
  connectionQuality = 'good',
  isReconnecting = false
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]); // Re-bind if video is toggled and stream might have changed

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!videoTracks[0]?.enabled);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <div className="w-full max-w-4xl aspect-[16/9] bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
            
            {/* Reconnecting Overlay */}
            <AnimatePresence>
              {isReconnecting && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping"></div>
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30 relative z-10">
                      <WifiOff className="w-10 h-10 text-amber-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-6 mb-2">Connection unstable</h3>
                  <p className="text-slate-400 max-w-xs text-sm">Hang on, we're trying to reconnect your call. Please check your internet.</p>
                  <div className="flex items-center gap-2 mt-6">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video Streams */}
            {type === 'video' && (
              <div className="absolute inset-0 bg-slate-950">
                {remoteStream ? (
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                      <img src={user.avatar} className="w-32 h-32 rounded-full border-4 border-slate-800 relative z-10" alt={user.name} />
                    </div>
                    <p className="text-slate-400 font-medium tracking-wide">Connecting video...</p>
                  </div>
                )}
                
                {/* Local PiP */}
                <motion.div 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  className="absolute top-6 right-6 w-48 aspect-[9/16] bg-slate-900 rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden z-10"
                >
                  {isVideoOff ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                      <VideoOff className="w-8 h-8 text-slate-700" />
                      <span className="text-[10px] font-bold text-slate-700 uppercase mt-2 tracking-tighter">Your Video Off</span>
                    </div>
                  ) : (
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                  )}
                </motion.div>
              </div>
            )}

            {/* Voice UI */}
            {type === 'voice' && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
                  <img src={user.avatar} className="w-40 h-40 rounded-full border-4 border-slate-800 relative z-10 p-1" alt={user.name} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
                <p className="text-indigo-400 font-medium tracking-widest uppercase text-xs">
                  {remoteStream ? 'Connected' : isIncoming ? 'Incoming Voice Call' : 'Calling...'}
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-5 bg-slate-950/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl z-20">
              <button 
                onClick={toggleMute}
                className={cn(
                  "p-4 rounded-2xl transition-all group",
                  isMuted ? "bg-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                {isMuted ? <MicOff className="group-hover:scale-110 transition-transform" /> : <Mic className="group-hover:scale-110 transition-transform" />}
              </button>
              
              {isIncoming && !remoteStream ? (
                <>
                  <button 
                    onClick={onAccept}
                    className="p-5 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Phone className="animate-bounce" />
                  </button>
                  <button 
                    onClick={onReject}
                    className="p-5 bg-rose-500 text-white rounded-2xl hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20"
                  >
                    <PhoneOff />
                  </button>
                </>
              ) : (
                <button 
                  onClick={onReject}
                  className="p-5 bg-rose-500 text-white rounded-2xl hover:bg-rose-400 transition-all shadow-lg shadow-rose-500/20 px-8"
                >
                  <div className="flex items-center gap-3">
                    <PhoneOff size={24} />
                    <span className="font-bold text-sm tracking-tight">End Call</span>
                  </div>
                </button>
              )}

              <div className="flex items-center gap-2">
                {type === 'video' && (
                  <>
                    <button 
                      onClick={toggleVideo}
                      className={cn(
                        "p-4 rounded-2xl transition-all group",
                        isVideoOff ? "bg-rose-500/20 text-rose-500" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      {isVideoOff ? <VideoOff className="group-hover:scale-110 transition-transform" /> : <Video className="group-hover:scale-110 transition-transform" />}
                    </button>
                    <button 
                      onClick={onFlipCamera}
                      className="p-4 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 transition-all group"
                      title="Flip Camera"
                    >
                      <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Top Stats/Info */}
            <div className="absolute top-10 left-10 flex items-center gap-3 z-20">
               <div className="flex items-center gap-2 bg-slate-950/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">End-to-End Encrypted</span>
               </div>
               
               <div className={cn(
                 "flex items-center gap-2 bg-slate-950/50 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5",
                 connectionQuality === 'poor' ? "text-rose-400" : connectionQuality === 'fair' ? "text-amber-400" : "text-emerald-400"
               )}>
                 {connectionQuality === 'poor' ? <WifiOff size={14} /> : <Wifi size={14} />}
                 <span className="text-[10px] font-bold uppercase tracking-widest">
                   {connectionQuality === 'good' ? 'Signal Good' : connectionQuality === 'fair' ? 'Signal Fair' : 'Signal Poor'}
                 </span>
               </div>
               
               {isReconnecting && (
                 <div className="flex items-center gap-2 bg-amber-500/20 backdrop-blur-md px-3 py-2 rounded-xl border border-amber-500/20 text-amber-500 animate-pulse">
                   <AlertTriangle size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Reconnecting...</span>
                 </div>
               )}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
