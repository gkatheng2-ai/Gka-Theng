import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Phone, Video, Info, PlusCircle, Image, StickyNote, Mic, Send, Lock, Search, Calendar, Filter, FileText, Film, Camera, ChevronDown, X, Settings, EyeOff, Play, Pause, Trash2, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatTime } from '../lib/utils';
import { Message, Conversation, User } from '../lib/types';
import { useE2EE } from './E2EEProvider';

interface ChatAreaProps {
  conversation: Conversation;
  messages: Message[];
  currentUser: User;
  onSendMessage: (content: string, type?: Message['type'], mediaUrl?: string) => void;
  onShowProfile: (userId: string) => void;
  typingUsers: string[];
  onTyping: (isTyping: boolean) => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onOpenGroupSettings?: () => void;
  onDeleteMessage?: (messageId: string, forEveryone: boolean) => void;
  allUsers: Record<string, User>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  conversation, 
  messages, 
  currentUser,
  onSendMessage,
  onDeleteMessage,
  onShowProfile,
  typingUsers,
  onTyping,
  onStartCall,
  onOpenGroupSettings,
  allUsers
}) => {
  const [inputValue, setInputValue] = useState('');
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { decrypt } = useE2EE();

  const [isSearching, setIsSearching] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video' | 'file'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      // Hide if deleted for current user
      if (m.deletedFor?.includes(currentUser?.id || '')) return false;

      // Text search
      const content = m.isEncrypted ? (decryptedMessages[m.id] || '') : m.content;
      const matchesText = !msgSearchQuery || content.toLowerCase().includes(msgSearchQuery.toLowerCase());
      
      // Type filter
      const matchesType = selectedType === 'all' || m.type === selectedType;
      
      // Date filter
      const msgDate = new Date(m.timestamp);
      // Strip time for start/end date comparison
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      const matchesStartDate = !start || msgDate >= start;
      const matchesEndDate = !end || msgDate <= end;
      
      return matchesText && matchesType && matchesStartDate && matchesEndDate;
    });
  }, [messages, msgSearchQuery, decryptedMessages, selectedType, startDate, endDate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, decryptedMessages]);

  useEffect(() => {
    const decryptAll = async () => {
      const newDecrypted: Record<string, string> = { ...decryptedMessages };
      for (const msg of messages) {
        if (msg.isEncrypted && !newDecrypted[msg.id]) {
          newDecrypted[msg.id] = await decrypt(msg.content);
        }
      }
      setDecryptedMessages(newDecrypted);
    };
    decryptAll();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue, 'text');
      setInputValue('');
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (inputValue.trim()) {
      onTyping(true);
      const timeout = setTimeout(() => onTyping(false), 3000);
      return () => clearTimeout(timeout);
    } else {
      onTyping(false);
    }
  }, [inputValue, onTyping]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const { url } = await response.json();
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
        onSendMessage(file.name, type, url);
      } catch (error) {
        console.error('File upload error:', error);
        alert('Failed to upload file. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const [showDeletionMenu, setShowDeletionMenu] = useState<string | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) { // Check if it's not just a click
          await uploadVoiceMessage(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('Microphone not found. Please ensure you have a recording device connected.');
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
      } else {
        alert('Could not access microphone: ' + (error.message || 'Unknown error'));
      }
      setIsRecording(false);
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) {
        // Clear chunks if we don't want to send
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const uploadVoiceMessage = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'voice_message.webm');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      onSendMessage('Voice Message', 'voice', url);
    } catch (error) {
      console.error('Voice message upload error:', error);
      alert('Failed to send voice message.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = (messageId: string, forEveryone: boolean) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId, forEveryone);
    }
    setShowDeletionMenu(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 border-l border-slate-800 relative overflow-hidden">
      {/* Search Overlay Header if active */}
      {isSearching ? (
        <div className="flex flex-col z-30 bg-slate-900 absolute top-0 left-0 w-full border-b border-slate-800">
          <div className="h-16 px-4 flex items-center gap-3">
            <button 
              onClick={() => { 
                setIsSearching(false); 
                setMsgSearchQuery(''); 
                setSelectedType('all');
                setStartDate('');
                setEndDate('');
                setShowFilters(false);
              }} 
              className="p-2 text-slate-500 hover:text-white"
            >
              <PlusCircle className="rotate-45" size={24} />
            </button>
            <div className="flex-1 flex items-center bg-slate-800 rounded-full px-4 py-1.5 focus-within:ring-1 focus-within:ring-indigo-500">
              <Search size={16} className="text-slate-500 mr-2" />
              <input 
                autoFocus
                value={msgSearchQuery}
                onChange={(e) => setMsgSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:ring-0"
              />
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  showFilters ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                <Filter size={16} />
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-900/50 backdrop-blur-md px-6 pb-4 flex flex-wrap gap-6 border-t border-slate-800/50"
              >
                <div className="flex flex-col gap-2 mt-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Media Type</span>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'all', label: 'All', icon: Search },
                      { id: 'image', label: 'Images', icon: Camera },
                      { id: 'video', label: 'Videos', icon: Film },
                      { id: 'file', label: 'Files', icon: FileText }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedType(t.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          selectedType === t.id 
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <t.icon size={14} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Range</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-slate-800 border-none rounded-lg text-xs text-slate-200 py-1.5 px-3 pl-8 focus:ring-1 focus:ring-indigo-500"
                      />
                      <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                    <span className="text-slate-600 text-xs">to</span>
                    <div className="relative">
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-slate-800 border-none rounded-lg text-xs text-slate-200 py-1.5 px-3 pl-8 focus:ring-1 focus:ring-indigo-500"
                      />
                      <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                    {(startDate || endDate) && (
                      <button 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between z-10 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={() => conversation.type === 'direct' ? onShowProfile(conversation.participants.find(id => id !== currentUser?.id) || '') : onOpenGroupSettings?.()}>
               <img 
                 src={conversation.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.id}`} 
                 className={cn(
                   "w-10 h-10 rounded-full border border-slate-700 p-0.5 shadow-lg",
                   conversation.type === 'group' ? "rounded-2xl" : "rounded-full"
                 )} 
                 alt={conversation.name} 
               />
               {conversation.type === 'direct' && (
                 <div className={cn(
                   "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900",
                   allUsers[conversation.participants.find(id => id !== currentUser?.id) || '']?.status === 'online' ? "bg-emerald-500" : 
                   allUsers[conversation.participants.find(id => id !== currentUser?.id) || '']?.status === 'away' ? "bg-amber-400" : "bg-slate-500"
                 )}></div>
               )}
             </div>
             <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <h2 className="text-sm font-bold text-white leading-tight">{conversation.name}</h2>
                 {conversation.type === 'group' && (
                   <div className="bg-indigo-500/20 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-indigo-500/30">Group</div>
                 )}
               </div>
               <p className="text-[11px] text-zinc-500 font-medium tracking-tight">
                 {conversation.type === 'group' ? `${conversation.participants.length} Active Members` : 
                   allUsers[conversation.participants.find(id => id !== currentUser?.id) || '']?.status === 'online' ? 'Active now' : 
                   allUsers[conversation.participants.find(id => id !== currentUser?.id) || '']?.status === 'away' ? 'Away' : 
                   `Last seen ${allUsers[conversation.participants.find(id => id !== currentUser?.id) || '']?.lastSeen ? formatTime(allUsers[conversation.participants.find(id => id !== currentUser?.id) || '']?.lastSeen) : 'some time ago'}`
                 }
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {conversation.type === 'group' && (
              <button 
                onClick={onOpenGroupSettings}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700/50 mr-2"
              >
                <Settings size={14} className="text-indigo-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Group Settings</span>
              </button>
            )}
            <button 
              onClick={() => onStartCall('voice')}
              className="p-2 text-indigo-400 hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <Phone size={20} />
            </button>
            <button 
              onClick={() => onStartCall('video')}
              className="p-2 text-indigo-400 hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <Video size={20} />
            </button>
            <button 
              onClick={() => setIsSearching(true)}
              className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-all"
            >
              <Info size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4 no-scrollbar bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.05),transparent_70%)]">
        <div className="flex flex-col items-center mb-10 py-10">
          <div className="relative mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onShowProfile(conversation.participants.find(id => id !== currentUser?.id) || '')}>
            <img 
              src={conversation.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conversation.id}`} 
              className="w-24 h-24 rounded-full border-2 border-slate-800 p-1" 
              alt={conversation.name} 
            />
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-900"></div>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{conversation.name}</h3>
          <p className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full uppercase tracking-widest">Today</p>
        </div>

        <AnimatePresence initial={false}>
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.id;
            const content = msg.isEncrypted ? (decryptedMessages[msg.id] || 'Decrypting...') : msg.content;
            const nextMsg = messages[idx + 1];
            const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                key={msg.id}
                className={cn(
                  "flex items-end gap-3 max-w-[80%] group",
                  isMe ? "self-end flex-row-reverse" : "self-start flex-row"
                )}
              >
                {!isMe && isLastInGroup && (
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} 
                    className="w-8 h-8 rounded-full shrink-0 border border-slate-700 cursor-pointer hover:opacity-80 transition-opacity" 
                    alt="Sender" 
                    onClick={() => onShowProfile(msg.senderId)}
                  />
                )}
                {!isMe && !isLastInGroup && <div className="w-8" />}

                <div className={cn("flex flex-col relative group/msg", isMe ? "items-end" : "items-start")}>
                  {/* Context Menu for Deletion */}
                  <AnimatePresence>
                    {showDeletionMenu === msg.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className={cn(
                          "absolute bottom-full mb-2 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1 w-40 overflow-hidden",
                          isMe ? "right-0" : "left-0"
                        )}
                      >
                        <button 
                          onClick={() => handleDelete(msg.id, false)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <EyeOff size={14} />
                          Delete for me
                        </button>
                        {isMe && !msg.isDeletedForEveryone && (
                          <button 
                            onClick={() => handleDelete(msg.id, true)}
                            className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2 border-t border-slate-700/50 mt-1 pt-2"
                          >
                            <X size={14} />
                            Delete for all
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    onClick={() => !msg.isDeletedForEveryone && setShowDeletionMenu(showDeletionMenu === msg.id ? null : msg.id)}
                    className={cn(
                      "px-4 py-2.5 text-sm leading-relaxed shadow-lg transition-all active:scale-[0.98] cursor-pointer",
                      isMe 
                        ? "bg-indigo-600 text-white rounded-2xl rounded-br-none" 
                        : "bg-slate-800 text-slate-200 rounded-2xl rounded-bl-none",
                      msg.type !== 'text' && "p-2 bg-slate-800/50 border border-slate-700",
                      msg.isDeletedForEveryone && "opacity-50 italic text-xs py-2 line-through decoration-slate-400/50"
                    )}
                  >
                    {msg.type === 'text' && <p>{content}</p>}
                    {msg.type === 'image' && (
                      <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <img src={msg.mediaUrl} className="max-w-full max-h-80 object-cover" alt="Shared" />
                      </div>
                    )}
                    {msg.type === 'video' && (
                      <video src={msg.mediaUrl} controls className="rounded-xl max-w-full max-h-80 border border-slate-700 shadow-2xl" />
                    )}
                    {msg.type === 'file' && (
                      <div className="p-3 bg-slate-900 rounded-xl flex items-center gap-3 border border-slate-700 w-64">
                        <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                           <StickyNote size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-slate-100 truncate font-semibold">{msg.content}</span>
                          <span className="text-[10px] text-slate-500 uppercase">Binary File</span>
                        </div>
                      </div>
                    )}
                    {msg.type === 'voice' && (
                      <div className="flex items-center gap-3 py-1 min-w-[200px]">
                        <button className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-colors">
                          <Play size={18} fill="currentColor" />
                        </button>
                        <div className="flex-1 flex flex-col gap-1.5 pt-1">
                          <div className="h-1 bg-slate-700 rounded-full w-full relative">
                            <div className="absolute left-0 top-0 h-full w-1/3 bg-indigo-500 rounded-full"></div>
                          </div>
                          <div className="flex justify-between items-center px-0.5">
                            <span className="text-[9px] font-bold text-slate-500">0:12</span>
                            <span className="text-[9px] font-bold text-slate-500">Voice Note</span>
                          </div>
                        </div>
                        {/* Audio element could be integrated here for actual playback */}
                      </div>
                    )}
                  </div>
                  {isLastInGroup && (
                    <span className="text-[10px] text-slate-500 mt-1.5 font-medium tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {typingUsers.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-1"
          >
            <div className="flex gap-1 bg-slate-800/50 px-3 py-2 rounded-2xl rounded-bl-none border border-slate-700/50 shadow-sm">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
              {typingUsers.length === 1 ? 'Somebody is typing...' : 'Several people are typing...'}
            </span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Sleek Input Footer */}
      <div className="p-4 shrink-0 bg-slate-900/80 border-t border-slate-800 backdrop-blur-md">
        {isRecording ? (
          <div className="flex items-center gap-4 bg-slate-800/80 p-2 rounded-2xl border border-indigo-500/50 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3 px-4 flex-1">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
              <span className="text-sm font-bold text-slate-200 tabular-nums">Recording {formatDuration(recordingDuration)}</span>
              <div className="flex-1 px-4">
                <div className="h-1 bg-slate-700/50 rounded-full flex gap-0.5 items-center justify-center p-0.5">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className="flex-1 h-3 bg-indigo-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.05}s` }}></div>
                   ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => stopRecording(false)}
                className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => stopRecording(true)}
                className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center"
              >
                <StopCircle size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700 transition-all focus-within:border-indigo-500/50 focus-within:bg-slate-800/80 shadow-inner">
            <div className="flex items-center">
              {isUploading ? (
                <div className="p-2 text-indigo-400 animate-spin">
                  <PlusCircle size={22} className="opacity-50" />
                </div>
              ) : (
                <label className="p-2 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer rounded-xl hover:bg-slate-700/50">
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*,.pdf,.doc,.docx,.txt" />
                  <PlusCircle size={22} />
                </label>
              )}
              <button type="button" className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-xl hover:bg-slate-700/50 group">
                <Image size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
              <input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Aa"
                className="flex-1 bg-transparent border-none text-sm text-slate-200 focus:ring-0 placeholder-slate-500"
              />
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type={inputValue.trim() ? "submit" : "button"}
                onClick={() => !inputValue.trim() && startRecording()}
                className={cn(
                  "p-2.5 rounded-xl transition-all flex items-center justify-center",
                  inputValue.trim() 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : "text-slate-400 hover:text-indigo-400"
                )}
              >
                {inputValue.trim() ? <Send size={20} /> : <Mic size={20} />}
              </motion.button>
              
              {!inputValue.trim() && (
                <button 
                onClick={() => setIsSearching(!isSearching)}
                className="p-2.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-xl hover:bg-slate-700/50"
                >
                  <Search size={22} />
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
