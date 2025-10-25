import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from 'react-i18next';
import '../i18n';

// Use only the values here and rely on i18n keys (categories.{{value}})
const CATEGORIES = [
    { value: "electronics" },
    { value: "furniture" },
    { value: "textbooks" },
    { value: "sports" },
    { value: "other" },
];

// Use only the values here and rely on i18n keys (urgency.{{value}})
const URGENCY_LEVELS = [
    { value: "low" },
    { value: "medium" },
    { value: "high" },
];

interface PostMessageModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const PostMessageModal: React.FC<PostMessageModalProps> = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [budget, setBudget] = useState("");
    const [urgency, setUrgency] = useState("medium");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // ตรวจสอบข้อมูล
        if (!title || !description || !category || !location) {
            // Updated to use a common error key structure
            setError(t("errors.required_fields"));
            setLoading(false);
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            // Updated to use a common error key structure
            alert(t("errors.login_required"));
            setLoading(false);
            onClose();
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || "https://unitrade5.onrender.com";
            const response = await axios.post(
                `${API_URL}/api/messages/create`,
                {
                    title,
                    description,
                    category,
                    location,
                    // Convert to number if present, otherwise undefined
                    budget: budget ? parseFloat(budget) : undefined,
                    urgency,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 201) {
                alert(t("post_message.success"));
                // Reset form
                setTitle("");
                setCategory("");
                setDescription("");
                setLocation("");
                setBudget("");
                setUrgency("medium");
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            console.error("Post message error:", err);
            // Updated to use a common error key structure
            const msg = err.response?.data?.message || err.message || t("errors.server_error");
            setError(msg);
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setTitle("");
        setCategory("");
        setDescription("");
        setLocation("");
        setBudget("");
        setUrgency("medium");
        setError("");
        onClose();
    };

    return (
        <div className="font-sans">
            <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">
                        {t("post_message.title_label")} *
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t("post_message.title_placeholder")}
                        required
                        disabled={loading}
                    />
                </div>

                {/* Category */}
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">
                        {t("post_message.category_label")} *
                    </label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-500 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        required
                        disabled={loading}
                    >
                        <option value="" disabled>{t("post_message.select_category_placeholder")}</option>
                        {CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>
                                {/* Use t() with dynamic key */}
                                {t(`categories.${c.value}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Description */}
                <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">
                        {t("post_message.description_label")} *
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                        placeholder={t("post_message.description_placeholder")}
                        required
                        disabled={loading}
                    />
                </div>

                {/* Location & Budget */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            {t("post_message.location_label")} *
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t("post_message.location_placeholder")}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-2">
                            {t("post_message.budget_label")}
                        </label>
                        <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t("post_message.budget_placeholder")}
                            min="0"
                            step="1"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Urgency */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2">
                        {t("post_message.urgency_label")}
                    </label>
                    <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-500 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        disabled={loading}
                    >
                        {URGENCY_LEVELS.map(u => (
                            <option key={u.value} value={u.value}>
                                {/* Use t() with dynamic key */}
                                {t(`urgency.${u.value}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="bg-gray-100 text-gray-700 py-2 px-6 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-colors"
                        disabled={loading}
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? t("common.posting") : t("post_message.post_button")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostMessageModal;