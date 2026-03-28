"use client";
import Button from "@/components/ui/button/Button";

function EditButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            size="sm"
            className="flex items-center gap-3 rounded-full bg-indigo-600 text-white px-6 py-3
                 hover:bg-indigo-700 hover:shadow-lg text-base font-semibold transition-all duration-200"
            onClick={onClick}
        >
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536
             3.536L7.5 21H3v-4.5l13.732-13.732z"
                />
            </svg>
            Edit
        </Button>
    );
}

export default EditButton
