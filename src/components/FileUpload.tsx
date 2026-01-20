import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            if (disabled) return;
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('audio/')) {
                onFileSelect(file);
            }
        },
        [onFileSelect, disabled]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${disabled
                    ? 'border-gray-700 bg-gray-900/50 text-gray-500 cursor-not-allowed'
                    : 'border-blue-500/50 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer'
                }`}
        >
            <input
                type="file"
                accept="audio/*"
                onChange={handleChange}
                className="hidden"
                id="audio-upload"
                disabled={disabled}
            />
            <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center gap-4">
                <div className={`p-4 rounded-full ${disabled ? 'bg-gray-800' : 'bg-blue-500/20 text-blue-400'}`}>
                    <Upload size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-1">Upload Audio File</h3>
                    <p className="text-sm text-gray-400">Drag and drop or click to browse</p>
                    <p className="text-xs text-gray-500 mt-2">Supports MP3, WAV, M4A...</p>
                </div>
            </label>
        </div>
    );
};
