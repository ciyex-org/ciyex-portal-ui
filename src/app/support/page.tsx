"use client";

import AdminLayout from "@/app/(admin)/layout";
import { Phone, Mail, MessageSquare, Clock, ExternalLink } from "lucide-react";

export default function SupportPage() {
    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Get help with your patient portal account
                    </p>
                </div>

                {/* Contact Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ContactCard
                        icon={<Phone className="h-5 w-5 text-blue-600" />}
                        title="Call Us"
                        description="Speak with a support representative"
                        detail="Mon–Fri, 8am–5pm"
                        action="(555) 123-4567"
                        bg="bg-blue-50"
                    />
                    <ContactCard
                        icon={<Mail className="h-5 w-5 text-green-600" />}
                        title="Email Support"
                        description="Send us a message anytime"
                        detail="Response within 24 hours"
                        action="support@ciyex.org"
                        bg="bg-green-50"
                    />
                    <ContactCard
                        icon={<MessageSquare className="h-5 w-5 text-purple-600" />}
                        title="Send a Message"
                        description="Message your care team directly"
                        detail="Via the portal messaging feature"
                        href="/messages"
                        bg="bg-purple-50"
                    />
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-5 py-3.5 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900">
                            Frequently Asked Questions
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        <FaqItem
                            question="How do I update my personal information?"
                            answer="Navigate to your profile by clicking 'Edit Profile' in the top-right dropdown menu. From there, you can update your contact information, address, and other personal details."
                        />
                        <FaqItem
                            question="How do I schedule an appointment?"
                            answer="Go to the Appointments page and click 'Request Appointment'. Select your provider, choose a date and time, and submit your request. Your provider's office will confirm the appointment."
                        />
                        <FaqItem
                            question="How do I view my lab results?"
                            answer="Lab results are available under the 'Lab Results' section in the sidebar. Results will appear once your provider has reviewed and released them."
                        />
                        <FaqItem
                            question="How do I message my provider?"
                            answer="Use the Messages section in the sidebar to send secure messages to your care team. You'll be notified when they respond."
                        />
                        <FaqItem
                            question="I forgot my password. How do I reset it?"
                            answer="On the sign-in page, click 'Forgot Password' to receive a password reset link via email. If you signed in through your organization's SSO, contact your organization's IT department."
                        />
                        <FaqItem
                            question="How do I add or update my insurance information?"
                            answer="Go to the Insurance page from the sidebar. You can add primary, secondary, and tertiary coverage, including uploading images of your insurance cards."
                        />
                    </div>
                </div>

                {/* Office Hours */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <h2 className="text-sm font-semibold text-gray-900">
                            Support Hours
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Monday – Friday</span>
                            <span className="font-medium text-gray-900">8:00 AM – 5:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Saturday</span>
                            <span className="font-medium text-gray-900">9:00 AM – 12:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Sunday</span>
                            <span className="font-medium text-gray-500">Closed</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Emergency</span>
                            <span className="font-medium text-red-600">Call 911</span>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function ContactCard({
    icon, title, description, detail, action, href, bg,
}: {
    icon: React.ReactNode; title: string; description: string;
    detail: string; action?: string; href?: string; bg: string;
}) {
    const content = (
        <div className={`rounded-xl border border-gray-200 shadow-sm p-5 ${bg} hover:shadow-md transition-shadow`}>
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">{description}</p>
            <p className="text-xs text-gray-500 mb-3">{detail}</p>
            {action && (
                <p className="text-sm font-medium text-blue-600">{action}</p>
            )}
            {href && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                    Go to Messages <ExternalLink className="h-3 w-3" />
                </span>
            )}
        </div>
    );

    if (href) {
        return <a href={href}>{content}</a>;
    }
    return content;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
    return (
        <details className="group px-5 py-4">
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-900 list-none">
                {question}
                <svg
                    className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </summary>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{answer}</p>
        </details>
    );
}
