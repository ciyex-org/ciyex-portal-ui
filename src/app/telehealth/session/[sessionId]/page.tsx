"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useVideoCall } from "@/hooks/useVideoCall";
import type { VideoCallSession } from "@/lib/telehealth/VideoCallProvider";

/**
 * Generic patient telehealth session page.
 * Delegates all WebRTC/signaling to useVideoCall which auto-selects
 * the correct VideoCallProvider based on session.providerType from the API.
 */
export default function PatientTelehealthSessionPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = params?.sessionId as string;

    const role = searchParams?.get("role") ?? "patient";
    const displayName = role === "provider" ? "Provider" : "Patient";

    const [session, setSession] = useState<VideoCallSession | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [chatInput, setChatInput] = useState("");

    const localVideoRef  = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const {
        callStatus, videoEnabled, audioEnabled,
        remotePeers, chatMessages, error,
        toggleVideo, toggleAudio, sendChat, endCall,
    } = useVideoCall({ session, displayName, localVideoRef, remoteVideoRef });

    useEffect(() => {
        if (!sessionId) return;
        (async () => {
            try {
                const res = await fetchWithAuth(`/api/telehealth/sessions/${sessionId}`);
                if (!res.ok) throw new Error("Session not found. Please check the link from your provider.");
                const json = await res.json();
                setSession(json.data || json);
            } catch (err: any) {
                setSessionError(err.message || "Failed to load session");
            } finally {
                setLoadingSession(false);
            }
        })();
    }, [sessionId]);

    const handleEndCall = async () => {
        await endCall(false); // patient just leaves, doesn't end session
        setTimeout(() => router.push("/appointments"), 1200);
    };

    const handleSendChat = () => {
        sendChat(chatInput);
        setChatInput("");
    };

    // --- Render states ---

    if (loadingSession) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg text-gray-700 dark:text-gray-300">Joining your telehealth session...</p>
                <p className="text-sm text-gray-500 mt-2">Please allow camera and microphone access when prompted</p>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Join</h1>
                <p className="text-gray-500 text-center max-w-md mb-6">{sessionError}</p>
                <button onClick={() => router.push("/appointments")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Return to Appointments
                </button>
            </div>
        );
    }

    if (callStatus === "ended") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Call Ended</h1>
                <p className="text-gray-500 mt-2">Redirecting to appointments...</p>
            </div>
        );
    }

    // Iframe-based provider (Zoom, Doxy, etc.)
    if (session?.joinInfo?.joinUrl && !session?.joinInfo?.wsUrl && callStatus === "connected") {
        return (
            <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
                <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Telehealth Session</h1>
                            <p className="text-xs text-gray-500">{session?.providerName || "Your Provider"}</p>
                        </div>
                    </div>
                    <button onClick={handleEndCall} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                        Leave Call
                    </button>
                </header>
                <div className="flex-1">
                    <iframe
                        src={session.joinInfo.joinUrl}
                        className="w-full h-full border-0"
                        allow="camera; microphone; display-capture; fullscreen"
                        title="Telehealth Video Call"
                    />
                </div>
            </div>
        );
    }

    // WebRTC-based (mediasoup, Twilio, etc.)
    return (
        <div className="flex flex-col h-screen bg-gray-900">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Telehealth Session</h1>
                        <p className="text-xs text-gray-500">
                            {session?.providerName || "Your Provider"} &bull; {callStatus === "connected" ? "Connected" : "Connecting..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {error && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{error}</span>}
                    <span className="text-xs text-gray-400 hidden sm:block">Your session is secure and private</span>
                </div>
            </header>

            {/* Video area */}
            <div className="flex-1 relative flex">
                {/* Main (remote/provider) video */}
                <div className="flex-1 relative bg-gray-950">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {remotePeers.size === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <svg className="w-16 h-16 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-lg">Waiting for your provider to connect...</p>
                            <p className="text-gray-600 text-sm mt-1">Please keep this window open</p>
                        </div>
                    )}
                </div>

                {/* Local video (PiP) */}
                <div className="absolute bottom-4 right-4 w-44 h-32 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg bg-gray-800">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                    {!videoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Chat panel */}
                {showChat && (
                    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">Chat</span>
                            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`text-sm ${msg.senderName === displayName ? "text-right" : ""}`}>
                                    <span className="text-gray-500 text-xs">{msg.senderName}</span>
                                    <p className={`px-3 py-1.5 rounded-lg inline-block max-w-[90%] ${
                                        msg.senderName === displayName
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                    }`}>{msg.content}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSendChat()}
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button onClick={handleSendChat} className="text-blue-500 hover:text-blue-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-colors ${audioEnabled ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200" : "bg-red-600 text-white hover:bg-red-700"}`}
                    title={audioEnabled ? "Mute" : "Unmute"}
                >
                    {audioEnabled ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} /></svg>
                    )}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${videoEnabled ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200" : "bg-red-600 text-white hover:bg-red-700"}`}
                    title={videoEnabled ? "Turn off camera" : "Turn on camera"}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>

                <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-3 rounded-full transition-colors ${showChat ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200"}`}
                    title="Chat"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </button>

                <button
                    onClick={handleEndCall}
                    className="px-6 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                    <span className="text-sm font-medium">Leave Call</span>
                </button>
            </div>
        </div>
    );
}
