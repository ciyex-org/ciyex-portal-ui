"use client";

import React, { useState } from "react";
import VideoCallModal from "./VideoCallModal";

interface VideoCallButtonProps {
  appointmentId?: number;
  patientId?: number;
  providerId: number;
  patientName?: string;
  providerName?: string;
  roomName?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
  children?: React.ReactNode;
}

const VideoCallButton: React.FC<VideoCallButtonProps> = ({
  appointmentId,
  patientId,
  providerId,
  patientName,
  providerName,
  roomName,
  variant = "primary",
  size = "sm",
  className = "",
  children,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    outline: "border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-500",
    ghost: "text-green-600 hover:bg-green-50 focus:ring-green-500"
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base"
  };
  
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <>
      <button
        type="button"
        className={buttonClasses}
        onClick={() => setModalOpen(true)}
      >
        <svg 
          className="w-4 h-4 mr-2" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
          />
        </svg>
        {children || ""}
      </button>

      <VideoCallModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        appointmentId={appointmentId}
        patientId={patientId}
        providerId={providerId}
        patientName={patientName}
        providerName={providerName}
        roomName={roomName}
      />
    </>
  );
};

export default VideoCallButton;