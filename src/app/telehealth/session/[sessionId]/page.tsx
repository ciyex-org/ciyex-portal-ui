"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { getTelehealthIdentity } from "@/utils/jwtHelper";
import { Device } from "mediasoup-client";
import { Client } from "@stomp/stompjs";

interface SessionData {
    id: string;
    roomName: string;
    status: string;
    patientId: string;
    patientName: string;
    providerName: string;
    mediasoupRoomId: string | null;
}

interface ChatMessage {
    senderId: string;
    senderName: string;
    content: string;
    sentAt: string;
}

export default function PatientTelehealthSessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params?.sessionId as string;

    const [session, setSession] = useState<SessionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting");

    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [remotePeers, setRemotePeers] = useState<Map<string, { displayName: string }>>(new Map());

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const deviceRef = useRef<Device | null>(null);
    const stompClientRef = useRef<Client | null>(null);
    const sendTransportRef = useRef<any>(null);
    const recvTransportRef = useRef<any>(null);
    const audioProducerRef = useRef<any>(null);
    const videoProducerRef = useRef<any>(null);
    const consumersRef = useRef<Map<string, any>>(new Map());
    const userIdRef = useRef<string>(getTelehealthIdentity());

    useEffect(() => {
        if (!sessionId) return;
        initSession();
        return () => cleanup();
    }, [sessionId]);

    const initSession = async () => {
        try {
            setLoading(true);

            const res = await fetchWithAuth(`/api/telehealth/sessions/${sessionId}`);
            if (!res.ok) throw new Error("Session not found. Please check the link from your provider.");
            const json = await res.json();
            const data = json.data || json;
            setSession(data);

            // Get local media
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Connect signaling
            await connectSignaling(data.id);

        } catch (err: any) {
            console.error("[telehealth] Init error:", err);
            setError(err.message || "Failed to join video call");
        } finally {
            setLoading(false);
        }
    };

    const connectSignaling = async (sid: string) => {
        const wsUrl = getEnv("NEXT_PUBLIC_TELEHEALTH_WS_URL") || `wss://telehealth-api.apps-dev.us-east.in.hinisoft.com/ws/telehealth`;

        const stompClient = new Client({
            brokerURL: wsUrl,
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            debug: (msg) => {
                if (msg.includes("ERROR")) console.error("[STOMP]", msg);
            },
        });

        stompClient.onConnect = () => {
            console.log("[telehealth] STOMP connected");

            stompClient.subscribe(`/user/${userIdRef.current}/queue/signal`, (message) => {
                const payload = JSON.parse(message.body);
                handleSignalingMessage(payload);
            });

            stompClient.subscribe(`/topic/session/${sid}/join`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === "peer-joined" && payload.peerId !== userIdRef.current) {
                    setRemotePeers(prev => new Map(prev).set(payload.peerId, { displayName: payload.displayName }));
                }
            });

            stompClient.subscribe(`/topic/session/${sid}/producer`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === "new-producer" && payload.peerId !== userIdRef.current) {
                    consumeTrack(sid, payload.producerId, payload.kind);
                }
            });

            stompClient.subscribe(`/topic/session/${sid}/leave`, (message) => {
                const payload = JSON.parse(message.body);
                if (payload.type === "peer-left") {
                    setRemotePeers(prev => {
                        const next = new Map(prev);
                        next.delete(payload.peerId);
                        return next;
                    });
                }
            });

            stompClient.subscribe(`/topic/session/${sid}/chat`, (message) => {
                const payload = JSON.parse(message.body);
                setChatMessages(prev => [...prev, payload]);
            });

            stompClient.publish({
                destination: `/app/session/${sid}/join`,
                body: JSON.stringify({
                    userId: userIdRef.current,
                    displayName: "Patient",
                }),
            });
        };

        stompClient.onStompError = (frame) => {
            console.error("[STOMP] Error:", frame.headers["message"]);
            setError("Connection error. Please try refreshing the page.");
        };

        stompClient.activate();
        stompClientRef.current = stompClient;
    };

    const handleSignalingMessage = async (payload: any) => {
        switch (payload.type) {
            case "joined":
                await setupMediasoup(payload);
                break;
            case "transport-connected":
                break;
            case "produced":
                break;
            case "consumed":
                await handleConsumed(payload);
                break;
            case "error":
                console.error("[telehealth] Server error:", payload.message);
                setError(payload.message);
                break;
        }
    };

    const setupMediasoup = async (joinData: any) => {
        try {
            const device = new Device();
            await device.load({ routerRtpCapabilities: joinData.routerRtpCapabilities });
            deviceRef.current = device;

            const sendTransport = device.createSendTransport({
                id: joinData.sendTransport.id,
                iceParameters: joinData.sendTransport.iceParameters,
                iceCandidates: joinData.sendTransport.iceCandidates,
                dtlsParameters: joinData.sendTransport.dtlsParameters,
                sctpParameters: joinData.sendTransport.sctpParameters,
                iceServers: joinData.iceServers || [],
            });

            sendTransport.on("connect", ({ dtlsParameters }, callback) => {
                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/connect-transport`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        transportId: sendTransport.id,
                        dtlsParameters,
                    }),
                });
                callback();
            });

            sendTransport.on("produce", ({ kind, rtpParameters, appData }, callback) => {
                const unsub = stompClientRef.current?.subscribe(
                    `/user/${userIdRef.current}/queue/signal`,
                    (message) => {
                        const data = JSON.parse(message.body);
                        if (data.type === "produced" && data.kind === kind) {
                            callback({ id: data.producerId });
                            unsub?.unsubscribe();
                        }
                    }
                );

                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/produce`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        transportId: sendTransport.id,
                        kind,
                        rtpParameters,
                        appData,
                    }),
                });
            });

            sendTransportRef.current = sendTransport;

            const recvTransport = device.createRecvTransport({
                id: joinData.recvTransport.id,
                iceParameters: joinData.recvTransport.iceParameters,
                iceCandidates: joinData.recvTransport.iceCandidates,
                dtlsParameters: joinData.recvTransport.dtlsParameters,
                sctpParameters: joinData.recvTransport.sctpParameters,
                iceServers: joinData.iceServers || [],
            });

            recvTransport.on("connect", ({ dtlsParameters }, callback) => {
                stompClientRef.current?.publish({
                    destination: `/app/session/${sessionId}/connect-transport`,
                    body: JSON.stringify({
                        userId: userIdRef.current,
                        transportId: recvTransport.id,
                        dtlsParameters,
                    }),
                });
                callback();
            });

            recvTransportRef.current = recvTransport;

            const stream = localStreamRef.current;
            if (stream) {
                const audioTrack = stream.getAudioTracks()[0];
                const videoTrack = stream.getVideoTracks()[0];
                if (audioTrack) audioProducerRef.current = await sendTransport.produce({ track: audioTrack });
                if (videoTrack) videoProducerRef.current = await sendTransport.produce({ track: videoTrack });
            }

            setCallStatus("connected");
        } catch (err: any) {
            console.error("[telehealth] mediasoup setup error:", err);
            setError("Failed to setup video: " + err.message);
        }
    };

    const consumeTrack = async (sid: string, producerId: string, kind: string) => {
        if (!deviceRef.current || !recvTransportRef.current) return;
        stompClientRef.current?.publish({
            destination: `/app/session/${sid}/consume`,
            body: JSON.stringify({
                userId: userIdRef.current,
                transportId: recvTransportRef.current.id,
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
            }),
        });
    };

    const handleConsumed = async (payload: any) => {
        if (!recvTransportRef.current) return;
        try {
            const consumer = await recvTransportRef.current.consume({
                id: payload.consumerId,
                producerId: payload.producerId,
                kind: payload.kind,
                rtpParameters: payload.rtpParameters,
            });
            consumersRef.current.set(consumer.id, consumer);
            stompClientRef.current?.publish({
                destination: `/app/session/${sessionId}/consumer-resume`,
                body: JSON.stringify({ consumerId: consumer.id }),
            });
            if (remoteVideoRef.current) {
                const existingStream = remoteVideoRef.current.srcObject as MediaStream | null;
                const stream = existingStream || new MediaStream();
                stream.addTrack(consumer.track);
                if (!existingStream) remoteVideoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error("[telehealth] Consume error:", err);
        }
    };

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setVideoEnabled(track.enabled);
        }
    }, []);

    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setAudioEnabled(track.enabled);
        }
    }, []);

    const endCall = useCallback(async () => {
        stompClientRef.current?.publish({
            destination: `/app/session/${sessionId}/leave`,
            body: JSON.stringify({ userId: userIdRef.current }),
        });
        cleanup();
        setCallStatus("ended");
        setTimeout(() => router.push("/appointments"), 1500);
    }, [sessionId, router]);

    const sendChat = useCallback(() => {
        if (!chatInput.trim() || !stompClientRef.current) return;
        stompClientRef.current.publish({
            destination: `/app/session/${sessionId}/chat`,
            body: JSON.stringify({
                senderId: userIdRef.current,
                senderName: "Patient",
                content: chatInput.trim(),
            }),
        });
        setChatInput("");
    }, [sessionId, chatInput]);

    const cleanup = () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        audioProducerRef.current?.close();
        videoProducerRef.current?.close();
        consumersRef.current.forEach(c => c.close());
        consumersRef.current.clear();
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();
        stompClientRef.current?.deactivate();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg text-gray-700 dark:text-gray-300">Joining your telehealth session...</p>
                <p className="text-sm text-gray-500 mt-2">Please allow camera and microphone access when prompted</p>
            </div>
        );
    }

    if (error && !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
                <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unable to Join</h1>
                <p className="text-gray-500 text-center max-w-md mb-6">{error}</p>
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
                    {error && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{error}</span>
                    )}
                    <span className="text-xs text-gray-400">Your session is secure and private</span>
                </div>
            </header>

            {/* Video area */}
            <div className="flex-1 relative flex">
                {/* Main video (remote / provider) */}
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
                                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} />
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
                                <div key={i} className={`text-sm ${msg.senderId === userIdRef.current ? "text-right" : ""}`}>
                                    <span className="text-gray-500 text-xs">{msg.senderName}</span>
                                    <p className={`px-3 py-1.5 rounded-lg inline-block max-w-[90%] ${
                                        msg.senderId === userIdRef.current
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                    }`}>
                                        {msg.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                                placeholder="Type a message..."
                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button onClick={sendChat} className="text-blue-500 hover:text-blue-400">
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
                <button onClick={toggleAudio}
                    className={`p-3 rounded-full transition-colors ${audioEnabled ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200" : "bg-red-600 text-white hover:bg-red-700"}`}
                    title={audioEnabled ? "Mute" : "Unmute"}>
                    {audioEnabled ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} /></svg>
                    )}
                </button>

                <button onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${videoEnabled ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200" : "bg-red-600 text-white hover:bg-red-700"}`}
                    title={videoEnabled ? "Turn off camera" : "Turn on camera"}>
                    {videoEnabled ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} /></svg>
                    )}
                </button>

                <button onClick={() => setShowChat(!showChat)}
                    className={`p-3 rounded-full transition-colors ${showChat ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200"}`}
                    title="Chat">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </button>

                <button onClick={endCall}
                    className="px-6 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                    title="End Call">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
                    <span className="text-sm font-medium">End Call</span>
                </button>
            </div>
        </div>
    );
}
