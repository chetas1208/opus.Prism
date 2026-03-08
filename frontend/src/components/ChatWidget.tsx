"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Send, Volume2, VolumeX, X } from "lucide-react";

interface QuickAction {
    label: string;
    type: "navigate" | "api_call" | "prefill";
    value: string;
}

interface Link {
    label: string;
    url: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    quickActions?: QuickAction[];
    links?: Link[];
    ttsText?: string;
    isError?: boolean;
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioCache, setAudioCache] = useState<Record<string, string>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    const pathname = usePathname();
    const params = useParams();

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initial greeting when opened for first time
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            sendMessage("", true); // Send empty message to trigger initial greeting
        }
    }, [isOpen]);

    // Stop audio if TTS is disabled or widget closed
    useEffect(() => {
        if ((!isTtsEnabled || !isOpen) && currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
            setIsPlayingAudio(false);
        }
    }, [isTtsEnabled, isOpen]);

    const gatherContext = async () => {
        // Determine IDs from params or local storage
        const projectId = params?.projectId as string || null;
        const variantId = params?.variantId as string || null;
        let jobId = null;

        let personacutStatus = { state: "idle", progress: 0, message: "" };
        let qaStatus = { state: "idle", progress: 0, message: "" };
        let hasResults = false;
        let hasQaReport = false;

        // Try to fetch current status if we have IDs
        try {
            if (projectId && pathname.includes("/results")) {
                // We know results API requires the job to be done to fetch, 
                // but we'll try to guess if it's done by attempting to fetch it.
                // For a real robust setup we'd fetch the job ID from the project here, 
                // but for safety in the chatbot we can just check if results exist
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/projects/${projectId}/results`);
                    if (res.ok) hasResults = true;
                } catch (e) { /* ignore */ }
            }

            if (projectId && variantId && pathname.includes("/qa")) {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/projects/${projectId}/qa/${variantId}/report`);
                    if (res.ok) hasQaReport = true;
                } catch (e) { /* ignore */ }
            }
        } catch (e) {
            console.warn("Could not fetch full context for chatbot", e);
        }

        return {
            app: "PersonaCut+TextGuard",
            route: pathname,
            project_id: projectId,
            job_id: jobId,
            variant_id: variantId,
            personacut_status: personacutStatus,
            qa_status: qaStatus,
            has_results: hasResults,
            has_qa_report: hasQaReport,
            targets_count: 0, // Simplified for now
            recent_user_actions: [],
            recent_errors: [],
            available_routes: {
                home: "/",
                results: "/results/{projectId}",
                qa: "/qa/{projectId}/{variantId}"
            }
        };
    };

    const playTTS = async (text: string) => {
        if (!text || !isTtsEnabled) return;

        try {
            setIsPlayingAudio(true);

            // Stop current
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
            }

            // Check cache
            if (audioCache[text]) {
                const audio = new Audio(audioCache[text]);
                currentAudioRef.current = audio;
                audio.onended = () => setIsPlayingAudio(false);
                audio.play();
                return;
            }

            // Fetch new audio
            const formData = new FormData();
            formData.append("text", text);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/tts`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("TTS failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Cache it
            setAudioCache(prev => ({ ...prev, [text]: url }));

            // Play it
            if (isTtsEnabled && isOpen) {
                const audio = new Audio(url);
                currentAudioRef.current = audio;
                audio.onended = () => setIsPlayingAudio(false);
                audio.play();
            }
        } catch (err) {
            console.error("TTS Error:", err);
            setIsPlayingAudio(false);
        }
    };

    const sendMessage = async (text: string, isInitial: boolean = false) => {
        if (!text.trim() && !isInitial) return;

        if (!isInitial) {
            setMessages(prev => [...prev, { role: "user", content: text }]);
            setInputMessage("");
        }

        setIsLoading(true);

        try {
            const context = await gatherContext();

            // For the first message, if text is empty, send a hidden greeting prompt
            const messageToSend = isInitial ? "Hello! Please greet me and tell me what I can do on this current page." : text;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageToSend,
                    context: context
                })
            });

            if (!response.ok) throw new Error("Failed to get chat response");

            const data = await response.json();

            setMessages(prev => [...prev, {
                role: "assistant",
                content: data.message,
                quickActions: data.quick_actions,
                links: data.links,
                ttsText: data.tts_text
            }]);

            if (data.tts_text && isTtsEnabled) {
                playTTS(data.tts_text);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Sorry, I'm having trouble connecting right now. Please try again later.",
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionClick = (action: QuickAction) => {
        if (action.type === "prefill") {
            setInputMessage(action.value);
        } else if (action.type === "api_call" || action.type === "navigate") {
            sendMessage(action.label);
            if (action.type === "navigate") {
                window.location.href = action.value;
            }
        }
    };

    // Render markdown-ish text simply (bolding)
    const formatText = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-blue-400">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none text-sm">

            {/* Chat Panel */}
            {isOpen && (
                <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 w-80 md:w-96 rounded-2xl shadow-2xl shadow-blue-900/20 flex flex-col overflow-hidden mb-4 pointer-events-auto transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 h-[600px] max-h-[70vh]">

                    {/* Header */}
                    <div className="bg-slate-800/80 border-b border-blue-500/20 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-blue-500/30 bg-black/50">
                                <Image src="/logo_3d.png" alt="Logo" width={400} height={400} className="w-full h-full aspect-square object-cover rounded-full scale-[1.1]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">PersonaCut Assistant</h3>
                                <p className="text-xs text-blue-300/70">Workflow Guide</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                                className={`p-1.5 rounded-lg transition-colors ${isTtsEnabled ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700'}`}
                                title={isTtsEnabled ? "Disable Voice" : "Enable Voice"}
                            >
                                {isTtsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-inter">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === "user"
                                        ? "bg-blue-600 text-white rounded-br-none"
                                        : msg.isError
                                            ? "bg-red-900/50 border border-red-500/30 text-slate-200 rounded-bl-none"
                                            : "bg-slate-800 border border-blue-500/20 text-slate-200 rounded-bl-none"
                                        }`}
                                >
                                    <div className="leading-relaxed">{formatText(msg.content)}</div>
                                </div>

                                {/* Links */}
                                {msg.links && msg.links.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-1 w-[85%]">
                                        {msg.links.map((link, j) => (
                                            <a
                                                key={j}
                                                href={link.url}
                                                className="text-xs bg-blue-900/30 hover:bg-blue-800/50 border border-blue-500/30 transition-colors text-blue-300 py-1.5 px-3 rounded-lg flex items-center justify-between"
                                            >
                                                {link.label}
                                                <span className="text-blue-500/50">→</span>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Quick Actions */}
                                {msg.quickActions && msg.quickActions.length > 0 && i === messages.length - 1 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {msg.quickActions.map((action, j) => (
                                            <button
                                                key={j}
                                                onClick={() => handleActionClick(action)}
                                                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-300 py-1.5 px-3 rounded-full transition-colors"
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start">
                                <div className="bg-slate-800 border border-blue-500/20 text-slate-400 rounded-2xl rounded-bl-none px-4 py-3 flex space-x-2 items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-slate-800/50 border-t border-blue-500/20">
                        <form
                            onSubmit={(e) => { e.preventDefault(); sendMessage(inputMessage); }}
                            className="relative flex items-center"
                        >
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Ask for guidance..."
                                className="w-full bg-slate-900/80 border border-slate-700/50 text-white rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm placeholder:text-slate-500"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!inputMessage.trim() || isLoading}
                                className="absolute right-2 p-1.5 text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto bg-blue-600 hover:bg-blue-500 text-white rounded-full p-0 w-14 h-14 shadow-lg shadow-blue-500/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 overflow-hidden border-2 border-blue-400/30"
            >
                {isOpen ? (
                    <X size={24} />
                ) : (
                    <Image src="/logo_3d.png" alt="Open Assistant" width={400} height={400} className="w-full h-full aspect-square object-cover drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] rounded-full scale-[1.1] animate-blink bg-black/50" />
                )}
            </button>

            {/* Playing Audio Indicator */}
            {isPlayingAudio && !isOpen && (
                <div className="absolute top-0 right-16 pointer-events-none flex items-center space-x-1">
                    <div className="h-2 w-1 bg-blue-500 animate-pulse rounded-full" style={{ animationDuration: "0.5s" }} />
                    <div className="h-4 w-1 bg-blue-500 animate-pulse rounded-full" style={{ animationDuration: "0.7s" }} />
                    <div className="h-3 w-1 bg-blue-500 animate-pulse rounded-full" style={{ animationDuration: "0.6s" }} />
                </div>
            )}
        </div>
    );
}
