"use client";

import AdminLayout from "@/app/(admin)/layout";
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useUser } from "@/hooks/useUser";
import { useProviders, Provider } from '@/hooks/useProviders';
/* ------------ Types ------------ */
type ApiResponse<T> = { success: boolean; message: string; data: T };

type Message = {
    id: number;
    sender: string;
    recipient: string;
    time: string;
    createdAt: number;
    subject: string;
    body: string;
    folder: string;
    avatar?: { initials: string; color: string };
    isRead?: boolean;
    thread?: MessageThread[];
    type?: 'patient' | 'provider';
    who?: string;
    preview?: string;
    when?: string;
    unread?: boolean;
    lastActive?: string;
    username?: string;
    status?: 'sent' | 'delivered' | 'read' | 'responded';
    deliveredAt?: number;
    readAt?: number;
    respondedAt?: number;
    providerId?: number; // Add providerId for messaging
};

type MessageThread = {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    isUser: boolean;
    avatar?: string;
    attachments?: Attachment[];
};

type CommunicationDto = {
    id: number;
    subject: string;
    payload: string;
    status: string;
    fromName?: string;
    toNames?: string[];
    createdDate?: string;
    inResponseTo?: number;
    fromType?: 'provider' | 'patient';
    attachmentIds?: string;
};

type ProviderDto = {
    id: number;
    fullName: string;
    title?: string;
    phone?: string;
    email: string;
    identification: {
        firstName: string;
        lastName: string;
    };
    professionalDetails: {
        specialty?: string;
        location?: string;
        workingHours?: string;
        experience?: string;
        languages?: string[];
    };
};

type Attachment = {
    id: string;
    fileName: string;
    contentType: string;
    fileSize?: number;
    uploadedAt: string;
    uploadedBy?: string;
    downloadUrl?: string;
    type: 'image' | 'pdf' | 'document' | 'other';
};


// Define proper types for conversation items
type ConversationItem = {
    id: string;
    sender: string;
    recipient: string;
    time: string;
    preview?: string;
    unread?: boolean;
    avatar?: { initials: string; color: string };
    type?: 'patient' | 'provider';
    lastActive?: string;
    username?: string;
};

const avatarColors = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-red-500 to-red-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-indigo-500 to-indigo-600",
];

