'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { ChromePicker } from 'react-color';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-image-crop/dist/ReactCrop.css';
import React from 'react';

interface Filter {
  filter?: string;
  icon?: string;
  category?: string;
}

interface DrawingState {
  isDrawing: boolean;
  lastX: number;
  lastY: number;
}

interface TextAnnotation {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  isDragging?: boolean;
  width?: number;
  height?: number;
  isSelected?: boolean;
}

interface DrawSettings {
  tool: 'pen' | 'text' | 'shape' | null;
  color: string;
  size: number;
  opacity: number;
  brushType?: string;
  shape?: 'rectangle' | 'circle' | 'line' | 'arrow';
}

// Predefined filters
const FILTERS: Record<string, Filter> = {
  none: {},
  grayscale: { filter: 'grayscale(100%)' },
  sepia: { filter: 'sepia(100%)' },
  vintage: { filter: 'sepia(50%) hue-rotate(-30deg) saturate(140%)' },
  cool: { filter: 'hue-rotate(180deg)' },
  warm: { filter: 'sepia(30%)' },
  dramatic: { filter: 'contrast(140%) brightness(95%)' },
  noir: { filter: 'grayscale(100%) contrast(160%) brightness(80%)' },
  retro: { filter: 'sepia(50%) saturate(120%) brightness(90%) contrast(110%)' },
  fade: { filter: 'brightness(110%) saturate(80%) opacity(90%)' },
  vivid: { filter: 'saturate(150%) contrast(120%) brightness(105%)' },
  moody: { filter: 'brightness(90%) contrast(120%) saturate(85%) sepia(20%)' },
  cyberpunk: { filter: 'hue-rotate(270deg) saturate(200%) brightness(110%)' },
  polaroid: { filter: 'sepia(20%) saturate(90%) contrast(90%) brightness(120%)' },
  cinema: { filter: 'contrast(130%) brightness(85%) saturate(110%)' },
  sunset: { filter: 'sepia(30%) saturate(140%) hue-rotate(20deg)' }
};

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

const SliderControl = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '%' }: SliderControlProps) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <span className="text-sm text-purple-400">{value}{unit}</span>
    </div>
    <div className="relative h-2 bg-gray-700/50 rounded-full">
      <div 
        className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
        style={{ width: `${((value - min) / (max - min)) * 100}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="absolute w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  </div>
);

interface ToggleButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const ToggleButton = ({ label, isActive, onClick, icon }: ToggleButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg font-medium w-full text-sm
      flex items-center gap-2 transition-all duration-200
      ${isActive 
        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
        : 'bg-gray-800/50 text-gray-300 hover:bg-purple-500/10 hover:text-purple-300 border border-gray-700/50'
      }
    `}
  >
    {icon}
    {label}
  </motion.button>
);

// Add new interface for tool categories
interface ToolCategory {
  id: string;
  name: string;
  icon: React.ReactElement;
  description: string;
}

// Define main tool categories
const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'quick',
    name: 'Quick Filters',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
      </svg>
    ),
    description: 'One-click photo enhancements'
  },
  {
    id: 'adjust',
    name: 'Adjust',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zm6 0a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zm5-1a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
      </svg>
    ),
    description: 'Fine-tune image settings'
  },
  {
    id: 'transform',
    name: 'Transform',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
      </svg>
    ),
    description: 'Rotate, flip, and crop'
  },
  {
    id: 'draw',
    name: 'Draw',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
        <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    ),
    description: 'Add drawings and text'
  }
];

// Add new interface for brush types
interface BrushType {
  id: string;
  name: string;
  icon: React.ReactElement;
  size: number;
  opacity: number;
  blur?: number;
}

// Define brush presets
const BRUSH_TYPES: BrushType[] = [
  {
    id: 'pencil',
    name: 'Pencil',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
        <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    ),
    size: 2,
    opacity: 100
  },
  {
    id: 'brush',
    name: 'Brush',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 100 2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
      </svg>
    ),
    size: 10,
    opacity: 80
  },
  {
    id: 'marker',
    name: 'Marker',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
      </svg>
    ),
    size: 20,
    opacity: 50
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 001.414 1.414l3-3zM11.293 10.293a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    size: 15,
    opacity: 30,
    blur: 5
  }
];

