
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BRAND_COLORS } from '../constants';

const CURTAIN_TYPES = ['Ripple Fold', 'Triple Pinch Pleat', 'Eyelet/Grommet', 'Box Pleat'];
const BLIND_TYPES = ['Roman Blind', 'Roller Blind', 'Zebra/Dual Shade', 'Wooden Venetian'];
const STYLE_PRESETS = [
  { id: 'modern', label: 'Modern', icon: 'fa-couch', prompt: 'minimalist, clean lines, contemporary interior design, bright lighting' },
  { id: 'luxury', label: 'Luxury', icon: 'fa-crown', prompt: 'opulent, rich textures, high-end hotel aesthetic, heavy velvet drapes, warm lighting' },
  { id: 'classic', label: 'Classic', icon: 'fa-landmark', prompt: 'traditional, elegant, timeless architectural details, soft shadows' },
  { id: 'boho', label: 'Bohemian', icon: 'fa-leaf', prompt: 'relaxed, natural lighting, airy and light linen fabric feel, organic shapes' }
];

export const Visualizer: React.FC = () => {
  const [windowImg, setWindowImg] = useState<string | null>(null);
  const [fabricImg, setFabricImg] = useState<string | null>(null);
  const [mode, setMode] = useState<'Curtain' | 'Blind'>('Curtain');
  const [subType, setSubType] = useState<string>(CURTAIN_TYPES[0]);
  const [style, setStyle] = useState(STYLE_PRESETS[0]);
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  const windowInputRef = useRef<HTMLInputElement>(null);
  const fabricInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Mapping window geometry...",
    "Analyzing ambient light...",
    "Applying fabric texture...",
    "Simulating drape physics...",
    "Polishing final render..."
  ];

  // Professional check for API key selection state
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
          const exists = await window.aistudio.hasSelectedApiKey();
          setHasKey(exists);
        } else {
          // If the utility is missing, assume key is available but let error handling catch issues
          setHasKey(true);
        }
      } catch (e) {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSelectKey = async () => {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume successful selection per guidelines to avoid race condition
      setHasKey(true);
      setError(null);
    }
  };

  const generatePreview = async () => {
    if (!windowImg || !fabricImg) {
      setError("Please upload both a window photo and a fabric sample.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultImg(null);

    try {
      // MANDATORY: Instantiate right before call to get freshest injected API_KEY
      const ai = new GoogleGenAI({ apiKey:  import.meta.env.VITE_GEMINI_API_KEY });
      
      const windowBase64 = windowImg.split(',')[1];
      const fabricBase64 = fabricImg.split(',')[1];

      const prompt = `
        You are a world-class interior design visualization engine.
        IMAGE 1: A room with a window that needs new treatments.
        IMAGE 2: A close-up high-resolution fabric swatch.
        
        TASK:
        Render the fabric from Image 2 as a ${mode} in ${subType} style onto the window in Image 1.
        The overall aesthetic must be ${style.label} (${style.prompt}).
        
        TECHNICAL REQUIREMENTS:
        - Maintain pixel-perfect perspective and room scale.
        - The ${mode} should drape naturally with realistic weight and folds.
        - The lighting and shadows must match the environment in Image 1.
        - Return ONLY the final ultra-high-quality photorealistic image.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { data: windowBase64, mimeType: 'image/jpeg' } },
            { inlineData: { data: fabricBase64, mimeType: 'image/jpeg' } },
            { text: prompt }
          ]
        },
        config: {
          imageConfig: { 
            aspectRatio: '1:1',
            imageSize: '1K' 
          }
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      
      if (imagePart && imagePart.inlineData) {
        setResultImg(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error("AI failed to generate a visual part. Please verify your fabric image format.");
      }

    } catch (err: any) {
      console.error("Visualizer Error:", err);
      const errMsg = err.message || "";
      
      // Handle invalid key scenarios per professional guidelines
      if (errMsg.includes("Requested entity was not found") || errMsg.includes("API key not valid") || errMsg.includes("400")) {
        setHasKey(false);
        setError("Your API key configuration is invalid. Please select a valid paid API key via the setup button.");
      } else {
        setError(err.message || "Rendering failed. Ensure you are using a professional API key with billing enabled.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasKey === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-[#002d62] rounded-[2rem] flex items-center justify-center shadow-2xl mb-4">
          <i className="fas fa-key text-white text-3xl"></i>
        </div>
        <div>
          <h2 className="text-3xl font-black text-[#002d62] brand-font mb-4">API Key Setup Required</h2>
          <p className="max-w-md text-slate-500 text-sm font-medium leading-relaxed mb-6">
            Pro visualization requires an authorized Professional API key. Please select a key from a paid GCP project to continue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleSelectKey}
              className="px-10 py-5 bg-[#002d62] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl"
            >
              Select Authorized Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="px-10 py-5 bg-white border border-slate-200 text-slate-400 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Billing Info
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-[#002d62] brand-font mb-2">AI Pro Visual Studio</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Professional Render Engine Active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#c5a059] text-white flex items-center justify-center">1</span>
                Project Assets
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => windowInputRef.current?.click()}
                  className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden cursor-pointer group hover:border-[#002d62] transition-all relative"
                >
                  {windowImg ? (
                    <img src={windowImg} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <i className="fas fa-camera text-slate-300 mb-2 group-hover:text-[#002d62]"></i>
                      <span className="text-[8px] font-black uppercase text-slate-400">Site Photo</span>
                    </>
                  )}
                  <input type="file" ref={windowInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setWindowImg)} />
                </div>

                <div 
                  onClick={() => fabricInputRef.current?.click()}
                  className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden cursor-pointer group hover:border-[#002d62] transition-all relative"
                >
                  {fabricImg ? (
                    <img src={fabricImg} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <i className="fas fa-scroll text-slate-300 mb-2 group-hover:text-[#002d62]"></i>
                      <span className="text-[8px] font-black uppercase text-slate-400">Fabric Swatch</span>
                    </>
                  )}
                  <input type="file" ref={fabricInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setFabricImg)} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-[#002d62] text-white flex items-center justify-center">2</span>
                Configuration
              </h3>
              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button 
                  onClick={() => { setMode('Curtain'); setSubType(CURTAIN_TYPES[0]); }}
                  className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'Curtain' ? 'bg-white text-[#002d62] shadow-sm' : 'text-slate-400'}`}
                >
                  Drapes
                </button>
                <button 
                  onClick={() => { setMode('Blind'); setSubType(BLIND_TYPES[0]); }}
                  className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'Blind' ? 'bg-white text-[#002d62] shadow-sm' : 'text-slate-400'}`}
                >
                  Blinds
                </button>
              </div>
              <select 
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-[#002d62] outline-none"
              >
                {(mode === 'Curtain' ? CURTAIN_TYPES : BLIND_TYPES).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">3</span>
                Mood & Style
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_PRESETS.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => setStyle(s)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${style.id === s.id ? 'bg-[#002d62] text-white border-[#002d62] shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    <i className={`fas ${s.icon}`}></i>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={generatePreview}
            disabled={loading || !windowImg || !fabricImg}
            className="w-full py-6 bg-[#002d62] hover:bg-black disabled:opacity-50 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {loading ? (
              <><i className="fas fa-circle-notch animate-spin"></i> Processing...</>
            ) : (
              <><i className="fas fa-wand-magic-sparkles"></i> Render Design</>
            )}
          </button>

          {error && (
            <div className="space-y-3">
              <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-[9px] font-black uppercase border border-red-100 flex items-start gap-3">
                <i className="fas fa-exclamation-circle mt-0.5"></i>
                {error}
              </div>
              {(error.includes("API key") || error.includes("400")) && (
                 <button 
                  onClick={handleSelectKey}
                  className="w-full py-3 bg-red-100 text-red-700 rounded-xl font-black text-[9px] uppercase tracking-widest"
                >
                  Reset & Change Key
                </button>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-[#001a3a] h-[400px] md:h-[750px] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex items-center justify-center border-[12px] border-white/5">
            {!resultImg && !loading && (
              <div className="text-center p-12">
                <i className="fas fa-image text-white/10 text-6xl mb-6"></i>
                <h4 className="text-white/40 text-sm font-black uppercase tracking-[0.2em]">Design Canvas</h4>
              </div>
            )}

            {resultImg && (
              <div className="w-full h-full relative group">
                <img 
                  src={showOriginal ? windowImg! : resultImg} 
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute top-8 right-8 flex gap-3">
                  <button 
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    className="w-12 h-12 bg-white/20 backdrop-blur-xl border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/40 transition-all"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                   <a 
                    href={resultImg} 
                    download="qd-pro-design.jpg"
                    className="bg-[#c5a059] text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl block hover:bg-white hover:text-black transition-all"
                  >
                    <i className="fas fa-download mr-2"></i> Export Design
                  </a>
                </div>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-[#001a3a]/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-12">
                <div className="relative mb-8">
                  <div className="w-24 h-24 border-4 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-t-4 border-[#c5a059] rounded-full animate-spin"></div>
                </div>
                <p className="text-white font-black text-[10px] uppercase tracking-[0.4em] mb-2">{loadingMessages[loadingStep]}</p>
                <p className="text-white/40 text-[8px] font-bold uppercase">Pro Rendering In Progress</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
