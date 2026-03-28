"use client";
import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface BillingCardData {
    id: number;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
    paymentProcessor: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

const GpsBillingCard: React.FC = () => {
    const [cards, setCards] = useState<BillingCardData[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        cardNumber: "",
        expMonth: "",
        expYear: "",
        cvv: "",
    });

    useEffect(() => {
        loadGpsCards();
    }, []);

    const showToast = (message: string, type: "success" | "error") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    const getUserId = (): string | null => {
        if (typeof window === "undefined") return null;
        // Try userId from localStorage (set during auth)
        const userId = localStorage.getItem("userId");
        if (userId) return userId;
        // Try portalUserId
        const portalUserId = localStorage.getItem("portalUserId");
        if (portalUserId) return portalUserId;
        // Try to extract from user object
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.id || user.userId || user.portalUserId || null;
            }
        } catch {}
        return null;
    };

    const loadGpsCards = async () => {
        try {
            const userId = getUserId();
            if (!userId) {
                console.warn("No userId available for GPS card loading");
                return;
            }
            const response = await fetchWithAuth(`/api/gps/billing/cards/user/${userId}`);
            if (response.ok) {
                const result: ApiResponse<BillingCardData[]> = await response.json();
                if (result.success) {
                    setCards(result.data || []);
                }
            }
        } catch (error) {
            console.error("Failed to load GPS cards:", error);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : v;
    };

    const getCardBrand = (cardNumber: string): string => {
        const cleaned = cardNumber.replace(/\s/g, "");
        if (cleaned.startsWith("4")) return "visa";
        if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "mastercard";
        if (cleaned.startsWith("3")) return "amex";
        if (cleaned.startsWith("6")) return "discover";
        return "unknown";
    };

    const handleCardNumberChange = (value: string) => {
        const formatted = formatCardNumber(value);
        if (formatted.replace(/\s/g, '').length <= 16) {
            handleInputChange('cardNumber', formatted);
        }
    };

    const handleSubmit = async () => {
        if (!formData.firstName || !formData.lastName || !formData.cardNumber || !formData.expMonth || !formData.expYear || !formData.cvv) {
            showToast("Please fill in all required fields", "error");
            return;
        }

        const userId = getUserId();
        if (!userId) {
            showToast("Unable to identify user. Please sign in again.", "error");
            return;
        }

        setIsLoading(true);

        try {
            const brand = getCardBrand(formData.cardNumber);
            const last4 = formData.cardNumber.replace(/\s/g, "").slice(-4);

            const cardData = {
                ...formData,
                brand,
                last4,
                expMonth: parseInt(formData.expMonth),
                expYear: parseInt(formData.expYear),
                userId: parseInt(userId),
            };

            const response = await fetchWithAuth("/api/gps/billing/tokenize", {
                method: "POST",
                body: JSON.stringify(cardData),
            });

            if (response.ok) {
                const result: ApiResponse<BillingCardData> = await response.json();
                if (result.success) {
                    showToast("GPS card saved successfully!", "success");
                    setShowAddForm(false);
                    loadGpsCards();
                    setFormData({
                        firstName: "",
                        lastName: "",
                        street: "",
                        city: "",
                        state: "",
                        zip: "",
                        cardNumber: "",
                        expMonth: "",
                        expYear: "",
                        cvv: "",
                    });
                } else {
                    showToast(result.message || "Failed to save GPS card", "error");
                }
            } else {
                const errorData = await response.json().catch(() => null);
                showToast(errorData?.message || "Failed to save GPS card", "error");
            }
        } catch (error) {
            console.error("GPS card save error:", error);
            showToast("Failed to save GPS card", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteCard = async (cardId: number) => {
        try {
            const response = await fetchWithAuth(`/api/gps/billing/cards/${cardId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                showToast("GPS card deleted successfully", "success");
                loadGpsCards();
            } else {
                showToast("Failed to delete GPS card", "error");
            }
        } catch (error) {
            console.error("Failed to delete GPS card:", error);
            showToast("Failed to delete GPS card", "error");
        }
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">GPS Payment Cards</h3>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    Add GPS Card
                </button>
            </div>

            {/* Cards List */}
            <div className="space-y-4">
                {cards.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No GPS cards added yet.</p>
                ) : (
                    cards.map((card) => (
                        <div key={card.id} className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                                        {card.brand}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-white">
                                        •••• •••• •••• {card.last4}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Expires {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
                                    </p>
                                </div>
                                {card.isDefault && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                        Default
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => deleteCard(card.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Card Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Add GPS Card</h3>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="First Name *"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                />
                                <input
                                    type="text"
                                    placeholder="Last Name *"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                />
                            </div>

                            <input
                                type="text"
                                placeholder="Street Address"
                                value={formData.street}
                                onChange={(e) => handleInputChange('street', e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                disabled={isLoading}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                />
                                <input
                                    type="text"
                                    placeholder="State"
                                    value={formData.state}
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                />
                                <input
                                    type="text"
                                    placeholder="ZIP"
                                    value={formData.zip}
                                    onChange={(e) => handleInputChange('zip', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                />
                            </div>

                            <input
                                type="text"
                                placeholder="Card Number *"
                                value={formData.cardNumber}
                                onChange={(e) => handleCardNumberChange(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                disabled={isLoading}
                                maxLength={19}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <select
                                    value={formData.expMonth}
                                    onChange={(e) => handleInputChange('expMonth', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                >
                                    <option value="">Month *</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month.toString().padStart(2, '0')}>
                                            {month.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={formData.expYear}
                                    onChange={(e) => handleInputChange('expYear', e.target.value)}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                >
                                    <option value="">Year *</option>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                        <option key={year} value={year.toString()}>
                                            {year}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="CVV *"
                                    value={formData.cvv}
                                    onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                    disabled={isLoading}
                                    maxLength={4}
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Saving..." : "Save GPS Card"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 space-y-2 z-50">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-center justify-between p-3 rounded-lg shadow-lg text-white ${
                            toast.type === "success" ? "bg-green-600" : "bg-red-600"
                        }`}
                    >
                        <span>{toast.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className="ml-4 text-white font-bold"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GpsBillingCard;
