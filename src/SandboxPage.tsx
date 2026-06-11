import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Code2, 
  Play, 
  RotateCcw, 
  Save, 
  BookOpen, 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  FileCode2, 
  Sparkles, 
  Monitor, 
  Smartphone, 
  HelpCircle,
  Lightbulb,
  Cpu,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SavedSnippet {
  id: string;
  name: string;
  code: string;
  templateType: string;
  updatedAt: string;
}

const TEMPLATES = [
  {
    id: 'imchat-post',
    name: '💬 IMChat Post Card',
    description: 'A social card with like button animations, avatar, badge, and comments mockup.',
    code: `<!-- IMChat Post Template with Tailwind CSS -->
<div class="max-w-md mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden font-sans hover:shadow-2xl transition-all duration-300">
  <!-- Author Section -->
  <div class="p-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="relative">
        <img class="w-12 h-12 rounded-full border-2 border-sky-400" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop" alt="Avatar"/>
        <div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
      </div>
      <div>
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-gray-900 text-sm">Gabriela Solis</span>
          <span class="text-blue-500">✨</span>
        </div>
        <span class="text-xs text-gray-500 font-medium">@gaby_solis • 2 min ago</span>
      </div>
    </div>
    
    <span class="px-2.5 py-1 bg-sky-50 text-sky-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
      VIP Member
    </span>
  </div>

  <!-- Content Image -->
  <div class="relative h-48 bg-gray-100 overflow-hidden group">
    <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://images.unsplash.com/photo-1491841573178-86d8c3b453db?w=600&fit=crop" alt="Content cover"/>
    <span class="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] rounded-lg font-semibold tracking-wide">
      #CreativePlayground
    </span>
  </div>

  <!-- Interactive Controls Section -->
  <div class="p-4">
    <p class="text-gray-700 text-xs sm:text-sm leading-relaxed mb-4">
      Experimenting with the live IMChat Sandbox! 💻 You can edit this very card directly in the editor, utilize any Tailwind classes and custom click animations, and watch the preview update immediately! Try adding your own text!
    </p>

    <!-- Like / Counter (Interactive Interactive Element) -->
    <div class="flex items-center justify-between border-t border-gray-50 pt-3">
      <button id="likeBtn" class="flex items-center gap-2 group p-2 rounded-xl hover:bg-rose-50/50 transition-all">
        <span id="heartIcon" class="text-gray-400 group-hover:text-rose-500 transition-colors text-lg">❤️</span>
        <span id="clickLabel" class="text-xs font-semibold text-gray-600 group-hover:text-rose-600">Like Card (0)</span>
      </button>

      <span class="text-[11px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
        Tailwind Sandbox v1
      </span>
    </div>
  </div>
</div>

<script>
  let clicks = 0;
  const likeBtn = document.getElementById('likeBtn');
  const label = document.getElementById('clickLabel');
  const heart = document.getElementById('heartIcon');

  likeBtn.addEventListener('click', () => {
    clicks++;
    label.innerText = 'Liked (' + clicks + ')';
    label.style.color = '#e11d48'; // Tailwind rose-600
    heart.style.transform = 'scale(1.4)';
    console.log('Post liked! Total clicks:', clicks);
    
    setTimeout(() => {
      heart.style.transform = 'scale(1)';
    }, 200);
  });
</script>
`
  },
  {
    id: 'cyber-badge',
    name: '⚡ Cyberpunk ID Badge',
    description: 'A neon-themed interactive profile display with custom animation loops.',
    code: `<!-- Cyberpunk ID Card Template -->
<div class="max-w-xs mx-auto bg-slate-950 text-teal-400 font-mono p-5 rounded-3xl border-2 border-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all">
  <div class="text-center font-bold text-[10px] tracking-widest text-teal-500 mb-3 select-none">
    // SECURITY CREDENTIALS
  </div>
  
  <div class="flex flex-col items-center">
    <!-- Holographic Avatar Frame -->
    <div class="relative w-24 h-24 mb-4 rounded-2xl overflow-hidden border-2 border-teal-400 flex items-center justify-center bg-teal-950/20">
      <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&fit=crop" class="w-full h-full object-cover opacity-80" />
      <div class="absolute inset-0 bg-gradient-to-t from-teal-950/40 via-transparent to-transparent"></div>
      <!-- Scan Bar Animation -->
      <div id="scanBar" class="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce" style="top: 0"></div>
    </div>

    <h2 class="font-bold text-lg text-white tracking-wide">NETRUNNER_7</h2>
    <p class="text-[11px] text-teal-500 mt-1 uppercase">MFA Status: Secured</p>
    
    <!-- Experience bar (Interactive) -->
    <div class="w-full mt-4 bg-slate-900 border border-teal-800 rounded-full h-2.5 overflow-hidden">
      <div id="xpBar" class="bg-gradient-to-r from-teal-500 to-emerald-400 h-full w-[45%] transition-all duration-300"></div>
    </div>
    <div class="flex justify-between w-full text-[10px] text-teal-600 mt-1">
      <span>XP: LEVEL 4</span>
      <span id="xpPercent">45%</span>
    </div>

    <!-- Interface Action Buttons -->
    <div class="grid grid-cols-2 gap-2 w-full mt-4">
      <button id="xpBtn" class="bg-teal-950/60 border border-teal-500/40 hover:bg-teal-900/60 text-teal-400 hover:text-white rounded-xl py-1.5 text-xs font-semibold select-none flex items-center justify-center gap-1 active:scale-95 transition-transform">
        ⚡ Earn XP
      </button>
      <button id="pingBtn" class="bg-slate-900 border border-teal-700 hover:bg-teal-950/40 text-teal-500 hover:text-white rounded-xl py-1.5 text-xs font-semibold select-none flex items-center justify-center select-none active:scale-95 transition-transform">
        🌐 Ping API
      </button>
    </div>
  </div>
</div>

<script>
  let xp = 45;
  const xpBtn = document.getElementById('xpBtn');
  const xpBar = document.getElementById('xpBar');
  const xpPercent = document.getElementById('xpPercent');
  const pingBtn = document.getElementById('pingBtn');

  xpBtn.addEventListener('click', () => {
    xp += 15;
    if (xp > 100) {
      xp = 15;
      console.log('🚀 SYSTEM LEVELED UP!');
    }
    xpBar.style.width = xp + '%';
    xpPercent.innerText = xp + '%';
    console.log('XP update: Earned +15 XP. Current value:', xp + '%');
  });

  pingBtn.addEventListener('click', () => {
    console.log('🤖 PING SENT. RTT: ' + Math.floor(Math.random() * 80 + 20) + 'ms');
  });
</script>
`
  },
  {
    id: 'physics-balls',
    name: '🎡 Interactive Particle Game',
    description: 'A touch-friendly canvas sandbox where you can spawn colored balls with physics!',
    code: `<!-- Canvas Sandbox Interactive Playroom -->
<div class="bg-slate-900 text-white rounded-3xl p-4 overflow-hidden shadow-xl max-w-sm mx-auto font-sans">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-1">
      <span class="text-amber-400">⚡</span>
      <span class="text-xs font-bold uppercase tracking-wider text-gray-300">Physics Canvas</span>
    </div>
    <button id="clearBtr" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded-lg text-gray-400 hover:text-white transition-all select-none">
      🧹 Reset Canvas
    </button>
  </div>

  <canvas id="sandCanvas" class="w-full bg-slate-950 rounded-2xl border border-slate-800" style="height: 180px;"></canvas>
  
  <p class="text-center text-[11px] text-gray-500 mt-2 select-none">
    👆 Click / Tap inside the black box to spawn dynamic colored balls!
  </p>
</div>

<script>
  const canvas = document.getElementById('sandCanvas');
  const ctx = canvas.getContext('2d');
  const clearBtn = document.getElementById('clearBtr');

  // Resize canvas according to layout scale
  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight || 180;
  }
  resize();
  window.addEventListener('resize', resize);

  const balls = [];
  const gravity = 0.3;
  const colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  class Ball {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = Math.random() * 8 + 6;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 4;
      this.bounce = 0.75;
    }

    update() {
      // Apply gravity
      this.vy += gravity;
      this.x += this.vx;
      this.y += this.vy;

      // Handle walls
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = -this.vx * this.bounce;
      } else if (this.x + this.radius > canvas.width) {
        this.x = canvas.width - this.radius;
        this.vx = -this.vx * this.bounce;
      }

      // Handle ceiling & floor
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = -this.vy * this.bounce;
      } else if (this.y + this.radius > canvas.height) {
        this.y = canvas.height - this.radius;
        this.vy = -this.vy * this.bounce;
        // Apply friction to stop horizontal movement
        this.vx *= 0.98;
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#00000030';
      ctx.stroke();
    }
  }

  // Draw loop
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines for sandbox feeling
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for(let i = 20; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for(let j = 20; j < canvas.height; j += 20) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    balls.forEach(ball => {
      ball.update();
      ball.draw();
    });

    requestAnimationFrame(loop);
  }
  loop();

  // Click handler to summon balls
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    balls.push(new Ball(x, y));
    console.log('Ball spawned at: ' + Math.round(x) + ', ' + Math.round(y) + '. Active count:', balls.length);
  });

  // Touch handler
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    balls.push(new Ball(x, y));
    console.log('Ball spawned (Touch) at: ' + Math.round(x) + ', ' + Math.round(y));
  });

  clearBtn.addEventListener('click', () => {
    balls.length = 0;
    console.log('Canvas cleared!');
  });
</script>
`
  },
  {
    id: 'counter-widget',
    name: '🔢 Elegant Floating Calculator/Counter',
    description: 'A beautiful visual helper utility with multiple counts and custom operations.',
    code: `<!-- Interactive Utility Widget -->
<div class="max-w-xs mx-auto bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-[28px] p-5 shadow-2xl border border-indigo-500/20 font-sans">
  <div class="flex items-center justify-between mb-4">
    <span class="text-xs font-semibold text-indigo-300 uppercase tracking-widest">// Quick Counter</span>
    <span id="badge" class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[9px] font-bold">ACTIVE</span>
  </div>

  <div class="bg-black/30 backdrop-blur-md rounded-2xl p-4 mb-4 text-center border border-slate-800">
    <span class="text-sm text-gray-400 font-medium">Accumulator Value</span>
    <h1 id="countDis" class="text-4xl font-extrabold tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">0</h1>
  </div>

  <div class="p-1.5 grid grid-cols-3 gap-2 bg-slate-950/40 rounded-2xl border border-slate-900">
    <button id="minusBtn" class="bg-slate-800 hover:bg-slate-700 active:scale-90 text-lg font-bold rounded-xl py-2 transition-all select-none">
      -
    </button>
    <button id="resetBtn" class="bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900/40 active:scale-90 text-xs font-bold rounded-xl py-2 transition-all select-none">
      Reset
    </button>
    <button id="plusBtn" class="bg-slate-800 hover:bg-slate-700 active:scale-90 text-lg font-bold rounded-xl py-2 transition-all select-none">
      +
    </button>
  </div>

  <!-- Interactive Multiplier row -->
  <div class="flex items-center justify-between gap-2 mt-4">
    <span class="text-[11px] text-gray-400 font-medium">Multiplier Option:</span>
    <div class="flex gap-1.5">
      <button id="mult2" class="px-2.5 py-1 bg-slate-800 text-[10px] font-bold rounded-lg hover:bg-indigo-600 transition-colors pointer-events-auto">x2</button>
      <button id="mult5" class="px-2.5 py-1 bg-slate-800 text-[10px] font-bold rounded-lg hover:bg-indigo-600 transition-colors pointer-events-auto">x5</button>
    </div>
  </div>
</div>

<script>
  let value = 0;
  const countDis = document.getElementById('countDis');
  const minus = document.getElementById('minusBtn');
  const plus = document.getElementById('plusBtn');
  const reset = document.getElementById('resetBtn');
  const mult2 = document.getElementById('mult2');
  const mult5 = document.getElementById('mult5');

  function update() {
    countDis.innerText = value;
    if (value > 0) {
      countDis.style.color = '#22d3ee'; // cyan
    } else if (value < 0) {
      countDis.style.color = '#f43f5e'; // rose
    } else {
      countDis.style.color = '';
    }
  }

  plus.addEventListener('click', () => {
    value++;
    update();
    console.log('Value incremented to:', value);
  });

  minus.addEventListener('click', () => {
    value--;
    update();
    console.log('Value decremented to:', value);
  });

  reset.addEventListener('click', () => {
    value = 0;
    update();
    console.log('Value reset to 0');
  });

  mult2.addEventListener('click', () => {
    value = value * 2;
    update();
    console.log('Applied Multiplier x2. New value:', value);
  });

  mult5.addEventListener('click', () => {
    value = value * 5;
    update();
    console.log('Applied Multiplier x5. New value:', value);
  });
</script>
`
  }
];

