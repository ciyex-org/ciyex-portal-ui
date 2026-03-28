"use client";

import { getEnv } from "@/utils/env";
import React, { useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import Alert from "@/components/ui/alert/Alert";

interface VideoCallModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId?: number;
  patientId?: number;
  providerId: number;
  patientName?: string;
  providerName?: string;
  roomName?: string;
}

interface JitsiJoinResponse {
  token: string;
  roomName: string;
  identity: string;
  meetingUrl: string;
  expiresIn: number;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({
  open,
  onClose,
  appointmentId,
  patientId,
  providerId, // Used for future provider-specific functionality
  patientName,
  providerName,
  roomName: providedRoomName,
}) => {
  const apiUrl = getEnv("NEXT_PUBLIC_BACKEND_URL") || 'http://localhost:8080';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [meetingUrl, setMeetingUrl] = useState<string>("");

  const generateRoomName = () => {
    if (providedRoomName) return providedRoomName;
    // For patient portal, we expect the room to already exist
    // Room name should match what provider created: apt{appointmentId}
    return appointmentId ? `apt${appointmentId}` : `patient${patientId}`;
  };

  const joinVideoCall = async () => {
    if (!appointmentId) {
      setError("Appointment ID is required to join the video call");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const roomName = generateRoomName();
      const identity = patientName || `Patient-${patientId || 'Unknown'}`;
      
      // Get patient join token for existing room
      const joinResponse = await fetchWithAuth(`${apiUrl}/api/telehealth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName,
          identity,
          ttlSeconds: 3600, // 1 hour
        }),
      });

      if (!joinResponse.ok) {
        const errorText = await joinResponse.text();
        if (joinResponse.status === 404) {
          throw new Error("Video call room not found. Please make sure your provider has started the video call.");
        }
        throw new Error(`Failed to get join token: ${errorText}`);
      }

      const joinData: JitsiJoinResponse = await joinResponse.json();
      
      if (joinData.meetingUrl) {
        // Open the meeting in a new window/tab
        window.open(joinData.meetingUrl, '_blank', 'width=1200,height=800');
        setSuccess("Joining video call... The meeting will open in a new window.");
        setMeetingUrl(joinData.meetingUrl);
      } else {
        throw new Error("No meeting URL received from server");
      }
    } catch (err) {
      console.error("Failed to join video call:", err);
      setError(err instanceof Error ? err.message : "Failed to join video call");
    } finally {
      setLoading(false);
    }
  };

  const copyMeetingLink = () => {
    if (meetingUrl) {
      navigator.clipboard.writeText(meetingUrl);
      setSuccess("Meeting link copied to clipboard!");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Join Video Call
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Appointment Details */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6m-7-8h8m-8 0V7a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2 2H9a2 2 0 01-2-2V7z"/>
            </svg>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Video Appointment
            </h3>
          </div>
          {appointmentId && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Appointment: #{appointmentId}
            </p>
          )}
          {providerName && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Provider: {providerName}
            </p>
          )}
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Ready to join your telehealth session
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4">
            <Alert variant="success" title="Success" message={success} />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!meetingUrl ? (
            <button
              onClick={joinVideoCall}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? "Joining..." : "Join Video Call"}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => window.open(meetingUrl, '_blank', 'width=1200,height=800')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Rejoin Video Call
              </button>
              
              <button
                onClick={copyMeetingLink}
                className="w-full border border-green-600 text-green-600 hover:bg-green-50 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Copy Meeting Link
              </button>
              
              {meetingUrl && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Meeting URL:
                  </label>
                  <div className="text-sm text-blue-700 dark:text-blue-300 break-all">
                    {meetingUrl}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Patient Instructions */}
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="flex items-center mb-2">
            <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h4 className="font-medium text-green-900 dark:text-green-100">
              Before You Join
            </h4>
          </div>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <li>• Ensure your provider has started the video call</li>
            <li>• Test your camera and microphone beforehand</li>
            <li>• Find a quiet, well-lit space for your appointment</li>
            <li>• The call will open in a new browser window</li>
            <li>• You can rejoin if disconnected during the session</li>
          </ul>
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;