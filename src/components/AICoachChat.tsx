import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Compass, 
  Flame, 
  Target, 
  Zap,
  Clock,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { EXAM_METADATA } from '../data/curriculumData';

interface AICoachChatProps {
  profile: UserProfile;
  onNavigateTab: (tab: string) => void;
}

const COACH_QUICK_PROMPTS = [
  '🎯 Netlerim 70-75 bandında tıkandı, 85+ nete nasıl çıkarım?',
  '⏳ Denemelerde zamanım yetişmiyor, Turlama Tekniği nasıl uygulanır?',
  '🧠 Tarih ve coğrafyada öğrendiklerimi unutuyorum, tekrar stratejim ne olmalı?',
  '📊 Matematik problemlerinde hız ve yeni nesil soru taktikleri neler?',
  '🧘‍♂️ Sınav stresi ve odaklanma problemimi nasıl yönetebilirim?',
  '📅 Kalan sürede branş denemesi mi yoksa genel deneme mi ağırlıklı olmalı?',
];

export const AICoachChat: React.FC<AICoachChatProps> = ({
  profile,
  onNavigateTab,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-init',
        role: 'assistant',
        content: `Merhaba! Ben Snaps Yapay Zeka Sınav Koçun. 🎯\n\nHedefin: **${EXAM_METADATA[profile.targetExam]?.name}** (${profile.targetScore} Puan).\n\nSınav hazırlık sürecinde sana çalışma stratejisi, ders programı optimizasyonu, net artırma taktikleri, turlama tekniği ve motivasyon konularında 7/24 rehberlik edeceğim.\n\nBugün ne üzerinde çalışmak istiyorsun veya aklına takılan soru nedir?`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          examType: EXAM_METADATA[profile.targetExam]?.name,
          userContext: {
            targetScore: profile.targetScore,
            streakDays: profile.streakDays,
            dailyQuestionTarget: profile.dailyQuestionTarget,
            todayQuestionsSolved: profile.todayQuestionsSolved,
            examDate: profile.examDate,
          },
        }),
      });

      const data = await res.json();
      const replyContent = data.reply || 'Tavsiyelerim hazır! Hadi hedeflerine adım adım odaklanalım.';

      const assistantMsg: ChatMessage = {
        id: 'msg-' + Date.now() + 1,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          role: 'assistant',
          content: 'Bağlantıda bir aksaklık oldu ancak tavsiyem: Günlük soru hedefini aksatma ve haftalık deneme analizini mutlaka tamamla!',
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text to Speech
  const toggleSpeech = (msg: ChatMessage) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === msg.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = msg.content.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.05;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleClearChat = () => {
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
    setMessages([
      {
        id: 'msg-init-reset',
        role: 'assistant',
        content: `Koçluk odası yenilendi. ${EXAM_METADATA[profile.targetExam]?.shortName} için sana nasıl yardımcı olabilirim?`,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">
                Snaps 7/24 AI Sınav Koçu
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Çevrimiçi
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {EXAM_METADATA[profile.targetExam]?.name} için kişiselleştirilmiş rehberlik & motivasyon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('planner')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Haftalık Plan</span>
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
            title="Sohbeti Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Coaching Prompt Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Hızlı Koçluk Konuları:
        </span>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {COACH_QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              id={`quick-coach-prompt-${idx}`}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-300 text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl min-h-[480px] max-h-[600px] flex flex-col justify-between">
        
        {/* Messages Stream */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {messages.map((msg) => {
            const isAI = msg.role === 'assistant';
            const isThisSpeaking = speakingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in`}
              >
                {isAI && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                    isAI
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200 shadow-md'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {/* Content with formatting */}
                  <div className="whitespace-pre-wrap font-sans text-xs space-y-1">
                    {msg.content}
                  </div>

                  {/* Footer Info & Audio Button */}
                  <div
                    className={`flex items-center justify-between pt-1 border-t text-[10px] ${
                      isAI ? 'border-slate-800/80 text-slate-500' : 'border-indigo-500/50 text-indigo-200'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isAI && (
                      <button
                        onClick={() => toggleSpeech(msg)}
                        className={`flex items-center gap-1 hover:text-indigo-400 transition-colors ${
                          isThisSpeaking ? 'text-indigo-400 font-bold' : ''
                        }`}
                        title="Sesli Dinle"
                      >
                        {isThisSpeaking ? (
                          <>
                            <Volume2 className="w-3 h-3 animate-pulse" />
                            <span>Durdur</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Dinle</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {!isAI && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>Koç tavsiyesini hazırlıyor...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              id="coach-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Koçuna bir soru sor (Örn: Paragrafta hızlanmak için ne yapmalıyım?)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              id="coach-send-button"
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                isLoading || !input.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gönder</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