export default function SandboxPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'templates' | 'console'>('editor');
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [autoRun, setAutoRun] = useState(true);
  const [logs, setLogs] = useState<{ type: 'log' | 'error' | 'system'; message: string; timestamp: Date }[]>([
    { type: 'system', message: '🚀 Sandbox initialized. Select a template or write custom HTML/CSS/Tailwind!', timestamp: new Date() }
  ]);
  const [previewSize, setPreviewSize] = useState<'normal' | 'slim'>('normal');
  const [copied, setCopied] = useState(false);
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>([]);
  const [savingSnippet, setSavingSnippet] = useState(false);
  const [newSnippetName, setNewSnippetName] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load Saved Snippets
  useEffect(() => {
    try {
      const stored = localStorage.getItem('imchat_sandbox_snippets');
      if (stored) {
        setSavedSnippets(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse saved snippets', e);
    }
  }, []);

  // Update Console Logs Auto-Scroll
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle errors / console log messages from inside the preview iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object') {
        if (e.data.type === 'CONSOLE_LOG') {
          setLogs(prev => [...prev, { type: 'log', message: `${e.data.data}`, timestamp: new Date() }]);
        } else if (e.data.type === 'CONSOLE_ERROR') {
          setLogs(prev => [...prev, { type: 'error', message: `${e.data.data}`, timestamp: new Date() }]);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Run/AutoRun trigger
  useEffect(() => {
    if (autoRun) {
      const timer = setTimeout(() => {
        runCode();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [code, autoRun]);

  const runCode = () => {
    if (!iframeRef.current) return;
    
    // Inject custom iframe template with support for local logs & tailwind compiled content
    const baseTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { 
            margin: 0; 
            padding: 16px; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background: radial-gradient(circle at top left, #f8fafc, #f1f5f9);
            color: #1e293b; 
            min-height: calc(100vh - 32px);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          /* Custom sleek scrollbar inside iframe */
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9px; }
        </style>
      </head>
      <body>
        <div class="w-full flex justify-center items-center py-4">
          <div id="sandbox-root" class="w-full">
            <!-- USER_CODE -->
            ${code}
          </div>
        </div>
        <script>
          // Sniff Console log and push messages to parent
          (function() {
            const originalLog = console.log;
            const originalError = console.error;
            
            console.log = function(...args) {
              originalLog.apply(console, args);
              const formattedArgs = args.map(arg => {
                if (typeof arg === 'object') {
                  try { return JSON.stringify(arg); } catch(err) { return String(arg); }
                }
                return String(arg);
              }).join(' ');
              window.parent.postMessage({ type: 'CONSOLE_LOG', data: formattedArgs }, '*');
            };
            
            console.error = function(...args) {
              originalError.apply(console, args);
              window.parent.postMessage({ type: 'CONSOLE_ERROR', data: args.join(' ') }, '*');
            };

            window.onerror = function(message, source, lineno, colno, error) {
              window.parent.postMessage({ 
                type: 'CONSOLE_ERROR', 
                data: message + ' [Line ' + lineno + ']' 
              }, '*');
              return false;
            };
          })();
        </script>
      </body>
      </html>
    `;

    try {
      // Clean previous logs and reload
      const frame = iframeRef.current;
      frame.srcdoc = baseTemplate;
    } catch (e: any) {
      setLogs(prev => [...prev, { type: 'error', message: `Preview Error: ${e.message}`, timestamp: new Date() }]);
    }
  };

  const loadTemplate = (templateCode: string, name: string) => {
    setCode(templateCode);
    setLogs(prev => [...prev, { type: 'system', message: `Loaded template: ${name}`, timestamp: new Date() }]);
    setActiveTab('editor');
    showNotification(`Plantilla loaded: ${name}`, 'info');
  };

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  // Clipboard Copier
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showNotification('Código copiado al portapapeles!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSnippet = () => {
    if (!newSnippetName.trim()) {
      showNotification('Por favor, ingresa un nombre para guardar.', 'info');
      return;
    }

    const newSnippet: SavedSnippet = {
      id: Date.now().toString(),
      name: newSnippetName.trim(),
      code: code,
      templateType: 'custom',
      updatedAt: new Date().toLocaleDateString()
    };

    const updated = [newSnippet, ...savedSnippets];
    setSavedSnippets(updated);
    localStorage.setItem('imchat_sandbox_snippets', JSON.stringify(updated));
    setNewSnippetName('');
    setSavingSnippet(false);
    showNotification('Snippet saved successfully!', 'success');
  };

  const deleteSnippet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSnippets.filter(s => s.id !== id);
    setSavedSnippets(updated);
    localStorage.setItem('imchat_sandbox_snippets', JSON.stringify(updated));
    showNotification('Snippet eliminado', 'info');
  };

  const clearConsole = () => {
    setLogs([{ type: 'system', message: '📋 Logs cleared.', timestamp: new Date() }]);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto h-full text-gray-800 pb-16">
      {/* Top Banner Navigation */}
      <div className="bg-gradient-to-r from-[#0A66C2] to-sky-500 text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1 hover:bg-white/15 rounded-full transition-transform active:scale-90"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-xl">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Módulos Sandbox</h2>
              <span className="text-[10px] text-blue-150 uppercase tracking-widest font-semibold">Live Developer Playground</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={copyCode}
            className="p-2 bg-white/10 hover:bg-white/15 active:scale-90 rounded-xl transition-all"
            title="Copiar código"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-white" />}
          </button>
          
          <button 
            onClick={() => setSavingSnippet(true)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-700/10"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Global Status Message Alert */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-sm z-30 ${
              message.type === 'success' 
                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                : 'bg-blue-55 border border-blue-100 text-[#0A66C2]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
        {savingSnippet && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="fixed inset-0" onClick={() => setSavingSnippet(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm relative z-10 shadow-2xl flex flex-col space-y-4"
            >
              <div className="flex items-center gap-2.5 text-gray-900">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Guardar Snippet</h3>
                  <p className="text-[11px] text-gray-500">Persiste tu creación en LocalStorage</p>
                </div>
              </div>

              <input 
                type="text" 
                placeholder="Nombre del Snippet (ej: Mi Post Increíble)" 
                value={newSnippetName}
                onChange={(e) => setNewSnippetName(e.target.value)}
                maxLength={40}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:border-emerald-500 transition-colors font-medium"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={() => setSavingSnippet(false)}
                  className="py-3 bg-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveSnippet}
                  className="py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout Tabs Menu */}
      <div className="mx-4 mt-4 bg-white p-1 rounded-2xl flex border border-gray-100 shadow-sm relative z-10">
        {(['editor', 'preview', 'templates', 'console'] as const).map(tab => {
          const isActive = activeTab === tab;
          const label = {
            editor: 'Editor',
            preview: 'Visualización',
            templates: 'Plantillas',
            console: `Logs ${logs.filter(l => l.type === 'error').length > 0 ? '⚠️' : ''}`
          }[tab];
          
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                isActive ? 'bg-gradient-to-b from-gray-50 to-gray-100 shadow-inner' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-sandbox-tab" 
                  className="absolute inset-[3px] bg-white border border-gray-200/50 rounded-lg shadow-sm -z-10" 
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* Main Sandbox Interactive Views */}
      <div className="flex-1 min-h-[350px] mx-4 mt-3 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* 1. SOURCE CODE EDITOR */}
          {activeTab === 'editor' && (
            <motion.div
              key="editor-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden font-mono min-h-[400px]"
            >
              {/* Editor Header Control Utilities */}
              <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-500 font-bold ml-2">INDEX.HTML</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400 hover:text-white transition-colors pr-2 border-r border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={autoRun}
                      onChange={(e) => setAutoRun(e.target.checked)}
                      className="accent-emerald-500 cursor-pointer w-3.5 h-3.5 rounded"
                    />
                    <span>Auto-compilar</span>
                  </label>

                  <button 
                    onClick={runCode}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/30 transition-all select-none active:scale-95"
                    title="Run code manually"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
              </div>

              {/* Editable TextArea Box */}
              <div className="flex-1 relative flex">
                {/* Visual Line numbers mockup */}
                <div className="bg-slate-950/40 w-11 py-4 text-right pr-2 text-slate-600 select-none text-xs leading-6 border-r border-slate-950 flex flex-col">
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <span key={idx}>{idx + 1}</span>
                  ))}
                </div>

                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="<!-- Escribe tu HTML/Tailwind aquí... -->"
                  spellCheck={false}
                  className="flex-1 bg-transparent text-slate-100 text-[11px] leading-6 p-4 resize-none focus:outline-none overflow-y-auto selection:bg-sky-500/20 font-mono"
                  style={{ whiteSpace: 'pre', overflowX: 'auto' }}
                />
              </div>

              {/* Editor bottom tag / helper utilities */}
              <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-t border-slate-800 text-[9px] text-slate-500 select-none">
                <div className="flex items-center gap-3">
                  <span>Tailwind CSS v3 Available</span>
                  <span>•</span>
                  <span>ES6 JS Engine</span>
                </div>
                
                <button 
                  onClick={() => setCode('')} 
                  className="text-slate-400 hover:text-rose-400 flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vaciar editor</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. REAL-TIME PREVIEW PANEL (IFRAME) */}
          {activeTab === 'preview' && (
            <motion.div
              key="preview-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xl min-h-[400px] relative"
            >
              {/* Viewport Control Bar */}
              <div className="bg-gray-50 border-b border-gray-150 px-4 py-2 flex items-center justify-between select-none">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPreviewSize('normal')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      previewSize === 'normal' ? 'bg-white text-brand-blue shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-650'
                    }`}
                    title="Fullscreen"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPreviewSize('slim')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      previewSize === 'slim' ? 'bg-white text-brand-blue shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-650'
                    }`}
                    title="Mobile preview"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-sky-50 text-sky-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Vista previa activa
                  </span>

                  <button 
                    onClick={runCode}
                    className="p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-gray-600 active:scale-95 rounded-lg transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Rendering Wrapper */}
              <div className="flex-1 flex items-center justify-center p-4 bg-gray-100 overflow-hidden h-full">
                <div 
                  className={`bg-white transition-all duration-300 w-full h-[320px] rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden ${
                    previewSize === 'slim' ? 'max-w-xs' : 'max-w-full'
                  }`}
                >
                  <iframe
                    ref={iframeRef}
                    title="Sandbox Live Preview"
                    className="w-full h-full border-none pointer-events-auto bg-transparent"
                    sandbox="allow-scripts allow-modals allow-pointer-lock"
                  />
                </div>
              </div>

              {/* Error indicator overlay */}
              {logs.filter(l => l.type === 'error').length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 bg-rose-50 border border-rose-100 p-3 rounded-2xl shadow-lg flex items-start gap-2 text-rose-700 text-xs animate-bounce pointer-events-auto">
                  <span className="text-sm">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold block">Se detectó un error de JS</span>
                    <span className="font-mono text-[10px] text-rose-600 truncate block">
                      {logs.filter(l => l.type === 'error').slice(-1)[0]?.message}
                    </span>
                  </div>
                  <button 
                    className="underline font-bold shrink-0 ml-1 text-[10px]" 
                    onClick={() => setActiveTab('console')}
                  >
                    Ver Consola
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. PREBUILT CODE TEMPLATES */}
          {activeTab === 'templates' && (
            <motion.div
              key="templates-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col space-y-4 h-full"
            >
              {/* Custom Presets list */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block px-1">Diseños preestablecidos (Templates)</span>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {TEMPLATES.map((tpl) => (
                    <div 
                      key={tpl.id}
                      onClick={() => loadTemplate(tpl.code, tpl.name)}
                      className="bg-white border border-gray-100 hover:border-[#0A66C2] rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#0A66C2] transition-colors">{tpl.name}</h4>
                        <p className="text-xs text-gray-500 leading-normal pr-5">{tpl.description}</p>
                      </div>
                      
                      <div className="p-2 bg-blue-50 text-[#0A66C2] rounded-xl font-bold shrink-0 self-center group-hover:bg-[#0A66C2] group-hover:text-white transition-all text-xs">
                        Cargar
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved snippets sub-section */}
              {savedSnippets.length > 0 && (
                <div className="space-y-2.5 pt-2 flex-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tus Guardados Snippets ({savedSnippets.length})</span>
                    <button 
                      onClick={() => {
                        if (window.confirm('¿Seguro que deseas eliminar todos tus snippets guardados?')) {
                          setSavedSnippets([]);
                          localStorage.removeItem('imchat_sandbox_snippets');
                          showNotification('Snippets vaciados', 'info');
                        }
                      }}
                      className="text-[10px] text-gray-400 hover:text-rose-500 font-bold"
                    >
                      Eliminar todos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 border-t border-gray-100 pt-3">
                    {savedSnippets.map((ss) => (
                      <div 
                        key={ss.id}
                        onClick={() => loadTemplate(ss.code, ss.name)}
                        className="bg-gray-100/60 border border-gray-150 rounded-2xl p-3.5 flex items-center justify-between group cursor-pointer hover:bg-white hover:border-[#0A66C2] hover:shadow transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <FileCode2 className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-gray-800 block group-hover:text-[#0A66C2]">{ss.name}</span>
                            <span className="text-[9px] text-gray-400 font-semibold uppercase">{ss.updatedAt}</span>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => deleteSnippet(ss.id, e)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Onboarding hint card */}
              <div className="bg-gradient-to-br from-indigo-50 to-sky-50 rounded-3xl p-5 border border-indigo-100 flex items-start gap-3 mt-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                  <Lightbulb className="w-5 h-5 shrink-0" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-xs text-indigo-950">Learning Sandbox</h5>
                  <p className="text-xs text-indigo-800 leading-normal">
                    The sandbox simulates a clean browser preview with full Tailwind CSS rendering. You can use utility classes like <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px] font-bold">bg-gradient-to-r</code> or <code className="bg-white/60 px-1 py-0.5 rounded font-mono text-[10px] font-bold">animate-bounce</code>, and implement custom trigger scripts locally. It is completely isolated and safe!
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. TERMINAL CONSOLE LOG PANEL */}
          {activeTab === 'console' && (
            <motion.div
              key="console-tab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col bg-slate-950 border border-slate-900 rounded-3xl shadow-xl overflow-hidden font-mono min-h-[400px]"
            >
              {/* Console Header */}
              <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-950 select-none">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lector de Consola (JS)</span>
                </div>

                <button 
                  onClick={clearConsole}
                  className="px-2.5 py-1 bg-slate-800/60 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors"
                >
                  Clear Logs
                </button>
              </div>

              {/* Console logs body */}
              <div className="flex-1 p-4 overflow-y-auto leading-6 text-xs flex flex-col space-y-2 max-h-[300px]">
                {logs.map((log, index) => {
                  let badgeColor = 'text-slate-400';
                  let bgClasses = 'bg-slate-900/10';
                  if (log.type === 'error') {
                    badgeColor = 'text-rose-500 font-semibold';
                    bgClasses = 'bg-rose-950/20 px-2 py-1 rounded-xl border border-rose-950/40 text-rose-300';
                  } else if (log.type === 'system') {
                    badgeColor = 'text-sky-400 font-bold';
                    bgClasses = 'bg-slate-900/60 px-2 py-1.5 rounded-xl text-sky-200';
                  }

                  const timeStampStr = log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <div key={index} className={`flex items-start gap-2.5 ${bgClasses}`}>
                      <span className="text-slate-650 shrink-0 select-none font-bold">[{timeStampStr}]</span>
                      <span className={`shrink-0 select-none ${badgeColor}`}>
                        {log.type === 'error' ? '✖ error' : log.type === 'system' ? '⚙ sys' : '💬 log'}
                      </span>
                      <span className="flex-1 break-all whitespace-pre-wrap">{log.message}</span>
                    </div>
                  );
                })}
                <div ref={consoleEndRef} />
              </div>

              {/* Interactive REPL/Command input mock (for design flair) */}
              <div className="bg-slate-900 p-3 flex items-center border-t border-slate-950 select-none">
                <span className="text-emerald-500 font-bold mr-2">{'>'}</span>
                <input 
                  type="text" 
                  placeholder="Interceptando comandos del script..." 
                  disabled
                  className="bg-transparent border-none outline-none text-slate-500 w-full text-xs font-semibold select-none"
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
