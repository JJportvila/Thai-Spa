import React, { useState, useMemo, useRef, Suspense, useCallback, useEffect } from 'react';
import { 
  Store, Layers, Edit3, X, Maximize2, Minimize2, Plus, Monitor, Wallet, Pointer, Hand, Target, Cloud, ChevronDown, Grid3X3, Box, Eye, PenTool, Save, Trash2, Maximize, RotateCw, RefreshCw, BoxSelect, Grid, Library, Wind, Video, Refrigerator, Zap, Coffee, IceCream, Armchair, ShoppingBag, DoorOpen, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid as ThreeGrid, Text, PerspectiveCamera, Environment, ContactShadows, Line, Sphere, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { getCachedSharedState, loadSharedState, saveSharedState } from '../lib/sharedStateStore';

// --- PHOTO-REALISTIC RETAIL & ARCHITECTURE MODELS ---

const ProfessionalShelf = ({ size, color, isSelected }: any) => {
  const [l, h, w] = size; const pillarT = 0.08; const layerCount = 5; const gap = h / layerCount;
  return (
    <group>
      <mesh position={[-l/2+pillarT, 0, -w/2+pillarT]} castShadow><boxGeometry args={[pillarT, h, pillarT]} /><meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} /></mesh>
      <mesh position={[l/2-pillarT, 0, -w/2+pillarT]} castShadow><boxGeometry args={[pillarT, h, pillarT]} /><meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} /></mesh>
      <mesh position={[-l/2+pillarT, 0, w/2-pillarT]} castShadow><boxGeometry args={[pillarT, h, pillarT]} /><meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} /></mesh>
      <mesh position={[l/2-pillarT, 0, w/2-pillarT]} castShadow><boxGeometry args={[pillarT, h, pillarT]} /><meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} /></mesh>
      {[...Array(layerCount)].map((_, i) => (
        <group key={i} position={[0, -h/2 + (i+1)*gap - gap/2, 0]}>
           <mesh castShadow receiveShadow><boxGeometry args={[l - 0.05, 0.04, w - 0.05]} /><meshStandardMaterial color={color} metalness={0.4} roughness={0.6} /></mesh>
           <mesh position={[0, 0.05, w/2-0.02]}><boxGeometry args={[l-0.1, 0.08, 0.01]} /><meshStandardMaterial color="#94a3b8" transparent opacity={0.6} /></mesh>
        </group>
      ))}
      {isSelected && <mesh scale={[1.05, 1.02, 1.05]}><boxGeometry args={[l, h, w]} /><meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.3} /></mesh>}
    </group>
  );
};

const BeverageCooler = ({ size, doors = 1, isSelected }: any) => {
  const [l, h, w] = size;
  return (
    <group>
      <mesh castShadow><boxGeometry args={[l, h, w]} /><meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} /></mesh>
      {[...Array(doors)].map((_, i) => (
        <mesh key={i} position={[(i - (doors-1)/2) * (l/doors), 0, w/2 + 0.01]} castShadow>
          <boxGeometry args={[l/doors - 0.1, h - 0.2, 0.02]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.4} metalness={1} roughness={0} />
        </mesh>
      ))}
      <pointLight position={[0, 0, w/3]} intensity={1.5} color="#bae6fd" distance={3} />
      {isSelected && <mesh scale={[1.05, 1.02, 1.05]}><boxGeometry args={[l, h, w]} /><meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.3} /></mesh>}
    </group>
  );
};

const ArchitecturalOpening = ({ type, size, isSelected }: any) => {
  const [l, h, w] = size;
  return (
    <group>
      {/* Frame */}
      <mesh castShadow><boxGeometry args={[l, h, w]} /><meshStandardMaterial color="#334155" /></mesh>
      {/* Opening/Glass */}
      <mesh position={[0, 0, 0.01]}><boxGeometry args={[l-0.2, h-0.2, w+0.02]} /><meshStandardMaterial color={type === 'WINDOW' ? '#93c5fd' : '#1e1e1e'} transparent opacity={type === 'WINDOW' ? 0.3 : 1} metalness={type === 'WINDOW' ? 1 : 0} roughness={0} /></mesh>
      {isSelected && <mesh scale={[1.05, 1.02, 1.05]}><boxGeometry args={[l, h, w]} /><meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.3} /></mesh>}
    </group>
  );
};

// --- HYBRID 2D/3D SYNC ENGINE ---

