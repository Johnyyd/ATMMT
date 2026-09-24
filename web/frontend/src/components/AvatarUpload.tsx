import React, { useState, ChangeEvent } from 'react';
import { authService } from '../services/authService';

interface AvatarUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string; // e.g., 'image/*'
  maxSizeMb?: number;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  accept = 'image/*',
  maxSizeMb = 5,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.match(accept)) {
      setError(`Invalid file type. Only ${accept} files are allowed.`);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size too large. Maximum allowed size is ${maxSizeMb}MB.`);
      return;
    }

    // Clear previous error
    setError(null);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Upload the file
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // For simplicity, we're simulating progress since the authService doesn't expose progress
      // In a real app, you might use XMLHttpRequest or a library that supports progress events
      const avatarUrl = await authService.uploadAvatar(file);
      setProgress(100);
      setIsUploading(false);
      onUploadSuccess(avatarUrl);
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Upload failed');
      if (onUploadError) {
        onUploadError(err.message || 'Upload failed');
      }
    }
  };

  return (
    <div className="avatar-upload-container">
      <div
        className="avatar-upload-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        {!isUploading && !preview ? (
          <>
            <p>Kéo và thả file ảnh vào đây</p>
            <p>hoặc nhấn để chọn file</p>
            <button type="button" onClick={() => {
              // Trigger the hidden file input
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input?.click();
            }}>Chọn file ảnh</button>
          </>
        ) : !!preview && !isUploading ? (
          <>
            <img src={preview} alt="Avatar preview" className="avatar-preview" />
            <button type="button" onClick={() => {
              // Reset to allow selecting another file
              setPreview(null);
              URL.revokeObjectURL(preview as string);
            }}>Xóa</button>
            <button type="button" onClick={() => {
              // Trigger file input again to select a new file
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              input.value = '';
              input.click();
            }}>Thay đổi</button>
          </>
        ) : (
          <>
            <div className="upload-progress">
              <div
                className="upload-progress-bar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p>Đang tải lên: {progress}%</p>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

export default AvatarUpload;