import React, { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Camera as CameraIcon, 
  Image as ImageIcon, 
  Send, 
  History, 
  Info, 
  X, 
  Copy, 
  Check, 
  Trash2, 
  AlertCircle,
  ChevronRight,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CameraView } from "./components/CameraView";

// Initialize Gemini API
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface HistoryItem {
  q: string;
  a: string;
  full: string;
  timestamp: number;
}

export default function App() {
  const [tab, setTab] = useState("solver");
  const [image, setImage] = useState<{ preview: string; base64: string; mediaType: string } | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("math_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("math_history", JSON.stringify(history));
  }, [history]);

  const handleFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const preview = URL.createObjectURL(file);
      setImage({ preview, base64, mediaType: file.type || "image/jpeg" });
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCapture = (base64: string) => {
    const preview = `data:image/jpeg;base64,${base64}`;
    setImage({ preview, base64, mediaType: "image/jpeg" });
    setResult(null);
    setError(null);
  };

  const solve = async () => {
    if (!image && !text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const model = "gemini-2.0-flash";
      const prompt = text.trim()
        ? `Resuelve este problema matemático: ${text}`
        : "Analiza esta imagen y resuelve el problema matemático que aparece en ella.";

      const fullPrompt = `${prompt}

Responde en español siguiendo este formato:
1. **Identificación**: ¿Qué tipo de problema es?
2. **Procedimiento**: Explica los pasos de resolución de forma clara.
3. **Resultado final**: Muestra claramente la respuesta.

Sé preciso y pedagógico.`;

      const contents = [];
      const parts = [];
      
      if (image) {
        parts.push({
          inlineData: {
            mimeType: image.mediaType,
            data: image.base64
          }
        });
      }
      
      parts.push({ text: fullPrompt });
      
      const response = await genAI.models.generateContent({
        model,
        contents: [{ parts }]
      });

      const answer = response.text || "No se pudo obtener respuesta.";

      setResult(answer);
      setHistory(prev => [{
        q: text.trim() || (image ? "📷 Problema en imagen" : "Consulta"),
        a: answer.slice(0, 80) + "...",
        full: answer,
        timestamp: Date.now()
      }, ...prev].slice(0, 10));

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-bg relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(124,106,247,0.12)_0%,transparent_70%)] pointer-events-none z-0" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-accent to-accent2 rounded-xl flex items-center justify-center text-lg shadow-[0_4px_20px_rgba(124,106,247,0.35)]">
            <span className="font-bold text-white">∑</span>
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">
            Math<span className="text-accent">AI</span>
          </h1>
        </div>
        <div className="bg-accent/15 border border-accent/30 text-accent text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wider font-mono">
          v1.0
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 px-5 pb-24 pt-2 relative z-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "solver" && (
            <motion.div 
              key="solver"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Image Input Area */}
              <div 
                className={`relative bg-card border-2 border-dashed border-border rounded-3xl overflow-hidden transition-all duration-200 min-h-[240px] flex items-center justify-center cursor-pointer group ${image ? 'border-solid' : 'hover:border-accent hover:bg-accent/5'}`}
                onClick={() => !image && fileInputRef.current?.click()}
              >
                {image ? (
                  <div className="relative w-full h-full p-2">
                    <img src={image.preview} alt="Problem" className="w-full h-full max-h-[300px] object-contain rounded-2xl bg-bg" />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="w-9 h-9 rounded-xl bg-accent/90 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImage(null); setResult(null); }}
                        className="w-9 h-9 rounded-xl bg-error/90 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-10 text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent animate-pulse">
                      <CameraIcon size={32} />
                    </div>
                    <div className="text-text font-semibold">Sube una foto del problema</div>
                    <div className="text-muted text-xs font-mono">toca para seleccionar · o arrastra aquí</div>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              {/* Camera Button */}
              {!image && (
                <button 
                  onClick={() => setShowCamera(true)}
                  className="w-full py-3.5 bg-surface border border-border rounded-2xl text-muted font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-card hover:border-accent/40 transition-all active:scale-[0.98]"
                >
                  <CameraIcon size={20} className="text-accent" />
                  Usar cámara del dispositivo
                </button>
              )}

              {/* Text Input Row */}
              <div className="flex gap-2.5 items-end">
                <textarea 
                  className="flex-1 bg-card border border-border rounded-2xl p-4 text-text font-mono text-sm outline-none focus:border-accent transition-colors min-h-[56px] max-h-[120px] resize-none placeholder:text-muted"
                  placeholder="O escribe un problema: 2x² + 5x - 3 = 0"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      solve();
                    }
                  }}
                  rows={2}
                />
                <button 
                  onClick={solve}
                  disabled={loading || (!image && !text.trim())}
                  className="w-14 h-14 bg-gradient-to-br from-accent to-accent-light rounded-2xl flex items-center justify-center text-white shadow-[0_4px_20px_rgba(124,106,247,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shrink-0"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-error/10 border border-error/20 rounded-2xl p-4 flex gap-3 items-start"
                >
                  <AlertCircle size={18} className="text-error shrink-0 mt-0.5" />
                  <p className="text-error text-xs leading-relaxed">{error}</p>
                </motion.div>
              )}

              {/* Result Area */}
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl"
                >
                  <div className="flex items-center justify-between px-5 py-3.5 bg-accent/5 border-b border-border">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-accent font-mono">✓ Solución</span>
                    <button 
                      onClick={copyResult}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted text-xs font-mono hover:border-accent hover:text-accent transition-all"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <div className="p-5 text-text font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {result}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === "history" && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted font-mono">Historial reciente</h2>
                {history.length > 0 && (
                  <button 
                    onClick={() => setHistory([])}
                    className="text-[10px] font-bold uppercase text-error hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto text-muted/30">
                    <History size={32} />
                  </div>
                  <p className="text-muted text-sm font-mono">No hay problemas resueltos aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item, i) => (
                    <button 
                      key={item.timestamp}
                      onClick={() => { setResult(item.full); setTab("solver"); }}
                      className="w-full text-left bg-surface border border-border rounded-2xl p-4 hover:border-accent/40 hover:bg-card transition-all group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-muted text-xs font-mono truncate max-w-[80%]">{item.q}</div>
                        <ChevronRight size={14} className="text-muted group-hover:text-accent transition-colors" />
                      </div>
                      <div className="text-accent text-xs font-mono truncate">{item.a}</div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === "info" && (
            <motion.div 
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-3xl">🧮</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">¿Qué puedo resolver?</h3>
                  <div className="space-y-2">
                    {[
                      "Álgebra y ecuaciones",
                      "Cálculo diferencial e integral",
                      "Geometría y trigonometría",
                      "Estadística y probabilidad",
                      "Aritmética y fracciones",
                      "Sistemas de ecuaciones"
                    ].map(t => (
                      <div key={t} className="flex items-center gap-3 py-2 border-b border-border/50 text-muted text-sm font-mono">
                        <span className="text-success">✓</span> {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-6">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Info size={16} className="text-accent" />
                  Consejos
                </h3>
                <ul className="text-muted text-xs font-mono space-y-2.5 leading-relaxed">
                  <li>• Asegúrate de que la foto esté bien iluminada y enfocada</li>
                  <li>• Puedes combinar imagen + texto para más contexto</li>
                  <li>• Pulsa Enter para resolver rápidamente</li>
                  <li>• El historial guarda tus últimas 10 consultas</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface/90 backdrop-blur-xl border-t border-border px-6 pt-3 pb-8 flex justify-around z-20">
        {[
          { id: "solver", icon: <span className="text-xl">∑</span>, label: "Resolver" },
          { id: "history", icon: <History size={20} />, label: "Historial" },
          { id: "info", icon: <Info size={20} />, label: "Ayuda" },
        ].map(n => (
          <button 
            key={n.id} 
            onClick={() => setTab(n.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${tab === n.id ? "text-accent bg-accent/10" : "text-muted hover:text-text"}`}
          >
            {n.icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Camera Modal */}
      {showCamera && (
        <CameraView 
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