// Add new component for resizable text
const ResizableText = ({ 
  annotation, 
  index, 
  onSelect, 
  onMove, 
  onResize, 
  isSelected 
}: { 
  annotation: TextAnnotation;
  index: number;
  onSelect: (index: number) => void;
  onMove: (index: number, x: number, y: number) => void;
  onResize: (index: number, width: number, height: number) => void;
  isSelected: boolean;
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 });

  // Only measure initial size when text content or font size changes
  useEffect(() => {
    if (textRef.current) {
      const { width, height } = textRef.current.getBoundingClientRect();
      setCurrentSize({ width, height });
    }
  }, [annotation.text, annotation.fontSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(index);
    setIsDragging(true);
    setStartPos({ 
      x: e.clientX - annotation.x, 
      y: e.clientY - annotation.y 
    });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize(currentSize);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onMove(
          index,
          e.clientX - startPos.x,
          e.clientY - startPos.y
        );
      } else if (isResizing) {
        const dx = e.clientX - startPos.x;
        const scaleFactor = 1 + dx / (startSize.width || 100);
        const newFontSize = annotation.fontSize * scaleFactor;
        
        if (newFontSize >= 8 && newFontSize <= 100) {
          const newWidth = startSize.width * scaleFactor;
          const newHeight = startSize.height * scaleFactor;
          setCurrentSize({ width: newWidth, height: newHeight });
          onResize(index, newWidth, newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, startPos, startSize, index, onMove, onResize, annotation.fontSize]);

  return (
    <div
      ref={textRef}
      style={{
        position: 'absolute',
        left: annotation.x,
        top: annotation.y,
        color: annotation.color,
        fontSize: `${annotation.fontSize}px`,
        fontFamily: 'Arial',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        padding: '4px',
        border: isSelected ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
        borderRadius: '4px',
        background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
        transformOrigin: 'center center',
        zIndex: isSelected ? 1000 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      {annotation.text}
      {isSelected && (
        <>
          {/* Resize handle */}
          <div
            style={{
              position: 'absolute',
              right: -10,
              bottom: -10,
              width: 20,
              height: 20,
              cursor: 'nwse-resize',
              background: 'rgba(139, 92, 246, 0.8)',
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            onMouseDown={handleResizeStart}
          />
          {/* Selection outline */}
          <div
            style={{
              position: 'absolute',
              inset: -1,
              border: '1px solid rgba(139, 92, 246, 0.5)',
              borderRadius: '4px',
              pointerEvents: 'none'
            }}
          />
        </>
      )}
    </div>
  );
};

export default function EditPage() {
  const router = useRouter();
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [hue, setHue] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [isCropping, setIsCropping] = useState(false);
  const [fileName, setFileName] = useState('edited-image.jpg');
  const [isSaving, setIsSaving] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Drawing related states
  const [drawSettings, setDrawSettings] = useState<DrawSettings>({
    tool: null,
    color: '#000000',
    size: 5,
    opacity: 100
  });
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    lastX: 0,
    lastY: 0
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newTextInput, setNewTextInput] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [selectedText, setSelectedText] = useState<number | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [activeCategory, setActiveCategory] = useState<string>('quick');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Add new state for image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Add new state variables
  const [selectedBrush, setSelectedBrush] = useState<string>('pencil');
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'circle' | 'line' | 'arrow'>('rectangle');
  const [highlights, setHighlights] = useState<number>(0);
  const [shadows, setShadows] = useState<number>(0);
  const [clarity, setClarity] = useState<number>(0);
  const [vibrance, setVibrance] = useState<number>(0);

  useEffect(() => {
    const storedImageData = sessionStorage.getItem('editImageData');
    const storedImageType = sessionStorage.getItem('editImageType');
    
    if (!storedImageData || !storedImageType) {
      router.push('/');
    } else {
      setImageData(storedImageData);
      setImageType(storedImageType);
      
      // Set a better filename based on type
      if (storedImageType) {
        const ext = storedImageType.split('/')[1] || 'jpg';
        setFileName(`edited-image.${ext}`);
      }
    }
  }, [router]);

  // Update useEffect for image loading
  useEffect(() => {
    if (!imageData) return;

    const img = new window.Image();
    img.onload = () => {
      // Set actual image dimensions
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });

      // Initialize draw canvas
      if (drawCanvasRef.current) {
        const drawCanvas = drawCanvasRef.current;
        drawCanvas.width = img.naturalWidth;
        drawCanvas.height = img.naturalHeight;
        const ctx = drawCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    };
    img.src = imageData;
  }, [imageData]);
  const handleBack = () => {
    router.push('/');
  };

  const handleReset = () => {
    // Reset all adjustments
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setSharpen(0);
    setVignette(0);
    setSepia(0);
    setHue(0);
    setSelectedFilter(null);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    
    // Reset crop related states
    setCrop({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5,
    });
    setCompletedCrop(null);
    setScale(1);
    setIsCropping(false);
    
    // Reset new adjustments
    setHighlights(0);
    setShadows(0);
    setClarity(0);
    setVibrance(0);

    // Reset drawing tools
    setDrawSettings({
      tool: null,
      color: '#000000',
      size: 5,
      opacity: 100,
      brushType: 'pencil',
      shape: 'rectangle'
    });
    setSelectedBrush('pencil');
    setSelectedShape('rectangle');
    
    // Clear text annotations
    setTextAnnotations([]);
    setNewTextInput('');
    setIsAddingText(false);
    setSelectedText(null);

    // Clear drawing canvas
    if (drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawCanvasRef.current.width, drawCanvasRef.current.height);
      }
    }
    
    // Restore original image from sessionStorage
    const originalImage = sessionStorage.getItem('editImageData');
    if (originalImage) {
      setImageData(originalImage);
    }

    // Reset active category to default
    setActiveCategory('quick');
  };

  const handleSave = () => {
    if (!imageData) return;

    setIsSaving(true);

    // Create a temporary canvas to apply all edits
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Create a temporary image to draw to canvas
    const img = new window.Image();
    img.onload = () => {
      // Set canvas dimensions to match original image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      
      // Handle rotation and flipping
      if (rotation !== 0 || flip.horizontal || flip.vertical) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        ctx.translate(-centerX, -centerY);
        
        // Redraw image with transformations
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // Apply crop if needed
      if (completedCrop) {
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) return;

        const scaledCrop = {
          x: (completedCrop.x / 100) * canvas.width,
          y: (completedCrop.y / 100) * canvas.height,
          width: (completedCrop.width / 100) * canvas.width,
          height: (completedCrop.height / 100) * canvas.height
        };

        croppedCanvas.width = scaledCrop.width;
        croppedCanvas.height = scaledCrop.height;

        croppedCtx.drawImage(
          canvas,
          scaledCrop.x,
          scaledCrop.y,
          scaledCrop.width,
          scaledCrop.height,
          0,
          0,
          scaledCrop.width,
          scaledCrop.height
        );

        // Use the cropped canvas
        canvas.width = croppedCanvas.width;
        canvas.height = croppedCanvas.height;
        ctx.drawImage(croppedCanvas, 0, 0);
      }

      // Draw annotations from drawing canvas with proper scaling
      if (drawCanvasRef.current) {
        const drawCanvas = drawCanvasRef.current;
        ctx.save();
        
        // Handle rotation and flipping for drawings
        if (rotation !== 0 || flip.horizontal || flip.vertical) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
          ctx.translate(-centerX, -centerY);
        }
        
        ctx.drawImage(drawCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      
      // Draw text annotations with proper scaling
      textAnnotations.forEach(annotation => {
        ctx.save();
        
        // Handle rotation and flipping for text
        if (rotation !== 0 || flip.horizontal || flip.vertical) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
          ctx.translate(-centerX, -centerY);
        }
        
        const scaleX = canvas.width / imageRef.current!.width;
        const scaleY = canvas.height / imageRef.current!.height;
        
        ctx.font = `${annotation.fontSize * Math.min(scaleX, scaleY)}px Arial`;
        ctx.fillStyle = annotation.color;
        ctx.fillText(
          annotation.text,
          annotation.x * scaleX,
          annotation.y * scaleY
        );
        ctx.restore();
      });

      // Create download link
      const dataUrl = canvas.toDataURL(imageType || 'image/jpeg', 1.0);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      
      setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    };
    img.src = imageData;
  };

  const stopDrawing = () => {
    if (drawingState.isDrawing && drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
    }
    setDrawingState(prev => ({ ...prev, isDrawing: false }));
  };

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const finishCrop = () => {
    if (completedCrop && imageData) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = document.createElement('img');
      
      image.onload = () => {
        if (!ctx) return;

        // Calculate scaled dimensions
        const scaledCrop = {
          x: completedCrop.x / scale,
          y: completedCrop.y / scale,
          width: completedCrop.width / scale,
          height: completedCrop.height / scale
        };

        canvas.width = scaledCrop.width;
        canvas.height = scaledCrop.height;

        // Draw the cropped portion
        ctx.drawImage(
          image,
          scaledCrop.x,
          scaledCrop.y,
          scaledCrop.width,
          scaledCrop.height,
          0,
          0,
          scaledCrop.width,
          scaledCrop.height
        );

        // Get the cropped image data
        const croppedData = canvas.toDataURL(imageType || 'image/jpeg');
        
        setImageData(croppedData); // Update the main image data
        setIsCropping(false);
        setCompletedCrop(null);
        setScale(1); // Reset scale after crop
      };

      image.src = imageData;
    } else {
      setIsCropping(false);
      setScale(1);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  // Apply all image adjustments
  const getImageStyles = () => {
    const filterStyle = selectedFilter ? FILTERS[selectedFilter as keyof typeof FILTERS].filter : '';
    
    const sharpenFilter = sharpen > 0 
      ? `contrast(${100 + sharpen * 2}%) brightness(${100 + sharpen}%)`
      : '';

    // Add new filter effects
    const highlightsFilter = highlights !== 0
      ? `brightness(${100 + highlights * 0.5}%)`
      : '';
    
    const shadowsFilter = shadows !== 0
      ? `brightness(${100 - shadows * 0.5}%)`
      : '';
    
    const clarityFilter = clarity !== 0
      ? `contrast(${100 + clarity}%) brightness(${100 - clarity * 0.5}%)`
      : '';
    
    const vibranceFilter = vibrance !== 0
      ? `saturate(${100 + vibrance}%)`
      : '';

    const combinedFilters = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `blur(${blur}px)`,
      `sepia(${sepia}%)`,
      `hue-rotate(${hue}deg)`,
      sharpenFilter,
      highlightsFilter,
      shadowsFilter,
      clarityFilter,
      vibranceFilter,
      filterStyle
    ].filter(Boolean).join(' ');

    return {
      filter: combinedFilters,
      transform: `rotate(${rotation}deg) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
      boxShadow: vignette > 0 ? `inset 0 0 ${vignette * 5}px rgba(0,0,0,${vignette / 100})` : 'none'
    };
  };

  // Add text dragging handlers
  const handleTextMove = (index: number, x: number, y: number) => {
    setTextAnnotations(prev => prev.map((annotation, i) => {
      if (i === index) {
        return { ...annotation, x, y };
      }
      return annotation;
    }));
  };

  const handleTextResize = (index: number, width: number, height: number) => {
    setTextAnnotations(prev => prev.map((annotation, i) => {
      if (i === index) {
        const scaleFactor = width / (annotation.width || width);
        return { 
          ...annotation, 
          width,
          height,
          fontSize: Math.round(annotation.fontSize * scaleFactor)
        };
      }
      return annotation;
    }));
  };

  if (!imageData || !imageType) {
    return null;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div 
          variants={itemVariants}
          className="flex justify-between items-center mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-300 hover:text-purple-400 transition-all px-4 py-2 rounded-lg hover:bg-purple-500/10 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Gallery
          </motion.button>
          
          <motion.h1 
            variants={itemVariants}
            className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400"
          >
            PicEdit
          </motion.h1>
          
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="px-4 py-2 text-gray-300 hover:text-purple-400 transition-all rounded-lg hover:bg-purple-500/10 flex items-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 100 2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reset
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Image
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* New Layout Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tool Categories Sidebar */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Tools</h3>
              <div className="space-y-2">
                {TOOL_CATEGORIES.map((category) => (
                  <motion.button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`
                      w-full px-4 py-3 rounded-lg text-left transition-all
                      flex items-center gap-3 relative group
                      ${activeCategory === category.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'hover:bg-purple-500/10 text-gray-300 hover:text-purple-300'
                      }
                    `}
                    onMouseEnter={() => setShowTooltip(category.id)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <span className="text-current">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                    
                    {/* Tooltip */}
                    {showTooltip === category.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-gray-200 text-sm rounded-lg whitespace-nowrap z-50"
                      >
                        {category.description}
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Image Area */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-7"
          >
            <motion.div 
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-xl p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden flex items-center justify-center relative group">
                {isCropping ? (
                  <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div 
                        className="relative flex items-center justify-center"
                        style={{
                          width: '100%',
                          height: '100%',
                          transform: `scale(${scale})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.2s ease-out'
                        }}
                      >
                        <motion.img
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          src={imageData}
                          alt="Edit preview"
                          className="max-w-full max-h-full w-auto h-auto object-contain"
                          style={{
                            ...getImageStyles(),
                            margin: 'auto'
                          }}
                        />
                      </div>
                    </ReactCrop>
                  </div>
                ) : (
                  <div className="relative" style={{ 
                    width: imageDimensions.width > 0 ? '100%' : 'auto',
                    height: imageDimensions.height > 0 ? '100%' : 'auto',
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 300px)',
                    aspectRatio: imageDimensions.width && imageDimensions.height ? `${imageDimensions.width}/${imageDimensions.height}` : undefined
                  }}>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-full h-full"
                    >
                      <Image
                        ref={imageRef}
                        src={imageData}
                        alt="Edit preview"
                        fill
                        className="object-contain"
                        style={getImageStyles()}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority
                        unoptimized
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (img.naturalWidth && img.naturalHeight) {
                            setImageDimensions({
                              width: img.naturalWidth,
                              height: img.naturalHeight
                            });
                          }
                        }}
                      />
                      
                      {/* Drawing Canvas */}
                      <canvas
                        ref={drawCanvasRef}
                        className="absolute inset-0"
                        style={{ 
                          display: drawSettings.tool === 'pen' ? 'block' : 'none',
                          width: '100%',
                          height: '100%',
                          transform: getImageStyles().transform
                        }}
                        onMouseDown={(e) => {
                          const canvas = e.currentTarget;
                          const rect = canvas.getBoundingClientRect();
                          const scaleX = canvas.width / rect.width;
                          const scaleY = canvas.height / rect.height;
                          
                          // Calculate position relative to the actual image
                          const x = (e.clientX - rect.left) * scaleX;
                          const y = (e.clientY - rect.top) * scaleY;
                          
                          // Only start drawing if click is within image bounds
                          if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                            setDrawingState({
                              isDrawing: true,
                              lastX: x,
                              lastY: y
                            });

                            const ctx = canvas.getContext('2d');
                            if (ctx && drawSettings.tool === 'pen') {
                              ctx.beginPath();
                              ctx.moveTo(x, y);
                            }
                          }
                        }}
                        onMouseMove={(e) => {
                          if (!drawingState.isDrawing || drawSettings.tool !== 'pen') return;

                          const canvas = e.currentTarget;
                          const rect = canvas.getBoundingClientRect();
                          const scaleX = canvas.width / rect.width;
                          const scaleY = canvas.height / rect.height;
                          
                          // Calculate position relative to the actual image
                          const x = (e.clientX - rect.left) * scaleX;
                          const y = (e.clientY - rect.top) * scaleY;
                          
                          // Only draw if within image bounds
                          if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.strokeStyle = drawSettings.color;
                              ctx.lineWidth = drawSettings.size;
                              ctx.lineCap = 'round';
                              ctx.lineJoin = 'round';
                              ctx.globalAlpha = drawSettings.opacity / 100;

                              ctx.lineTo(x, y);
                              ctx.stroke();

                              setDrawingState(prev => ({
                                ...prev,
                                lastX: x,
                                lastY: y
                              }));
                            }
                          }
                        }}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                      />
                      
                      {/* Text Annotations */}
                      {textAnnotations.map((annotation, index) => (
                        <ResizableText
                          key={index}
                          annotation={annotation}
                          index={index}
                          onSelect={setSelectedText}
                          onMove={handleTextMove}
                          onResize={handleTextResize}
                          isSelected={selectedText === index}
                        />
                      ))}
                      
                      {/* Text Input Overlay */}
                      {isAddingText && (
                        <div
                          className="absolute inset-0 cursor-text"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            
                            // Only add text if click is within image bounds
                            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                              if (newTextInput) {
                                setTextAnnotations(prev => [...prev, {
                                  x,
                                  y,
                                  text: newTextInput,
                                  color: drawSettings.color,
                                  fontSize: drawSettings.size * 2
                                }]);
                                setNewTextInput('');
                                setIsAddingText(false);
                                setDrawSettings(prev => ({ ...prev, tool: null }));
                              }
                            }
                          }}
                        />
                      )}
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Active Tool Panel */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-3"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-xl p-4 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              {/* Quick Filters Panel */}
              {activeCategory === 'quick' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Quick Filters</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(FILTERS).map(([name, filter]) => (
                      <motion.button
                        key={name}
                        onClick={() => setSelectedFilter(name)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          p-4 rounded-lg text-center transition-all
                          ${selectedFilter === name
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gray-700/30 hover:bg-purple-500/10 text-gray-300 hover:text-purple-300'
                          }
                        `}
                      >
                        <div className="text-2xl mb-2">{filter.icon}</div>
                        <div className="text-sm font-medium">
                          {name.charAt(0).toUpperCase() + name.slice(1)}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Adjust Panel */}
              {activeCategory === 'adjust' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Adjust Image</h3>
                  
                  {/* Basic Adjustments */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-300">Basic</h4>
                    <SliderControl
                      label="Brightness"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                    />
                    <SliderControl
                      label="Contrast"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                    />
                    <SliderControl
                      label="Saturation"
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                    />
                  </div>

                  {/* Advanced Adjustments */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-300">Advanced</h4>
                    <SliderControl
                      label="Highlights"
                      value={highlights}
                      onChange={(e) => setHighlights(Number(e.target.value))}
                      min={-100}
                      max={100}
                    />
                    <SliderControl
                      label="Shadows"
                      value={shadows}
                      onChange={(e) => setShadows(Number(e.target.value))}
                      min={-100}
                      max={100}
                    />
                    <SliderControl
                      label="Clarity"
                      value={clarity}
                      onChange={(e) => setClarity(Number(e.target.value))}
                      max={50}
                    />
                    <SliderControl
                      label="Vibrance"
                      value={vibrance}
                      onChange={(e) => setVibrance(Number(e.target.value))}
                      min={-100}
                      max={100}
                    />
                    <SliderControl
                      label="Sharpness"
                      value={sharpen}
                      onChange={(e) => setSharpen(Number(e.target.value))}
                      max={50}
                    />
                  </div>
                </div>
              )}

              {/* Transform Panel */}
              {activeCategory === 'transform' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Transform</h3>
                  
                  {/* Rotation Controls */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Rotation</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {[-90, -45, 45, 90].map((angle) => (
                        <motion.button
                          key={angle}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRotate(angle)}
                          className="px-2 py-1.5 bg-gray-700/30 rounded-lg text-gray-300 hover:bg-purple-500/10 hover:text-purple-300 transition-all text-sm"
                        >
                          {angle > 0 ? `+${angle}°` : `${angle}°`}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Flip Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleButton
                      label="Flip Horizontal"
                      isActive={flip.horizontal}
                      onClick={() => setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }))}
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                        </svg>
                      }
                    />
                    <ToggleButton
                      label="Flip Vertical"
                      isActive={flip.vertical}
                      onClick={() => setFlip(prev => ({ ...prev, vertical: !prev.vertical }))}
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Crop Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-300">Crop Image</h4>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (isCropping) {
                            finishCrop();
                          } else {
                            setIsCropping(true);
                          }
                        }}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium
                          flex items-center gap-2 transition-all
                          ${isCropping
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gray-700/30 text-gray-300 hover:bg-purple-500/10 hover:text-purple-300'
                          }
                        `}
                      >
                        {isCropping ? 'Apply Crop' : 'Start Crop'}
                      </motion.button>
                    </div>
                    {isCropping && (
                      <SliderControl
                        label="Zoom"
                        value={Math.round(scale * 100)}
                        onChange={(e) => setScale(Number(e.target.value) / 100)}
                        min={25}
                        max={400}
                        unit="%"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Draw Panel */}
              {activeCategory === 'draw' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Draw & Annotate</h3>
                  
                  {/* Tool Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleButton
                      label="Pen"
                      isActive={drawSettings.tool === 'pen'}
                      onClick={() => setDrawSettings(prev => ({ ...prev, tool: 'pen' }))}
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                          <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      }
                    />
                    <ToggleButton
                      label="Text"
                      isActive={drawSettings.tool === 'text'}
                      onClick={() => {
                        setDrawSettings(prev => ({ ...prev, tool: 'text' }));
                        setIsAddingText(true);
                      }}
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-300">Color</label>
                      <div
                        className="w-8 h-8 rounded-lg cursor-pointer border-2 border-gray-700"
                        style={{ backgroundColor: drawSettings.color }}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      />
                    </div>
                    {showColorPicker && (
                      <div className="absolute z-10">
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowColorPicker(false)}
                        />
                        <ChromePicker
                          color={drawSettings.color}
                          onChange={(color) => setDrawSettings(prev => ({ ...prev, color: color.hex }))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Size and Opacity Controls */}
                  <SliderControl
                    label="Size"
                    value={drawSettings.size}
                    onChange={(e) => setDrawSettings(prev => ({ ...prev, size: Number(e.target.value) }))}
                    min={1}
                    max={50}
                    unit="px"
                  />
                  <SliderControl
                    label="Opacity"
                    value={drawSettings.opacity}
                    onChange={(e) => setDrawSettings(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                    min={1}
                    max={100}
                    unit="%"
                  />

                  {/* Text Input */}
                  {drawSettings.tool === 'text' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Text to Add</label>
                      <input
                        type="text"
                        value={newTextInput}
                        onChange={(e) => setNewTextInput(e.target.value)}
                        placeholder="Type your text here..."
                        className="w-full px-3 py-2 bg-gray-700/30 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                      <p className="text-xs text-gray-400">Click on the image to place text</p>
                    </div>
                  )}

                  {/* Brush Type Selection */}
                  {drawSettings.tool === 'pen' && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">Brush Type</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {BRUSH_TYPES.map((brush) => (
                          <motion.button
                            key={brush.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedBrush(brush.id);
                              setDrawSettings(prev => ({
                                ...prev,
                                size: brush.size,
                                opacity: brush.opacity
                              }));
                            }}
                            className={`
                              p-3 rounded-lg text-left transition-all flex items-center gap-2
                              ${selectedBrush === brush.id
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-gray-700/30 hover:bg-purple-500/10 text-gray-300 hover:text-purple-300'
                              }
                            `}
                          >
                            {brush.icon}
                            <span className="text-sm font-medium">{brush.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shape Type Selection */}
                  {drawSettings.tool === 'shape' && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">Shape Type</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {['rectangle', 'circle', 'line', 'arrow'].map((shape) => (
                          <motion.button
                            key={shape}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedShape(shape as ShapeType)}
                            className={`
                              p-3 rounded-lg text-left transition-all
                              ${selectedShape === shape
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-gray-700/30 hover:bg-purple-500/10 text-gray-300 hover:text-purple-300'
                              }
                            `}
                          >
                            <span className="text-sm font-medium capitalize">{shape}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Download progress overlay */}
        <AnimatePresence>
          {isSaving && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-800/90 border border-gray-700/50 p-8 rounded-xl shadow-xl flex flex-col items-center max-w-sm mx-4"
              >
                <div className="relative w-16 h-16 mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-4 border-purple-500/30 border-t-purple-500"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center text-purple-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </motion.div>
                </div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-semibold text-gray-100 mb-2"
                >
                  Saving Your Masterpiece
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-400 text-center"
                >
                  We&apos;re processing your image with all the amazing edits you&apos;ve made. Just a moment...
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </motion.div>
  );
} 