const Canvas2DEngine = ({ objects, selectedId, onSelect, onUpdate, dims, autoScale }: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<'NONE' | 'MOVE' | 'ROTATE'>('NONE');
  const initialPos = useRef({ x: 0, y: 0, rot: 0 });
  const startMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1; const step = 0.5 * autoScale;
      for(let x=0;x<=canvas.width;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
      for(let y=0;y<=canvas.height;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}

      objects.forEach((obj: any) => {
        const isSel = obj.id === selectedId; const w = obj.l * autoScale; const h = obj.w * autoScale;
        const cx = (dims.length/2 + obj.x) * autoScale; const cy = (dims.width/2 + obj.y) * autoScale;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((obj.rotation || 0) * Math.PI / 180);
        if (isSel) { ctx.shadowBlur = 40; ctx.shadowColor = 'rgba(99, 102, 241, 0.4)'; }
        
        ctx.fillStyle = obj.type === 'WALL' ? '#334155' : isSel ? '#ffffff' : '#f8fafc';
        ctx.strokeStyle = isSel ? '#6366f1' : '#e2e8f0'; ctx.lineWidth = isSel ? 3 : 1;
        ctx.fillRect(-w/2, -h/2, w, h); ctx.strokeRect(-w/2, -h/2, w, h);

        if (isSel) {
            ctx.beginPath(); ctx.arc(0, -h/2 - 25, 6, 0, Math.PI*2); ctx.fillStyle = '#6366f1'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, -h/2); ctx.lineTo(0, -h/2 - 25); ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.fillStyle = isSel ? '#6366f1' : (obj.type === 'WALL' ? '#ffffff' : '#475569'); ctx.font = 'bold 8px Inter'; ctx.textAlign = 'center'; ctx.fillText(obj.name, 0, 4);
        ctx.restore();
      });
    };
    const req = requestAnimationFrame(draw); return () => cancelAnimationFrame(req);
  }, [objects, selectedId, autoScale, dims]);

  const handlePointer = (e: React.MouseEvent, type: 'DOWN' | 'MOVE' | 'UP') => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const mx = (e.clientX - rect.left) / autoScale - dims.length/2;
    const my = (e.clientY - rect.top) / autoScale - dims.width/2;
    if (type === 'DOWN') {
      const target = objects.slice().reverse().find((o: any) => {
          if (o.id === selectedId) {
             const distToHandle = Math.sqrt(Math.pow(mx - (o.x + Math.sin(o.rotation*Math.PI/180) * (-o.w/2-25/autoScale)), 2) + Math.pow(my - (o.y - Math.cos(o.rotation*Math.PI/180) * (-o.w/2-25/autoScale)), 2));
             if (distToHandle < 15/autoScale) { setDragState('ROTATE'); return true; }
          }
          return Math.abs(mx - o.x) < o.l/2 && Math.abs(my - o.y) < o.w/2;
      });
      if (target) { onSelect(target.id); if(dragState !== 'ROTATE') setDragState('MOVE'); initialPos.current = { x: target.x, y: target.y, rot: target.rotation || 0 }; startMouse.current = { x: mx, y: my }; } else { onSelect(null); }
    } else if (type === 'MOVE' && dragState !== 'NONE' && selectedId) {
       const obj = objects.find(o=>o.id === selectedId); if (!obj) return;
       if (dragState === 'MOVE') { onUpdate(selectedId, { x: initialPos.current.x + (mx - startMouse.current.x), y: initialPos.current.y + (my - startMouse.current.y) }); }
       else if (dragState === 'ROTATE') { const angle = Math.atan2(my - obj.y, mx - obj.x) * 180 / Math.PI + 90; onUpdate(selectedId, { rotation: Math.round(angle / 5) * 5 }); }
    } else if (type === 'UP') { setDragState('NONE'); }
  };
  return ( <canvas ref={canvasRef} width={dims.length * autoScale} height={dims.width * autoScale} onMouseDown={e => handlePointer(e, 'DOWN')} onMouseMove={e => handlePointer(e, 'MOVE')} onMouseUp={e => handlePointer(e, 'UP')} onMouseLeave={e => handlePointer(e, 'UP')} className="bg-white shadow-2xl rounded-3xl" /> );
};

