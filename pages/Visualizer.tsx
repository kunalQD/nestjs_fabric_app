
import React, { useState, useRef, useEffect } from 'react';
import { dataService } from '../services/dataService';
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

  const windowInputRef = useRef<HTMLInputElement>(null);
  const fabricInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Uploading assets to cloud...",
    "Backend: Mapping window geometry...",
    "Backend: Analyzing light paths...",
    "Backend: Simulating fabric weight...",
    "Finalizing high-res render..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
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

  const generatePreview = async () => {
    if (!windowImg || !fabricImg) {
      setError("Please upload both a window photo and a fabric sample.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultImg(null);

    try {
      // Logic moved entirely to dataService which calls the Flask backend
      const windowBase64 = windowImg.split(',')[1];
      const fabricBase64 = fabricImg.split(',')[1];

      const result = await dataService.generateAIPreview({
        window_image: windowBase64,
        fabric_image: fabricBase64,
        mode,
        sub_type: subType,
        style_prompt: style.prompt
      });

      if (result && result.preview) {
        setResultImg(`data:image/jpeg;base64,${result.preview}`);
      } else {
        throw new Error("Backend returned an empty render.");
      }

    } catch (err: any) {
      console.error("Visualizer Error:", err);
      setError(err.message || "Cloud rendering failed. Please check your backend logs and API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-[#002d62] brand-font mb-2">AI Visual Studio</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud Processing Active
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
              <><i className="fas fa-circle-notch animate-spin"></i> Processing Cloud Render...</>
            ) : (
              <><i className="fas fa-wand-magic-sparkles"></i> Generate Design</>
            )}
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-[9px] font-black uppercase border border-red-100 flex items-start gap-3">
              <i className="fas fa-exclamation-circle mt-0.5"></i>
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="bg-[#001a3a] h-[400px] md:h-[750px] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex items-center justify-center border-[12px] border-white/5">
            {!resultImg && !loading && (
              <div className="text-center p-12">
                <i className="fas fa-cloud-upload text-white/10 text-6xl mb-6"></i>
                <h4 className="text-white/40 text-sm font-black uppercase tracking-[0.2em]">Ready for Cloud Processing</h4>
              </div>
            )}

            {resultImg && (
              <div className="w-full h-full relative group">
                <img 
                  src={showOriginal ? windowImg! : resultImg} 
                  className="w-full h-full object-cover"
                  alt="AI Generated Visualization"
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
                    download="qd-design-preview.jpg"
                    className="bg-[#c5a059] text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl block hover:bg-white hover:text-black transition-all"
                  >
                    <i className="fas fa-download mr-2"></i> Download Export
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
                <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest">Neural Network Rendering</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