/* ------------ Helpers ------------ */
function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(ts: number): string {
    const now = new Date().getTime();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    return (
        (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase()
    );
}

function generateUsername(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
}

/* ------------ Messaging Sidebar Component ------------ */

// Message Status Indicator Component
const MessageStatusIndicator: React.FC<{ status: Message['status']; className?: string }> = ({ status, className = '' }) => {
    const getStatusInfo = (status: Message['status']) => {
        switch (status) {
            case 'sent':
                return { icon: '✓', color: 'text-gray-400', tooltip: 'Sent' };
            case 'delivered':
                return { icon: '✓✓', color: 'text-gray-500', tooltip: 'Delivered' };
            case 'read':
                return { icon: '✓✓', color: 'text-blue-500', tooltip: 'Read' };
            case 'responded':
                return { icon: '↩️', color: 'text-green-500', tooltip: 'Responded' };
            default:
                return { icon: '○', color: 'text-gray-300', tooltip: 'Sending...' };
        }
    };

    const { icon, color, tooltip } = getStatusInfo(status);

    return (
        <span
            className={`text-xs ${color} ${className}`}
            title={tooltip}
        >
            {icon}
        </span>
    );
};

// Message Bubble Component
const MessageBubble: React.FC<{ message: Message; isCurrentUser: boolean; attachments?: Attachment[]; downloadAttachment: (messageId: number, attachmentId: string, fileName: string) => void }> = ({
    message,
    isCurrentUser,
    attachments = [],
    downloadAttachment
}) => {
    const isProviderMessage = message.type === 'provider';

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex flex-col max-w-xl ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                <div className="text-xs text-gray-500 mb-1 px-2 flex items-center gap-2">
                    {isCurrentUser ? (
                        <>
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span className="font-medium text-blue-600">You</span>
                        </>
                    ) : isProviderMessage ? (
                        <>
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="font-medium text-green-600">Provider</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span className="font-medium text-purple-600">Patient</span>
                        </>
                    )}
                </div>
                <div className={`p-3 rounded-2xl shadow-sm ${
                    isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : isProviderMessage
                        ? 'bg-green-500 text-white rounded-bl-none'
                        : 'bg-purple-500 text-white rounded-bl-none'
                }`}>
                    {message.body}
                </div>

                {/* Attachments */}
                {attachments && attachments.length > 0 && (
                    <div className={`mt-2 space-y-2 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {attachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className={`flex items-center gap-2 p-2 rounded-lg max-w-xs ${
                                    isCurrentUser
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {/* File Icon */}
                                <div className="flex-shrink-0">
                                    {attachment.type === 'image' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                    {attachment.type === 'pdf' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    {attachment.type === 'document' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    {attachment.type === 'other' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                    {attachment.fileSize && (
                                        <p className="text-xs opacity-75">
                                            {(attachment.fileSize / 1024).toFixed(1)} KB
                                        </p>
                                    )}
                                </div>

                                {/* Download Button */}
                                <button
                                    onClick={() => downloadAttachment(parseInt(message.id.toString()), attachment.id, attachment.fileName)}
                                    className={`p-1 rounded hover:bg-black hover:bg-opacity-20 transition-colors ${
                                        isCurrentUser ? 'hover:bg-white hover:bg-opacity-20' : ''
                                    }`}
                                    title="Download attachment"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-2">
                    <span>{message.time}</span>
                    {isCurrentUser && message.status && (
                        <MessageStatusIndicator status={message.status} />
                    )}
                    {/* Read receipt for patient messages */}
                    {!isCurrentUser && message.readAt && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Read {message.readAt ? formatRelativeTime(new Date(message.readAt).getTime()) : ''}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Message List Item Component
const MessageListItem: React.FC<{
    item: ConversationItem;
    isActive: boolean;
    onSelect: (id: string) => void
}> = ({ item, isActive, onSelect }) => (
    <div
        className={`flex items-start p-4 cursor-pointer border-b border-gray-100 ${
            isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => onSelect(item.id)}
    >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
            item.avatar?.color || 'bg-green-500'
        }`}>
            {item.avatar?.initials || 'U'}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${isActive ? 'text-black' : 'text-gray-900'}`}>
                        {item.sender}
                    </span>
                    {item.type === 'provider' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Provider
                        </span>
                    )}
                    {item.type === 'patient' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Patient
                        </span>
                    )}
                </div>
                <span className="text-xs text-gray-500">{item.time}</span>
            </div>
            <p className={`text-sm truncate ${isActive ? 'text-gray-700' : 'text-gray-600'}`}>
                {item.preview || 'No preview available'}
            </p>
        </div>
    </div>
);

// Profile Sidebar Component - For Patient View
const ProfileSidebar: React.FC<{ selectedConversation: Message | null; providerInfo: ProviderDto | null; loadingProvider: boolean }> = ({
    selectedConversation,
    providerInfo,
    loadingProvider
}) => {
    if (!selectedConversation) return null;

    return (
        <>
             <div className="w-full h-full bg-gradient-to-br from-white via-blue-50 to-indigo-100 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/20 flex-shrink-0">
                    <div className="text-center mb-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-xl ring-4 ring-white ${selectedConversation.avatar?.color || 'bg-gradient-to-r from-blue-500 via-purple-500 to-green-500'}`}>
                            {selectedConversation.avatar?.initials || 'U'}
                        </div>
                        <h3 className="font-bold text-xl mb-2 text-gray-800">
                            {providerInfo ? providerInfo.fullName : selectedConversation.sender}
                        </h3>
                        {providerInfo?.title && (
                            <p className="text-indigo-600 font-medium text-sm mb-2">{providerInfo.title}</p>
                        )}
                        <p className="text-gray-500 text-xs">{selectedConversation.when || selectedConversation.time}</p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto hide-scrollbar">
                    {/* Provider Information Section */}
                    {loadingProvider ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : providerInfo ? (
                        <div className="p-6 space-y-4">
                            {/* Contact Information */}
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800">
                                    <span className="text-lg">📞</span>
                                    Contact Information
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="text-sm font-medium text-gray-800">{providerInfo.email}</p>
                                        </div>
                                    </div>
                                    {providerInfo.phone && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Phone</p>
                                                <p className="text-sm font-medium text-gray-800">{providerInfo.phone}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Professional Details */}
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800">
                                    <span className="text-lg">⚕️</span>
                                    Professional Details
                                </h4>
                                <div className="space-y-3">
                                    {providerInfo.professionalDetails?.specialty && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Specialty</p>
                                                <p className="text-sm font-medium text-gray-800">{providerInfo.professionalDetails.specialty}</p>
                                            </div>
                                        </div>
                                    )}
                                    {providerInfo.professionalDetails?.location && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                                                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Location</p>
                                                <p className="text-sm font-medium text-gray-800">{providerInfo.professionalDetails.location}</p>
                                            </div>
                                        </div>
                                    )}
                                    {providerInfo.professionalDetails?.workingHours && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                                                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Working Hours</p>
                                                <p className="text-sm font-medium text-gray-800">{providerInfo.professionalDetails.workingHours}</p>
                                            </div>
                                        </div>
                                    )}
                                    {providerInfo.professionalDetails?.experience && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mt-0.5">
                                                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Experience</p>
                                                <p className="text-sm font-medium text-gray-800">{providerInfo.professionalDetails.experience}</p>
                                            </div>
                                        </div>
                                    )}
                                    {providerInfo.professionalDetails?.languages && providerInfo.professionalDetails.languages.length > 0 && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mt-0.5">
                                                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0V1m10 3V1m0 3l1 1v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5l1-1z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Languages</p>
                                                <p className="text-sm font-medium text-gray-800">{providerInfo.professionalDetails.languages.join(', ')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Conversation Info */}
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800">
                                    <span className="text-lg">💬</span>
                                    Conversation Info
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                                        <span className="text-gray-600 block text-xs mb-1">Status</span>
                                        <p className="font-medium text-gray-800">{selectedConversation.status || 'Active'}</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                                        <span className="text-gray-600 block text-xs mb-1">Type</span>
                                        <p className="font-medium text-gray-800">{selectedConversation.type === 'provider' ? 'Provider Message' : 'Patient Message'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Fallback when no provider info is available */
                        <div className="p-6 space-y-4">
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50">
                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-800">
                                    <span className="text-lg">💬</span>
                                    Conversation Info
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                                        <span className="text-gray-600 block text-xs mb-1">Status</span>
                                        <p className="font-medium text-gray-800">{selectedConversation.status || 'Active'}</p>
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg">
                                        <span className="text-gray-600 block text-xs mb-1">Type</span>
                                        <p className="font-medium text-gray-800">{selectedConversation.type === 'provider' ? 'Provider Message' : 'Patient Message'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

/* ------------ Main Component ------------ */
export default function MessagingPage() {
    const { user } = useUser();
    const { searchProviders } = useProviders();
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Message[]>([]);
    const hydratedOnce = useRef(false);

    // Fiverr-style conversation state
    const [selectedConversation, setSelectedConversation] = useState<Message | null>(null);

    // Message input state
    const [replyBody, setReplyBody] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const replyInputRef = useRef<HTMLTextAreaElement>(null); // Changed to HTMLTextAreaElement

    // File attachment state for replies
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    // Enhanced new message state
    const [messageCategory, setMessageCategory] = useState<'general' | 'appointment' | 'reports' | 'billing' | 'prescription' | 'other'>('general');
    const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
    const [selectedQuickQuestion, setSelectedQuickQuestion] = useState<string>('');
    const [dragActive, setDragActive] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [newMessageBody, setNewMessageBody] = useState<string>('');
    const [newMessageFiles, setNewMessageFiles] = useState<File[]>([]);
    const [showProviderSearch, setShowProviderSearch] = useState(false);
    const [providerSearchQuery, setProviderSearchQuery] = useState('');

    // Quick questions by category
    const quickQuestionsData = {
        appointment: [
            "I need to reschedule my appointment",
            "Can I get a reminder for my upcoming appointment?",
            "What should I bring to my appointment?",
            "How do I prepare for my appointment?",
            "Can I request a specific time for my appointment?"
        ],
        reports: [
            "Can you explain my lab results?",
            "When will my test results be available?",
            "I have questions about my recent report",
            "Can I get a copy of my medical records?",
            "What do these test results mean?"
        ],
        billing: [
            "I have a question about my bill",
            "Can you explain these charges?",
            "I need help with insurance claims",
            "When will I receive my bill?",
            "How can I update my payment information?"
        ],
        prescription: [
            "I need a prescription refill",
            "Can you explain how to take this medication?",
            "I'm experiencing side effects from my medication",
            "When will my prescription be ready?",
            "Can I get a different medication?"
        ],
        other: [
            "I have a general question about my health",
            "I need to update my contact information",
            "Can you help me with my account?",
            "I have feedback about my care",
            "I need to request a referral"
        ]
    };

    // Notification state
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    // WebSocket disabled - using polling instead
    // const wsRef = useRef<WebSocket | null>(null);
    // const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // WebSocket disabled - using polling instead
    const [isConnected] = useState(false); // Always false since WebSocket is disabled

    // Provider online/typing status
    // WebSocket disabled - typing indicators not available
    const [providerTyping] = useState(false); // Always false since WebSocket is disabled
    const [providerOnline] = useState(true); // Assume online for now

    // Provider information state
    const [providerInfo, setProviderInfo] = useState<ProviderDto | null>(null);
    const [loadingProvider, setLoadingProvider] = useState(false);
    const [messageAttachments, setMessageAttachments] = useState<Record<number, Attachment[]>>({});
    const [loadingAttachments, setLoadingAttachments] = useState(false);

    /* ---- Derived Data ---- */

    // Convert backend messages to conversation items
    const conversationItems: ConversationItem[] = useMemo(() => {
        return conversations.map(msg => ({
            id: msg.id.toString(),
            sender: msg.sender,
            recipient: msg.recipient,
            time: formatRelativeTime(msg.createdAt),
            preview: msg.preview || msg.body.slice(0, 50) + (msg.body.length > 50 ? '...' : ''),
            unread: msg.unread,
            avatar: msg.avatar,
            type: msg.type,
            lastActive: msg.lastActive,
            username: msg.username
        }));
    }, [conversations]);


    /* ---- Notification ---- */
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    /* ---- Load Message Attachments ---- */
    const loadMessageAttachments = useCallback(async (messageId: number): Promise<Attachment[]> => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/portal/messages/${messageId}/attachments`
            );

            if (!res.ok) {
                console.warn(`Failed to load attachments for message ${messageId}:`, res.status);
                return [];
            }

            const json: ApiResponse<any[]> = await res.json();
            if (json.success && json.data) {
                return json.data.map(attachment => ({
                    id: String(attachment.id),
                    fileName: attachment.fileName,
                    contentType: attachment.contentType,
                    fileSize: parseFloat(attachment.fileSize) || 0, // Convert string to number
                    uploadedAt: attachment.createdDate,
                    uploadedBy: attachment.uploadedBy,
                    type: getFileType(attachment.contentType, attachment.fileName),
                    downloadUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/portal/messages/${messageId}/attachments/${attachment.id}/download`
                }));
            }
            return [];
        } catch (error) {
            console.error('Failed to load message attachments:', error);
            return [];
        }
    }, []);

    /* ---- Download Attachment ---- */
    const downloadAttachment = async (messageId: number, attachmentId: string, fileName: string) => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/portal/messages/${messageId}/attachments/${attachmentId}/download`
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download attachment:', error);
            showNotification('Failed to download attachment', 'error');
        }
    };

    /* ---- Upload Message Attachment ---- */
    const uploadMessageAttachment = async (messageId: number, file: File): Promise<void> => {
        const formData = new FormData();
        
        // Create the dto object with only the fields that match the backend DTO
        const dto = {
            fileName: file.name,
            contentType: file.type,
            description: '', // Optional description
            category: 'attachment', // Default category
            type: getFileType(file.type, file.name) // Use our getFileType helper
        };

        // Append the dto as JSON string
        formData.append('dto', JSON.stringify(dto));
        // Append the actual file
        formData.append('file', file);

        const res = await fetchWithAuth(
            `${process.env.NEXT_PUBLIC_API_URL}/api/portal/messages/${messageId}/attachments`,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const json: ApiResponse<{ id: string }> = await res.json();
        if (!json.success) {
            throw new Error(json.message || 'Failed to upload attachment');
        }
    };

    /* ---- Upload Multiple Attachments ---- */
    const uploadMultipleAttachments = async (messageId: number, files: File[]): Promise<void> => {
        const uploadPromises = files.map(file => uploadMessageAttachment(messageId, file));
        await Promise.all(uploadPromises);
    };

    /* ---- Helper Functions ---- */
    const getFileType = (contentType: string | undefined, fileName?: string): 'image' | 'pdf' | 'document' | 'other' => {
        if (!contentType && fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            switch (ext) {
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                case 'webp':
                    return 'image';
                case 'pdf':
                    return 'pdf';
                case 'doc':
                case 'docx':
                case 'txt':
                case 'rtf':
                    return 'document';
                default:
                    return 'other';
            }
        }

        if (contentType?.startsWith('image/')) return 'image';
        if (contentType === 'application/pdf') return 'pdf';
        if (contentType?.includes('document') || contentType?.includes('text')) return 'document';
        return 'other';
    };

    /* ---- Load Provider Info ---- */
    const loadProviderInfo = useCallback(async (providerId: number) => {
        if (!providerId) return;

        setLoadingProvider(true);
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/fhir/portal/providers/${providerId}`
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json: ApiResponse<ProviderDto> = await res.json();
            if (json.success && json.data) {
                setProviderInfo(json.data);
            } else {
                console.warn('Provider not found:', providerId);
                setProviderInfo(null);
            }
        } catch (error) {
            console.error('Failed to load provider info:', error);
            setProviderInfo(null);
        } finally {
            setLoadingProvider(false);
        }
    }, []);

    // Load provider info when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            // Use providerId from the conversation
            const providerId = selectedConversation.providerId;

            if (providerId) {
                loadProviderInfo(providerId);
            } else {
                setProviderInfo(null);
            }
        } else {
            setProviderInfo(null);
        }
    }, [selectedConversation, loadProviderInfo]);

    const loadCommunications = useCallback(async () => {
        if (!user?.userId) return;

        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/portal/communications/my`
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                const mapped: Message[] = json.data.map((comm: { createdDate: string | number | Date; status: string; id: number; fromName: string; toNames: string[]; fromType: 'provider' | 'patient' | undefined; subject: string; payload: string; messageType?: string; providerId?: number; }) => {
                    const ts = comm.createdDate
                        ? new Date(comm.createdDate).getTime()
                        : Date.now();

                    let folder = "sent";
                    if (comm.status === "RECEIVED") folder = "inbox";
                    else if (comm.status === "ARCHIVED") folder = "archive";

                    const colorIndex = comm.id % avatarColors.length;
                    const senderName = comm.fromName || "Unknown User";
                    const recipientName = comm.toNames?.[0] || "Unknown Recipient";

                    // Use fromType directly from backend (already correct)
                    const messageType = comm.fromType || 'patient';

                    return {
                        id: comm.id,
                        sender: senderName,
                        recipient: recipientName,
                        subject: comm.subject,
                        body: comm.payload,
                        createdAt: ts,
                        time: formatTime(ts),
                        folder,
                        avatar: {
                            initials: initials(senderName),
                            color: avatarColors[colorIndex],
                        },
                        isRead: folder !== "inbox",
                        type: messageType,
                        who: comm.fromName,
                        preview: comm.payload.slice(0, 100) + (comm.payload.length > 100 ? '...' : ''),
                        when: formatTime(ts),
                        unread: folder === 'inbox',
                        lastActive: formatRelativeTime(ts),
                        username: generateUsername(senderName),
                        status: folder === 'inbox' ? 'read' : 'sent', // Basic status logic
                        deliveredAt: ts,
                        readAt: folder === 'inbox' ? ts : undefined,
                        respondedAt: undefined,
                        providerId: comm.providerId // Add providerId from backend
                    };
                });

                setMessages(mapped);
                setConversations(mapped);
            }
        } catch (error) {
            console.error('Failed to load communications:', error);
            showNotification('Failed to load messages', 'error');
        }
    }, [user?.userId]);

    useEffect(() => {
        if (hydratedOnce.current) return;
        hydratedOnce.current = true;
        void loadCommunications();
    }, [loadCommunications]);

    // Focus on input when conversation is selected
    useEffect(() => {
        if (selectedConversation && replyInputRef.current) {
            setTimeout(() => {
                if (replyInputRef.current) {
                    replyInputRef.current.focus();
                }
            }, 100);
        }
    }, [selectedConversation]);

    /* ---- WebSocket Connection for Real-time Updates (DISABLED - Using polling instead) ---- */
    // WebSocket disabled due to backend dependency issues
    // Using polling for real-time updates instead

    // Connect WebSocket on component mount (DISABLED)
    useEffect(() => {
        // WebSocket disabled - no connection needed
        return () => {
            // No cleanup needed since WebSocket is disabled
        };
    }, []);

    /* ---- Actions ---- */
    const markAsRead = async (id: number) => {
        try {
            setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, isRead: true, unread: false } : m))
            );
            setConversations((prev) =>
                prev.map((m) => (m.id === id ? { ...m, isRead: true, unread: false } : m))
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    /* ---- Send Reply ---- */
    const sendConversationReply = async () => {
        if (!selectedConversation || !replyBody.trim()) return;

        setIsTyping(true);
        try {
            // First, send the message reply
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/portal/communications/send`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        providerId: selectedConversation.providerId,
                        payload: replyBody.trim(),
                        subject: `Re: ${selectedConversation.subject}`,
                        inResponseTo: selectedConversation.id
                    }),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const json: ApiResponse<CommunicationDto> = await res.json();
            if (json.success && json.data) {
                // Now upload attachments to the message
                if (attachedFiles.length > 0) {
                    try {
                        await uploadMultipleAttachments(json.data.id, attachedFiles);
                        showNotification(`Message sent with ${attachedFiles.length} attachment(s)! ✨`, 'success');
                    } catch (error) {
                        console.error('Failed to upload attachments:', error);
                        showNotification(`Message sent but some attachments failed to upload`, 'error');
                    }
                } else {
                    showNotification('Reply sent successfully! ✨', 'success');
                }

                await loadCommunications();
                setReplyBody("");
                setAttachedFiles([]); // Clear attached files

                // Reset textarea height
                if (replyInputRef.current) {
                    replyInputRef.current.style.height = 'auto';
                }

                // Refocus on input after sending
                setTimeout(() => {
                    replyInputRef.current?.focus();
                }, 100);
            } else {
                throw new Error(json.message || 'Failed to send reply');
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            showNotification(`Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setIsTyping(false);
        }
    };

    // Send new message to provider
    const sendNewMessage = async () => {
        if (!selectedProvider || !newMessageBody.trim()) return;

        setIsTyping(true);
        try {
            // First, send the message
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/portal/communications/send`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        providerId: selectedProvider.id,
                        payload: newMessageBody.trim(),
                        subject: `Message from ${user?.firstName} ${user?.lastName}`
                    }),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const json: ApiResponse<CommunicationDto> = await res.json();
            if (json.success && json.data) {
                // Now upload attachments to the message
                if (newMessageFiles.length > 0) {
                    try {
                        await uploadMultipleAttachments(json.data.id, newMessageFiles);
                        showNotification(`Message sent with ${newMessageFiles.length} attachment(s)! ✨`, 'success');
                    } catch (error) {
                        console.error('Failed to upload attachments:', error);
                        showNotification(`Message sent but some attachments failed to upload`, 'error');
                    }
                } else {
                    showNotification('Message sent successfully! ✨', 'success');
                }

                await loadCommunications();
                setNewMessageBody("");
                setNewMessageFiles([]); // Clear attached files
                setSelectedProvider(null);
                setShowProviderSearch(false);
            } else {
                throw new Error(json.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            showNotification(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setIsTyping(false);
        }
    };

    // Get thread messages for selected conversation
    const getThreadMessages = useMemo(() => {
        if (!selectedConversation) return [];

        // Build thread by finding all messages in the conversation chain
        const threadIds = new Set<number>();
        const findThreadMessages = (messageId: number) => {
            if (threadIds.has(messageId)) return;
            threadIds.add(messageId);

            // Find messages that are replies to this message
            messages.forEach(msg => {
                if (msg.id === messageId) {
                    // This is part of our thread
                    threadIds.add(msg.id);
                }
            });

            // Also find messages that reference this message as inResponseTo
            // Note: We need to add inResponseTo to the Message type and mapping
            messages.forEach(msg => {
                // For now, check if subject indicates it's a reply to the same conversation
                if (msg.subject.includes(`Re: ${selectedConversation.subject.replace('Re: ', '')}`) ||
                    msg.subject === selectedConversation.subject) {
                    threadIds.add(msg.id);
                }
            });
        };

        findThreadMessages(selectedConversation.id);

        return Array.from(threadIds)
            .map(id => messages.find(msg => msg.id === id))
            .filter(Boolean)
            .sort((a, b) => (a?.createdAt || 0) - (b?.createdAt || 0))
            .map(msg => ({
                id: msg!.id.toString(),
                sender: msg!.sender,
                content: msg!.body,
                timestamp: msg!.time,
                // In patient portal: messages from current patient are patient type
                isUser: msg!.type === 'patient'
            }));
    }, [selectedConversation, messages]);

    // Load attachments for thread messages when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            const loadThreadAttachments = async () => {
                setLoadingAttachments(true);
                try {
                    const attachmentsMap: Record<number, Attachment[]> = {};

                    // Use getThreadMessages to get the actual message IDs
                    const threadMessages = getThreadMessages;
                    for (const threadMsg of threadMessages) {
                        const messageId = parseInt(threadMsg.id);
                        const attachments = await loadMessageAttachments(messageId);
                        if (attachments.length > 0) {
                            attachmentsMap[messageId] = attachments;
                            console.log(`Portal: Loaded ${attachments.length} attachments for message ${messageId}:`, attachments);
                        }
                    }

                    setMessageAttachments(attachmentsMap);
                } catch (error) {
                    console.error('Failed to load thread attachments:', error);
                } finally {
                    setLoadingAttachments(false);
                }
            };

            loadThreadAttachments();
        } else {
            setMessageAttachments({});
        }
    }, [selectedConversation, getThreadMessages, loadMessageAttachments]);

    /* ---- Fiverr-style Conversation View ---- */
    const ConversationView = () => (
        <div className="h-full bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
            <div className="h-full overflow-y-auto hide-scrollbar">
                <div className="flex min-h-full">
                {/* Left Side - Conversations List */}
                <div className="w-80 min-w-[200px] max-w-[400px] bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col shadow-inner resize-x overflow-hidden relative">
                    {/* Resize handle */}
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize z-10"></div>
                    {/* Conversations Header */}
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-green-50 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="text-2xl">💬</span>
                            CONVERSATIONS ({conversationItems.length})
                        </h3>
                    </div>
                    {/* Conversations List */}
                    <div className="flex-1">
                        <div className="p-4">
                            <div className="space-y-2">
                                {conversationItems.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="text-4xl mb-4">�</div>
                                        <p className="text-sm font-medium">No conversations yet</p>
                                        <p className="text-xs mt-1">Start a new conversation to get help</p>
                                    </div>
                                ) : (
                                    conversationItems.map((item) => (
                                        <MessageListItem
                                            key={item.id}
                                            item={item}
                                            isActive={selectedConversation?.id.toString() === item.id}
                                            onSelect={(id) => {
                                                const conversation = conversations.find(c => c.id.toString() === id);
                                                if (conversation) {
                                                    setSelectedConversation(conversation);
                                                    markAsRead(conversation.id);
                                                }
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Middle - Chat Area */}
                <div className="flex-1 min-w-[400px] flex flex-col relative h-full">
                    {/* Resize handle for left side */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize z-10 -ml-0.5"></div>
                    {selectedConversation ? (
                        <div className="flex flex-col h-full">
                            {/* Chat Header */}
                            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-green-50 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${selectedConversation?.avatar?.color || 'bg-green-500'}`}>
                                        {selectedConversation?.avatar?.initials || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="font-semibold text-lg">{providerInfo ? providerInfo.fullName : selectedConversation?.sender}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${providerOnline ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                                                {providerOnline ? 'Online' : 'Offline'}
                                            </span>
                                            {providerInfo?.email && (
                                                <span className="text-sm text-blue-600">
                                                    {providerInfo.email}
                                                </span>
                                            )}
                                            {providerTyping && (
                                                <span className="text-sm text-blue-600 italic">typing...</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                        <span className="text-xs text-gray-500">
                                            {isConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Messages Area */}
                            <div className="flex-1">
                                <div className="p-6 bg-gradient-to-b from-blue-50/50 to-white">
                                    <div className="max-w-3xl mx-auto">
                                        {/* Thread messages */}
                                        {getThreadMessages.map((threadMsg) => (
                                            <MessageBubble
                                                key={threadMsg.id}
                                                message={{
                                                    ...selectedConversation,
                                                    id: selectedConversation.id ?? 0,
                                                    body: threadMsg.content,
                                                    sender: threadMsg.sender,
                                                    time: threadMsg.timestamp
                                                }}
                                                isCurrentUser={threadMsg.isUser}
                                                attachments={messageAttachments[parseInt(threadMsg.id)] || []}
                                                downloadAttachment={downloadAttachment}
                                            />
                                        ))}
                                        {/* Typing Indicator */}
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>
                            </div>
                            {/* Reply Input */}
                            <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-blue-50 flex-shrink-0">
                                {/* File Attachments Preview */}
                                {attachedFiles.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {attachedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
                                                <span className="text-sm text-blue-700">{file.name}</span>
                                                <button
                                                    onClick={() => setAttachedFiles(files => files.filter((_, i) => i !== index))}
                                                    className="text-blue-400 hover:text-blue-600 transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Drag and Drop Area */}
                                <div
                                    className={`mb-3 border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 ${
                                        dragActive
                                            ? 'border-blue-400 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    onDragEnter={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragActive(false);
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDragActive(false);
                                        const files = Array.from(e.dataTransfer.files);
                                        // Filter for allowed file types
                                        const allowedFiles = files.filter(file => {
                                            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                                            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'];
                                            return allowedTypes.includes(file.type) ||
                                                   allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                                        });
                                        if (allowedFiles.length !== files.length) {
                                            showNotification('Some files were skipped. Only images, PDF, DOC, DOCX, and TXT files are allowed.', 'error');
                                        }
                                        setAttachedFiles(prev => [...prev, ...allowedFiles]);
                                    }}
                                >
                                    <div className="text-gray-500 mb-2">
                                        <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Drag & drop files here or use the attachment button
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Supported: Images, PDF, DOC, DOCX, TXT (max 10MB each)</p>
                                </div>

                                <div className="flex gap-3 items-end">
                                    {/* File Input */}
                                    <label className="flex items-center justify-center w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,.pdf,.doc,.docx,.txt"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                // Filter for allowed file types
                                                const allowedFiles = files.filter(file => {
                                                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                                                    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'];
                                                    return allowedTypes.includes(file.type) ||
                                                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                                                });
                                                if (allowedFiles.length !== files.length) {
                                                    showNotification('Some files were skipped. Only images, PDF, DOC, DOCX, and TXT files are allowed.', 'error');
                                                }
                                                setAttachedFiles(prev => [...prev, ...allowedFiles]);
                                                e.target.value = ''; // Reset input
                                            }}
                                            className="hidden"
                                        />
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </label>
                                    <textarea
                                        ref={replyInputRef}
                                        className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm bg-white"
                                        placeholder="Type a message..."
                                        value={replyBody}
                                        onChange={(e) => {
                                            setReplyBody(e.target.value);
                                            // Auto-resize
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                            // WebSocket typing indicators disabled
                                            // Using polling for real-time updates instead
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendConversationReply();
                                            }
                                        }}
                                        disabled={isTyping}
                                        rows={1}
                                        style={{ minHeight: '48px', maxHeight: '120px', overflowY: 'auto' }}
                                    />
                                    <button
                                        onClick={sendConversationReply}
                                        disabled={!replyBody.trim() && attachedFiles.length === 0 || isTyping}
                                        className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                        {isTyping ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center p-8">
                            <div>
                                <div className="text-6xl mb-4 opacity-20">💬</div>
                                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                                <p className="text-gray-500 mb-4">Choose a message to start chatting</p>
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                                >
                                    Back to Messages
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {/* Right Side - Provider Info */}
                {selectedConversation && (
                    <div className="w-80 min-w-[250px] max-w-[500px] bg-gradient-to-br from-white via-blue-50 to-indigo-100 flex-shrink-0 border-l border-gray-200 shadow-2xl overflow-hidden relative resize-x">
                        {/* Resize handle */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize z-10 -ml-0.5"></div>
                        <div className="h-full">
                            <ProfileSidebar
                                selectedConversation={selectedConversation}
                                providerInfo={providerInfo}
                                loadingProvider={loadingProvider}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );

    return (
        <AdminLayout>
            <div className="h-full bg-white">
                {/* Notification */}
                {notification && (
                    <div className={`fixed top-6 right-6 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
                        notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                        {notification.message}
                    </div>
                )}

                {/* Content Area */}
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 flex justify-between items-center border-b bg-white flex-shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                                My Messages
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Communicate securely with your healthcare providers
                            </p>
                        </div>
                        <button
                            onClick={() => setShowProviderSearch(true)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                        >
                            <span>+</span>
                            New Message
                        </button>
                    </div>
                    
                    {/* Conversation View */}
                    <div className="flex-1 overflow-hidden">
                        <ConversationView />
                    </div>
                </div>
            </div>

            {/* Enhanced New Message Modal - Compact & User-Friendly */}
            {showProviderSearch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">New Message</h2>
                                    <p className="text-blue-100 text-sm">Connect with your healthcare provider</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowProviderSearch(false);
                                        setSelectedProvider(null);
                                        setProviderSearchQuery('');
                                        setNewMessageBody('');
                                        setNewMessageFiles([]);
                                        setMessageCategory('general');
                                        setSelectedQuickQuestion('');
                                    }}
                                    className="text-white hover:text-blue-100 text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
                            {/* Compact Category Selection */}
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold mb-2 text-gray-800">What would you like to discuss?</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'appointment', label: 'Appointment', icon: '📅' },
                                        { id: 'reports', label: 'Reports', icon: '📋' },
                                        { id: 'billing', label: 'Billing', icon: '💳' },
                                        { id: 'prescription', label: 'Rx', icon: '💊' },
                                        { id: 'other', label: 'Other', icon: '❓' }
                                    ].map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => {
                                                setMessageCategory(category.id as 'appointment' | 'reports' | 'billing' | 'prescription' | 'other');
                                                setQuickQuestions(quickQuestionsData[category.id as keyof typeof quickQuestionsData] || []);
                                                setSelectedQuickQuestion('');
                                            }}
                                            className={`p-2 rounded-lg border transition-all text-xs ${
                                                messageCategory === category.id
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="text-lg mb-1">{category.icon}</div>
                                            <div className="font-medium">{category.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Questions - Compact */}
                            {quickQuestions.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold mb-2 text-gray-800">Quick Questions</h3>
                                    <div className="max-h-24 overflow-y-auto space-y-1">
                                        {quickQuestions.map((question, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setSelectedQuickQuestion(question);
                                                    setNewMessageBody(question);
                                                }}
                                                className={`w-full p-2 text-left rounded text-xs transition-all ${
                                                    selectedQuickQuestion === question
                                                        ? 'border border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Provider Search - Compact */}
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold mb-2 text-gray-800">Choose Provider</h3>
                                <input
                                    type="text"
                                    placeholder="Search providers..."
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    value={providerSearchQuery}
                                    onChange={(e) => setProviderSearchQuery(e.target.value)}
                                />

                                {/* Provider List - Compact */}
                                <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
                                    {searchProviders(providerSearchQuery).map((provider) => (
                                        <div
                                            key={provider.id}
                                            onClick={() => setSelectedProvider(provider)}
                                            className={`p-2 rounded-lg cursor-pointer transition-all border ${
                                                selectedProvider?.id === provider.id
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {initials(provider.fullName)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm text-gray-800 truncate">{provider.fullName}</h4>
                                                    <p className="text-xs text-gray-600 truncate">{provider.title}</p>
                                                </div>
                                                {selectedProvider?.id === provider.id && (
                                                    <div className="text-green-500">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Message Composition - Compact */}
                            {selectedProvider && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold mb-2 text-gray-800">
                                        Message to {selectedProvider.fullName}
                                    </h3>

                                    {/* File Upload - Enhanced */}
                                    <div className="mb-3">
                                        <div
                                            className={`border-2 border-dashed rounded-lg p-3 text-center transition-all ${
                                                dragActive
                                                    ? 'border-blue-400 bg-blue-50'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                            onDragEnter={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDragActive(true);
                                            }}
                                            onDragLeave={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDragActive(false);
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDragActive(false);
                                                const files = Array.from(e.dataTransfer.files);
                                                const allowedFiles = files.filter(file => {
                                                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                                                    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'];
                                                    return allowedTypes.includes(file.type) ||
                                                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                                                });
                                                if (allowedFiles.length !== files.length) {
                                                    showNotification('Some files were skipped. Only images, PDF, DOC, DOCX, and TXT files are allowed.', 'error');
                                                }
                                                setNewMessageFiles(prev => [...prev, ...allowedFiles]);
                                            }}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                <span className="text-xs text-gray-600">Drop files or</span>
                                                <label className="text-blue-500 hover:text-blue-600 cursor-pointer text-xs font-medium">
                                                    browse
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*,.pdf,.doc,.docx,.txt"
                                                        onChange={(e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            const allowedFiles = files.filter(file => {
                                                                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                                                                const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt'];
                                                                return allowedTypes.includes(file.type) ||
                                                                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                                                            });
                                                            if (allowedFiles.length !== files.length) {
                                                                showNotification('Some files were skipped. Only images, PDF, DOC, DOCX, and TXT files are allowed.', 'error');
                                                            }
                                                            setNewMessageFiles(prev => [...prev, ...allowedFiles]);
                                                            e.target.value = '';
                                                        }}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Images, PDF, DOC, DOCX, TXT (max 10MB each)</p>
                                        </div>

                                        {/* File Preview - Compact */}
                                        {newMessageFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {newMessageFiles.map((file, index) => (
                                                    <div key={index} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                                        <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span className="text-xs text-blue-700 truncate max-w-20">{file.name}</span>
                                                        <button
                                                            onClick={() => setNewMessageFiles(files => files.filter((_, i) => i !== index))}
                                                            className="text-blue-400 hover:text-blue-600 text-xs"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Input - Compact */}
                                    <textarea
                                        className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                                        placeholder="Type your message..."
                                        value={newMessageBody}
                                        onChange={(e) => setNewMessageBody(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {/* Action Buttons - Compact */}
                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <button
                                    onClick={() => {
                                        setShowProviderSearch(false);
                                        setSelectedProvider(null);
                                        setProviderSearchQuery('');
                                        setNewMessageBody('');
                                        setNewMessageFiles([]);
                                        setMessageCategory('general');
                                        setSelectedQuickQuestion('');
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={sendNewMessage}
                                    disabled={!selectedProvider || (!newMessageBody.trim() && newMessageFiles.length === 0) || isTyping}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2"
                                >
                                    {isTyping ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Send
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