const WarehouseShelfManagement: React.FC = () => {
  const LAYOUT_ACCOUNT_ID = 'GLOBAL';
  const LAYOUT_STATE_KEY = 'warehouse_layout_v3';
  const [viewMode, setViewMode] = useState<'DESIGN' | 'REALITY'>('DESIGN');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dims, setDims] = useState({ length: 44, width: 22, height: 6 });
  const [objects, setObjects] = useState<any[]>(() => {
     const saved = getCachedSharedState<any[]>(LAYOUT_ACCOUNT_ID, LAYOUT_STATE_KEY, []);
     return saved.length > 0 ? saved : [{ id: 'core_wall', type: 'WALL', name: 'Internal Load Wall', x: 0, y: 0, l: 0.2, w: 10, h: 5, rotation: 0, color: '#334155' }];
  });
  const [autoScale, setAutoScale] = useState(15);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const synced = await loadSharedState<any[]>(LAYOUT_ACCOUNT_ID, LAYOUT_STATE_KEY, objects);
      if (Array.isArray(synced) && synced.length > 0) {
        setObjects(synced);
      }
    })();
  }, []);

  useEffect(() => {
    const update = () => { if (!containerRef.current) return; setAutoScale(Math.min((containerRef.current.clientWidth - 150) / dims.length, (containerRef.current.clientHeight - 150) / dims.width)); };
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
  }, [dims, viewMode]);

  const handleUpdate = (id: string, updates: any) => {
    setObjects(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next = { ...o, ...updates };
      if (next.type !== 'WALL') { // Only clamp retail assets, allow architectural freedom
        const rad = (next.rotation || 0) * (Math.PI / 180);
        const worldW = next.l * Math.abs(Math.cos(rad)) + next.w * Math.abs(Math.sin(rad));
        const worldH = next.l * Math.abs(Math.sin(rad)) + next.w * Math.abs(Math.cos(rad));
        next.x = Math.max(-dims.length/2 + worldW/2, Math.min(dims.length/2 - worldW/2, next.x));
        next.y = Math.max(-dims.width/2 + worldH/2, Math.min(dims.width/2 - worldH/2, next.y));
      }
      return next;
    }));
  };

  const spawn = (type: string, name: string, l: number, w: number, h: number, extra: any = {}) => {
      const id = Date.now().toString();
      setObjects([...objects, { id, type, name, x: 0, y: 0, l, w, h, rotation: 0, color: '#f1f5f9', ...extra }]);
      setSelectedId(id);
  };

  return (
    <div className="w-full min-h-screen bg-[#f3f4f6] flex flex-col font-sans overflow-hidden">
       {/* LUXURY TOP BAR */}
       <div className="ui-card min-h-14 bg-white/80 backdrop-blur-3xl border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between px-3 sm:px-6 lg:px-8 py-2 gap-2 z-[100]">
          <div className="flex items-center gap-3 sm:gap-4"><div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-[#1a237e] font-black">S</div><span className="text-xs sm:text-sm font-black italic tracking-tighter text-slate-800 uppercase tracking-[3px] sm:tracking-[4px]">Architect Studio v8.0</span></div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 border border-slate-200 shadow-inner w-full lg:w-auto">
             <button onClick={() => setViewMode('DESIGN')} className={`flex-1 lg:flex-none px-4 sm:px-6 lg:px-8 py-2 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 ${viewMode === 'DESIGN' ? 'bg-white shadow-xl text-slate-900 scale-[1.02]' : 'text-slate-500'}`}><PenTool size={16}/> CAD Blueprint</button>
             <button onClick={() => setViewMode('REALITY')} className={`flex-1 lg:flex-none px-4 sm:px-6 lg:px-8 py-2 rounded-xl text-[11px] font-black uppercase transition-all flex items-center justify-center gap-2 ${viewMode === 'REALITY' ? 'bg-white shadow-2xl text-[#1a237e] scale-[1.02]' : 'text-slate-500'}`}><Eye size={16}/> 3D Reality</button>
          </div>
          <button onClick={() => { void saveSharedState(LAYOUT_ACCOUNT_ID, LAYOUT_STATE_KEY, objects); alert('Saved to Supabase'); }} className="h-9 w-full lg:w-auto px-6 bg-[#1a237e] text-[#1a237e] rounded-xl text-[10px] font-black uppercase shadow-lg">Save Drawing</button>
       </div>

       <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
          {/* ARCHITECTURAL ASSET DRAWER */}
          <div className="ui-card w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-6 flex flex-col space-y-5 sm:space-y-8 max-h-[38vh] lg:max-h-none">
             <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest"><span>ASSET LIBRARY</span><Library size={14}/></div>
             
             <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
                {/* ARCHITECTURE */}
                <div className="space-y-3">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase italic">Architecture & Openings</h4>
                   <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
                       <button onClick={() => spawn('WALL', 'Internal Wall', 8, 0.2, 5.0)} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><Layout size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">INTERIOR WALL</span></button>
                       <button onClick={() => spawn('DOOR', 'Entrance Door', 1.2, 0.4, 2.5)} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><DoorOpen size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">GLASS DOOR</span></button>
                       <button onClick={() => spawn('WINDOW', 'Display Window', 3.0, 0.2, 2.0)} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><Maximize size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">WINDOW</span></button>
                   </div>
                </div>

                {/* RETAIL ASSETS (PREV) */}
                <div className="space-y-3">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase italic">Retail & Shelving</h4>
                   <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
                       <button onClick={() => spawn('SHELF', 'Standard Rack', 5, 2, 4.5)} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><Layers size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">STEEL RACK</span></button>
                       <button onClick={() => spawn('COOLER', '3-Door Beverage', 4.5, 1.2, 2.2, { doors: 3 })} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><Refrigerator size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">FRIDGE</span></button>
                   </div>
                </div>

                {/* ELECTRONICS (PREV) */}
                <div className="space-y-3">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase italic">Appliances</h4>
                   <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
                       <button onClick={() => spawn('AC', 'Smart Wall AC', 1.2, 0.4, 0.4)} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><Wind size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">AC UNIT</span></button>
                       <button onClick={() => spawn('CCTV', '360Dome Camera', 0.5, 0.5, 0.5)} className="p-3 bg-slate-50 rounded-xl hover:bg-white hover:text-[#1a237e] transition-all text-center"><Video size={18} className="mx-auto mb-1"/><span className="text-[8px] font-bold">CCTV</span></button>
                   </div>
                </div>
             </div>
          </div>

          <div ref={containerRef} className="flex-1 min-h-[50vh] lg:min-h-0 bg-[#f1f5f9] flex items-center justify-center overflow-hidden relative">
             {viewMode === 'DESIGN' ? (
                <Canvas2DEngine objects={objects} selectedId={selectedId} onSelect={setSelectedId} onUpdate={handleUpdate} dims={dims} autoScale={autoScale} />
             ) : (
                <div className="w-full h-full bg-[#020617]">
                   <Canvas shadows dpr={[1, 2]}>
                      <PerspectiveCamera makeDefault position={[30, 35, 30]} fov={30} />
                      <OrbitControls makeDefault enableDamping />
                      <ambientLight intensity={0.5} /> <spotLight position={[20, 40, 20]} angle={0.25} intensity={2} castShadow />
                      <Suspense fallback={null}>
                         <group><mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#000000" /></mesh></group>
                         <group><mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0, 0.02, 0]}><planeGeometry args={[dims.length, dims.width]} /><meshStandardMaterial color="#ffffff" /></mesh></group>
                         <group>{objects.map(obj => (
                            <group key={obj.id} position={[obj.x, obj.h/2, obj.y]} rotation={[0, (obj.rotation || 0)*Math.PI/180, 0]}>
                               {obj.type === 'WALL' ? <mesh castShadow><boxGeometry args={[obj.l, obj.h, obj.w]} /><meshStandardMaterial color="#334155" /></mesh>
                                : obj.type === 'DOOR' || obj.type === 'WINDOW' ? <ArchitecturalOpening type={obj.type} size={[obj.l, obj.h, obj.w]} isSelected={selectedId===obj.id} />
                                : obj.type === 'SHELF' ? <ProfessionalShelf size={[obj.l, obj.h, obj.w]} color={obj.color} isSelected={selectedId === obj.id} /> 
                                : obj.type === 'COOLER' ? <BeverageCooler size={[obj.l, obj.h, obj.w]} doors={obj.doors} isSelected={selectedId === obj.id} />
                                : obj.type === 'AC' ? <AirConditioner isSelected={selectedId === obj.id} />
                                : obj.type === 'CCTV' ? <CCTVCamera isSelected={selectedId === obj.id} />
                                : <mesh castShadow><boxGeometry args={[obj.l, obj.h, obj.w]} /><meshStandardMaterial color={selectedId === obj.id ? '#6366f1' : obj.color} /></mesh>}
                            </group>
                         ))}</group>
                         <Environment preset="night" />
                         <ContactShadows opacity={0.4} scale={50} blur={2} />
                      </Suspense>
                   </Canvas>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default WarehouseShelfManagement;


