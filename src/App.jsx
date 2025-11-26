import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  Download, Youtube, Image as ImageIcon, RefreshCcw, AlertCircle, 
  Play, Maximize2, Layers, Sun, Moon, Circle, Triangle, Type, 
  Palette, Upload, Move, Sparkles, Monitor, Instagram, Smartphone,
  Sliders, Wand2, MousePointer2
} from 'lucide-react';

export default function AppV2() {
  // --- Auto-Fix Styling (More Robust) ---
  // We use useLayoutEffect to inject the script as early as possible
  useLayoutEffect(() => {
    // 1. Check if Tailwind is already available globally
    if (window.tailwind) return;

    // 2. Check if script tag is already in the DOM
    const existingScript = document.getElementById('tailwind-cdn');
    if (existingScript) return;

    // 3. Pre-define the Tailwind Config BEFORE loading the script.
    // This prevents race conditions where Tailwind runs before knowing about custom colors (like slate-950).
    window.tailwind = {
      config: {
        theme: {
          extend: {
            colors: {
              slate: {
                950: '#020617',
              }
            }
          }
        }
      }
    };

    // 4. Inject the CDN Script
    const script = document.createElement('script');
    script.id = 'tailwind-cdn';
    script.src = 'https://cdn.tailwindcss.com';
    script.async = true;
    document.head.appendChild(script);

  }, []);

  // --- Core State ---
  const [activeTab, setActiveTab] = useState('button'); // 'button', 'text', 'image', 'layout'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // --- Data Source ---
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('thumbnail');
  const [imageObj, setImageObj] = useState(null);

  // --- Canvas State ---
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1280, h: 720 });
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9', '1:1', '9:16'
  
  // --- Interactive State ---
  const [isDragging, setIsDragging] = useState(null); // 'button', 'text', null
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // --- Configuration Objects ---
  
  // 1. Image Adjustments
  const [imgConfig, setImgConfig] = useState({
    brightness: 100, // %
    contrast: 100,   // %
    saturation: 100, // %
    blur: 0,         // px
    tint: 'none',    // 'none', 'black', 'white'
    tintOpacity: 40
  });

  // 2. Play Button
  const [btnConfig, setBtnConfig] = useState({
    visible: true,
    style: 'circle', // 'youtube', 'circle', 'simple'
    effect: 'none',  // 'none', 'glass', 'glow'
    scale: 20,       // % of shortest dimension
    opacity: 100,
    color: 'white',  // 'white', 'black', 'red', 'auto'
    x: 0.5,          // Normalized 0-1
    y: 0.5
  });

  // 3. Text Overlay
  const [textConfig, setTextConfig] = useState({
    content: '',
    visible: false,
    font: 'Impact', // 'Impact', 'Roboto', 'Serif'
    size: 10,       // % of height
    color: 'white',
    hasBg: true,
    x: 0.5,
    y: 0.85
  });

  // --- Handlers ---

  const handleUrlFetch = async () => {
    setError(null);
    setLoading(true);
    
    // Extract ID
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(shorts\/))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[8].length === 11) ? match[8] : false;

    if (!id) {
      setError("Invalid YouTube URL");
      setLoading(false);
      return;
    }

    setFilename(`yt-${id}`);
    const imgUrl = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    
    // Load Image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      setImageObj(img);
      setLoading(false);
      // Auto-detect contrast
      detectContrast(img);
    };
    img.onerror = () => {
        // Fallback to HQ
        img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImageObj(img);
          detectContrast(img);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
      setFilename(file.name.split('.')[0]);
    }
  };

  const detectContrast = (img) => {
      // Simple logic: Draw small center chunk, check avg brightness
      const cvs = document.createElement('canvas');
      cvs.width = 50; cvs.height = 50;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0,0,50,50).data;
      let total = 0;
      for(let i=0; i<data.length; i+=4) total += (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
      const avg = total / (data.length / 4);
      
      // If bright, default to black button, else white (only if auto)
      if (btnConfig.color === 'auto') {
        setBtnConfig(prev => ({...prev, color: avg > 140 ? 'black' : 'white'}));
      }
  };

  // --- Rendering Loop ---
  
  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 1. Setup Canvas Size based on Aspect Ratio
    let targetW = 1280;
    let targetH = 720;
    if (aspectRatio === '1:1') { targetW = 1080; targetH = 1080; }
    if (aspectRatio === '9:16') { targetW = 720; targetH = 1280; }
    
    canvas.width = targetW;
    canvas.height = targetH;
    
    // 2. Draw Background (Image with filters)
    ctx.save();
    
    // Fill background with black first (for letterboxing)
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0, targetW, targetH);

    // Filter Logic
    ctx.filter = `brightness(${imgConfig.brightness}%) contrast(${imgConfig.contrast}%) saturate(${imgConfig.saturation}%) blur(${imgConfig.blur}px)`;
    
    // "Cover" fit logic
    const scale = Math.max(targetW / imageObj.width, targetH / imageObj.height);
    const x = (targetW / 2) - (imageObj.width / 2) * scale;
    const y = (targetH / 2) - (imageObj.height / 2) * scale;
    ctx.drawImage(imageObj, x, y, imageObj.width * scale, imageObj.height * scale);
    
    ctx.restore(); // Remove filters for UI elements

    // 3. Tint Overlay
    if (imgConfig.tint !== 'none') {
        ctx.fillStyle = imgConfig.tint === 'black' 
            ? `rgba(0,0,0,${imgConfig.tintOpacity/100})` 
            : `rgba(255,255,255,${imgConfig.tintOpacity/100})`;
        ctx.fillRect(0,0, targetW, targetH);
    }

    // 4. Draw Play Button
    if (btnConfig.visible) {
        drawPlayButton(ctx, targetW, targetH);
    }

    // 5. Draw Text
    if (textConfig.visible && textConfig.content) {
        drawText(ctx, targetW, targetH);
    }

  }, [imageObj, aspectRatio, imgConfig, btnConfig, textConfig]);


  // --- Drawing Helpers ---

  const drawPlayButton = (ctx, w, h) => {
    const cx = w * btnConfig.x;
    const cy = h * btnConfig.y;
    // Base size on shortest dimension to keep consistent visual weight
    const minDim = Math.min(w, h);
    const size = minDim * (btnConfig.scale / 100); 

    const colors = {
        white: { fill: `rgba(255, 255, 255, ${btnConfig.opacity/100})`, icon: `rgba(0, 0, 0, ${btnConfig.opacity/100})` },
        black: { fill: `rgba(0, 0, 0, ${btnConfig.opacity/100})`, icon: `rgba(255, 255, 255, ${btnConfig.opacity/100})` },
        red:   { fill: `rgba(255, 0, 0, ${btnConfig.opacity/100})`, icon: `rgba(255, 255, 255, ${btnConfig.opacity/100})` },
        auto:  { fill: `rgba(255, 255, 255, ${btnConfig.opacity/100})`, icon: `rgba(0, 0, 0, ${btnConfig.opacity/100})` } // Fallback
    };
    
    // Resolve auto color if it's still set to auto in state (though detection usually handles it)
    let activeColorKey = btnConfig.color === 'auto' ? 'white' : btnConfig.color;
    let palette = colors[activeColorKey];

    // Effect: Glow
    if (btnConfig.effect === 'glow') {
        ctx.shadowBlur = size * 0.5;
        ctx.shadowColor = activeColorKey === 'black' ? 'rgba(255,255,255,0.8)' : palette.fill;
    } else {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
    }

    ctx.fillStyle = palette.fill;
    
    // Shape Logic
    ctx.beginPath();
    
    if (btnConfig.style === 'circle') {
        ctx.arc(cx, cy, size, 0, Math.PI*2);
    } 
    else if (btnConfig.style === 'youtube') {
        const rw = size * 2.2;
        const rh = size * 1.5;
        const r = rh * 0.2;
        if (ctx.roundRect) ctx.roundRect(cx - rw/2, cy - rh/2, rw, rh, r);
        else ctx.rect(cx - rw/2, cy - rh/2, rw, rh);
    }

    // Effect: Glassmorphism (Advanced)
    if (btnConfig.effect === 'glass') {
        ctx.save();
        ctx.clip(); // Clip to the button shape
        
        // 1. Draw blurred background inside shape
        ctx.filter = 'blur(10px)';
        // Re-calculate image pos for consistent background
        const scale = Math.max(w / imageObj.width, h / imageObj.height);
        const ix = (w / 2) - (imageObj.width / 2) * scale;
        const iy = (h / 2) - (imageObj.height / 2) * scale;
        ctx.drawImage(imageObj, ix, iy, imageObj.width * scale, imageObj.height * scale);
        
        // 2. Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(0,0,w,h); // Fill whole clip
        
        ctx.restore();
        
        // 3. Glass Border
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        // Normal Fill
        if (btnConfig.style !== 'simple') ctx.fill();
    }
    
    ctx.shadowBlur = 0; // Reset shadow for icon

    // Icon
    const iconSize = btnConfig.style === 'simple' ? size * 1.2 : size * 0.5;
    const iconColor = btnConfig.style === 'simple' ? palette.fill : palette.icon;
    
    ctx.fillStyle = iconColor;
    ctx.beginPath();
    const ix = cx + iconSize * 0.1;
    ctx.moveTo(ix - iconSize/1.5, cy - iconSize);
    ctx.lineTo(ix + iconSize, cy);
    ctx.lineTo(ix - iconSize/1.5, cy + iconSize);
    ctx.fill();
  };

  const drawText = (ctx, w, h) => {
    const cx = w * textConfig.x;
    const cy = h * textConfig.y;
    const fontSize = h * (textConfig.size / 100);
    
    ctx.font = `900 ${fontSize}px ${textConfig.font}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = textConfig.content.toUpperCase();
    const metrics = ctx.measureText(text);
    
    // Background Highlight
    if (textConfig.hasBg) {
        const pad = fontSize * 0.2;
        const bgW = metrics.width + pad * 4;
        const bgH = fontSize * 1.2;
        
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; // Always black bg for contrast
        // Draw slightly skewed box for "Impact" feel
        ctx.beginPath();
        ctx.moveTo(cx - bgW/2 - pad, cy - bgH/2);
        ctx.lineTo(cx + bgW/2 + pad, cy - bgH/2);
        ctx.lineTo(cx + bgW/2 - pad, cy + bgH/2);
        ctx.lineTo(cx - bgW/2 + pad, cy + bgH/2);
        ctx.fill();
    }

    // Text
    ctx.fillStyle = textConfig.color;
    ctx.fillText(text, cx, cy);
    
    if (!textConfig.hasBg) {
        // Add stroke if no BG
        ctx.strokeStyle = 'black';
        ctx.lineWidth = fontSize * 0.05;
        ctx.strokeText(text, cx, cy);
        ctx.fillText(text, cx, cy);
    }
  };

  // --- Interaction Handlers ---

  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Check Button Hit (Approximate radius check)
    // Aspect ratio correction needed for perfect hit detection, but simplified here:
    const dx = x - btnConfig.x;
    const dy = y - btnConfig.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (btnConfig.visible && dist < 0.15) {
        setIsDragging('button');
        setDragOffset({ x: dx, y: dy });
        return;
    }

    // Check Text Hit (Approximate box check)
    if (textConfig.visible && Math.abs(x - textConfig.x) < 0.2 && Math.abs(y - textConfig.y) < 0.1) {
        setIsDragging('text');
        setDragOffset({ x: x - textConfig.x, y: y - textConfig.y });
        return;
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (isDragging === 'button') {
        setBtnConfig(prev => ({ ...prev, x: x - dragOffset.x, y: y - dragOffset.y }));
    } else if (isDragging === 'text') {
        setTextConfig(prev => ({ ...prev, x: x - dragOffset.x, y: y - dragOffset.y }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const download = () => {
    if(!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${filename}-thumbnail.png`;
    link.href = canvasRef.current.toDataURL('image/png', 1.0);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col">
      
      {/* 1. Header & Input */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-900/20">
              <Youtube size={24} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ThumbPlay <span className="text-blue-500 text-xs align-top">V2</span></span>
          </div>

          <div className="flex-1 w-full md:max-w-2xl flex gap-2">
            <div className="flex-1 relative">
                <input
                    type="text"
                    placeholder="Paste YouTube URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlFetch()}
                />
                <button 
                    onClick={handleUrlFetch}
                    className="absolute right-2 top-2 text-slate-400 hover:text-blue-500"
                >
                   {loading ? <RefreshCcw className="animate-spin" size={18} /> : <RefreshCcw size={18} />} 
                </button>
            </div>
            
            <div className="relative">
                <input 
                    type="file" 
                    id="localFile" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                />
                <label 
                    htmlFor="localFile"
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors whitespace-nowrap"
                >
                    <Upload size={18} />
                    <span className="hidden sm:inline">Upload</span>
                </label>
            </div>
          </div>

          <button 
            onClick={download}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left: Canvas Area */}
        <div className="flex-1 bg-slate-950/50 p-8 flex items-center justify-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '24px 24px'}}>
            </div>

            {imageObj ? (
                 <div className="relative shadow-2xl rounded-sm overflow-hidden ring-1 ring-slate-800"
                      ref={containerRef}
                      style={{ maxWidth: '100%', maxHeight: '100%' }}>
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        className="block max-w-full max-h-[80vh] cursor-move object-contain"
                    />
                    
                    {/* Floating Instruction */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white/80 text-xs px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                        <MousePointer2 size={12} />
                        Drag elements to position
                    </div>
                 </div>
            ) : (
                <div className="text-center text-slate-500 space-y-4">
                    <div className="w-24 h-24 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center border border-slate-800 border-dashed">
                        <ImageIcon size={48} className="opacity-20" />
                    </div>
                    <p>Load a video or image to start designing</p>
                </div>
            )}
        </div>

        {/* Right: Tools Panel */}
        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[50vh] lg:h-auto overflow-hidden">
            
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800">
                {[
                    { id: 'button', icon: Play, label: 'Button' },
                    { id: 'text', icon: Type, label: 'Text' },
                    { id: 'image', icon: Sliders, label: 'Image' },
                    { id: 'layout', icon: Monitor, label: 'Layout' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-4 flex flex-col items-center gap-1.5 text-xs font-medium transition-colors border-b-2 
                        ${activeTab === tab.id 
                            ? 'border-blue-500 text-blue-400 bg-slate-800/50' 
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tools Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* 1. PLAY BUTTON TOOLS */}
                {activeTab === 'button' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-300 uppercase">Visibility</h3>
                            <button 
                                onClick={() => setBtnConfig(prev => ({...prev, visible: !prev.visible}))}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${btnConfig.visible ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${btnConfig.visible ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {btnConfig.visible && (
                            <>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Style</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'circle', icon: Circle, label: 'Circle' },
                                            { id: 'youtube', icon: Youtube, label: 'YouTube' },
                                            { id: 'simple', icon: Triangle, label: 'Simple' },
                                        ].map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => setBtnConfig(prev => ({...prev, style: s.id}))}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all
                                                ${btnConfig.style === s.id ? 'bg-blue-600/10 border-blue-600 text-blue-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                            >
                                                <s.icon size={20} className={s.id === 'simple' ? 'rotate-90' : ''} />
                                                <span className="text-xs">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Special Effects</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'none', label: 'Flat' },
                                            { id: 'glass', label: 'Glass' },
                                            { id: 'glow', label: 'Glow' },
                                        ].map(e => (
                                            <button 
                                                key={e.id}
                                                onClick={() => setBtnConfig(prev => ({...prev, effect: e.id}))}
                                                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all
                                                ${btnConfig.effect === e.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                            >
                                                {e.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Size</span>
                                            <span>{btnConfig.scale}%</span>
                                        </div>
                                        <input type="range" min="10" max="50" value={btnConfig.scale} onChange={(e) => setBtnConfig({...btnConfig, scale: parseInt(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Opacity</span>
                                            <span>{btnConfig.opacity}%</span>
                                        </div>
                                        <input type="range" min="20" max="100" value={btnConfig.opacity} onChange={(e) => setBtnConfig({...btnConfig, opacity: parseInt(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Color</label>
                                    <div className="flex gap-2">
                                        {['white', 'black', 'red', 'auto'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setBtnConfig(prev => ({...prev, color: c}))}
                                                className={`h-8 flex-1 rounded-md border transition-all uppercase text-[10px] font-bold
                                                ${btnConfig.color === c ? 'ring-2 ring-blue-500 border-transparent' : 'border-slate-700 text-slate-400'}
                                                ${c === 'white' ? 'bg-white text-black' : c === 'black' ? 'bg-black text-white' : c === 'red' ? 'bg-red-600 text-white' : 'bg-slate-800'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 2. TEXT TOOLS */}
                {activeTab === 'text' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                         <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-300 uppercase">Active</h3>
                            <button 
                                onClick={() => setTextConfig(prev => ({...prev, visible: !prev.visible}))}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${textConfig.visible ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${textConfig.visible ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        
                        {textConfig.visible && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Content</label>
                                    <textarea 
                                        value={textConfig.content}
                                        onChange={(e) => setTextConfig({...textConfig, content: e.target.value})}
                                        placeholder="ENTER TEXT..."
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none font-bold tracking-wide"
                                        rows={2}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Font Style</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'Impact', label: 'Bold' },
                                            { id: 'Roboto', label: 'Modern' },
                                            { id: 'Georgia', label: 'Classic' },
                                        ].map(f => (
                                            <button 
                                                key={f.id}
                                                onClick={() => setTextConfig(prev => ({...prev, font: f.id}))}
                                                className={`py-2 border rounded-lg text-xs transition-colors
                                                ${textConfig.font === f.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-700 text-slate-400'}`}
                                                style={{ fontFamily: f.id === 'Georgia' ? 'serif' : 'sans-serif', fontWeight: f.id === 'Impact' ? 900 : 400 }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Background Box</label>
                                        <button 
                                            onClick={() => setTextConfig(prev => ({...prev, hasBg: !prev.hasBg}))}
                                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${textConfig.hasBg ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${textConfig.hasBg ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Size</span>
                                            <span>{textConfig.size}%</span>
                                        </div>
                                        <input type="range" min="5" max="30" value={textConfig.size} onChange={(e) => setTextConfig({...textConfig, size: parseInt(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 3. IMAGE TOOLS */}
                {activeTab === 'image' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        {/* Sliders */}
                        {[
                            { label: 'Brightness', key: 'brightness', min: 0, max: 200 },
                            { label: 'Contrast', key: 'contrast', min: 0, max: 200 },
                            { label: 'Saturation', key: 'saturation', min: 0, max: 200 },
                            { label: 'Blur', key: 'blur', min: 0, max: 20 },
                        ].map(control => (
                            <div key={control.key} className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>{control.label}</span>
                                    <span>{imgConfig[control.key]}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min={control.min} 
                                    max={control.max} 
                                    value={imgConfig[control.key]} 
                                    onChange={(e) => setImgConfig({...imgConfig, [control.key]: parseInt(e.target.value)})}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                />
                            </div>
                        ))}

                        <div className="pt-4 border-t border-slate-800 space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Color Overlay</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'none', label: 'None', icon: ImageIcon },
                                    { id: 'black', label: 'Dark', icon: Moon },
                                    { id: 'white', label: 'Light', icon: Sun },
                                ].map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => setImgConfig({...imgConfig, tint: t.id})}
                                        className={`p-2 border rounded-lg flex flex-col items-center gap-1 transition-colors
                                        ${imgConfig.tint === t.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-slate-700 text-slate-400'}`}
                                    >
                                        <t.icon size={16} />
                                        <span className="text-[10px] uppercase font-bold">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. LAYOUT TOOLS */}
                {activeTab === 'layout' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Aspect Ratio</label>
                            <div className="space-y-2">
                                {[
                                    { id: '16:9', label: 'YouTube Standard', desc: '1280 x 720', icon: Monitor },
                                    { id: '1:1', label: 'Square Post', desc: '1080 x 1080', icon: Instagram },
                                    { id: '9:16', label: 'Story / Reel', desc: '720 x 1280', icon: Smartphone },
                                ].map(r => (
                                    <button 
                                        key={r.id}
                                        onClick={() => setAspectRatio(r.id)}
                                        className={`w-full p-3 rounded-xl border flex items-center gap-4 transition-all
                                        ${aspectRatio === r.id ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${aspectRatio === r.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            <r.icon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-sm font-bold ${aspectRatio === r.id ? 'text-blue-400' : 'text-slate-300'}`}>{r.label}</div>
                                            <div className="text-xs text-slate-500">{r.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                            <p className="flex gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-500" />
                                <span>Images are automatically scaled to "cover" the canvas. You can use the drag controls in the preview to adjust alignment.</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

      </main>
    </div>
  );
}   