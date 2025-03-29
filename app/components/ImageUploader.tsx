'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Upload, ImagePlus, ArrowLeft, ArrowRight, X } from 'lucide-react';

const ImageUploader = () => {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState(1); // Track current step

  // Cleanup object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Revoke previous object URL if it exists
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setSelectedFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  }, [selectedImage]);

  const handleEdit = () => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        sessionStorage.setItem('editImageData', base64String);
        sessionStorage.setItem('editImageType', selectedFile.type);
        router.push('/edit');
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const resetUpload = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setStep(1);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 p-8 relative">
       

        <div className="relative">
          {step === 1 && !selectedImage && (
            <div
              className={`w-full aspect-video rounded-xl overflow-hidden flex items-center justify-center border-4 border-dashed transition-all duration-300 ease-in-out ${
                isDragging ? 'border-purple-400 bg-purple-500/10 scale-[1.02]' : 'border-gray-600/50 bg-gray-900/50 hover:border-gray-500 hover:bg-gray-800/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Drop zone for image upload"
            >
              <div className="text-center p-8">
                <div className="flex justify-center mb-6">
                  {isDragging ? (
                    <Upload className="w-16 h-16 text-purple-400 animate-bounce" />
                  ) : (
                    <ImagePlus className="w-16 h-16 text-gray-400 transition-transform group-hover:scale-110" />
                  )}
                </div>
                <h2 className="text-2xl font-medium text-gray-200 mb-3">
                  {isDragging ? 'Drop your image here' : 'Upload an Image'}
                </h2>
                <p className="text-gray-400 mb-4">Drag and drop or click to browse</p>
                <div className="flex flex-col items-center gap-4">
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-500 hover:to-purple-600 transition-all duration-300 cursor-pointer font-medium shadow-lg hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Choose File
                    </span>
                  </label>
                  <p className="text-sm text-gray-400">Supported formats: JPG, PNG, GIF</p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  aria-label="File input"
                />
              </div>
            </div>
          )}

          {selectedImage && (
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={resetUpload}
                    className="p-2 bg-gray-900/80 rounded-full hover:bg-gray-800 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
                <div className="w-full aspect-video bg-gray-900/50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-700/50 shadow-inner">
                  <Image
                    src={selectedImage}
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-500 hover:to-purple-600 transition-all duration-300 font-medium shadow-lg hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Editing
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader; 