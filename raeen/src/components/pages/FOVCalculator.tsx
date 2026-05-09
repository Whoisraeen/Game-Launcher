import React, { useState, useMemo } from 'react';
import { Eye, Monitor, Ruler, Info } from 'lucide-react';

const ASPECT_RATIOS: Record<string, number> = {
    '16:9': 16 / 9,
    '16:10': 16 / 10,
    '21:9': 21 / 9,
    '32:9': 32 / 9,
    '4:3': 4 / 3,
};

const FOVCalculator: React.FC = () => {
    const [monitorSize, setMonitorSize] = useState(27);
    const [baseAspect, setBaseAspect] = useState('16:9');
    const [targetAspect, setTargetAspect] = useState('21:9');
    const [distance, setDistance] = useState(60);
    const [baseFOV, setBaseFOV] = useState(90);

    const result = useMemo(() => {
        const baseRatio = ASPECT_RATIOS[baseAspect];
        const targetRatio = ASPECT_RATIOS[targetAspect];
        if (!baseRatio || !targetRatio || baseFOV <= 0 || baseFOV >= 180) return null;

        const baseFOVRad = (baseFOV * Math.PI) / 180;
        const recommendedRad = 2 * Math.atan(Math.tan(baseFOVRad / 2) * (targetRatio / baseRatio));
        const recommendedDeg = (recommendedRad * 180) / Math.PI;

        const physicalFOVRad = 2 * Math.atan(((monitorSize * 2.54) / 2) / distance);
        const physicalFOVDeg = (physicalFOVRad * 180) / Math.PI;

        return {
            recommended: Math.round(recommendedDeg * 10) / 10,
            physical: Math.round(physicalFOVDeg * 10) / 10,
            scaleFactor: Math.round((targetRatio / baseRatio) * 1000) / 1000,
        };
    }, [monitorSize, baseAspect, targetAspect, distance, baseFOV]);

    const coneAngle = result ? Math.min(result.recommended, 170) : baseFOV;

    return (
        <div className="glass-panel flex-1 h-full overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5">
                <h1 className="text-3xl font-black text-white tracking-tighter">FOV CALCULATOR</h1>
                <p className="text-sm text-gray-400">Calculate the optimal field of view for multi-monitor and ultrawide setups.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Inputs */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5 space-y-5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Monitor size={20} className="text-blue-500" /> Display Setup
                            </h3>

                            <InputField
                                label="Monitor Size (inches)"
                                value={monitorSize}
                                onChange={setMonitorSize}
                                min={10}
                                max={65}
                                icon={<Monitor size={14} />}
                            />

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Base Aspect Ratio</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(ASPECT_RATIOS).map(ar => (
                                        <AspectButton key={ar} label={ar} active={baseAspect === ar} onClick={() => setBaseAspect(ar)} />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Aspect Ratio</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(ASPECT_RATIOS).map(ar => (
                                        <AspectButton key={ar} label={ar} active={targetAspect === ar} onClick={() => setTargetAspect(ar)} />
                                    ))}
                                </div>
                            </div>

                            <InputField
                                label="Distance from Screen (cm)"
                                value={distance}
                                onChange={setDistance}
                                min={20}
                                max={200}
                                icon={<Ruler size={14} />}
                            />

                            <InputField
                                label="Base Game FOV (degrees)"
                                value={baseFOV}
                                onChange={setBaseFOV}
                                min={30}
                                max={179}
                                icon={<Eye size={14} />}
                            />
                        </div>

                        {/* Info card */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                            <Info size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-200/80">
                                <p className="font-bold text-blue-300 mb-1">How it works</p>
                                <p>Uses the standard FOV conversion formula:
                                    <code className="mx-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-xs font-mono">
                                        2 × atan(tan(baseFOV/2) × (newAspect/baseAspect))
                                    </code>
                                    to scale horizontal FOV proportionally to your wider display.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Results & Diagram */}
                    <div className="space-y-6">
                        {/* Result Cards */}
                        {result && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ResultCard label="Recommended FOV" value={`${result.recommended}°`} accent="blue" />
                                <ResultCard label="Physical FOV" value={`${result.physical}°`} accent="green" />
                                <ResultCard label="Scale Factor" value={`${result.scaleFactor}×`} accent="purple" />
                            </div>
                        )}

                        {/* Visual FOV Diagram */}
                        <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Eye size={20} className="text-green-500" /> FOV Visualization
                            </h3>
                            <div className="flex items-center justify-center py-8">
                                <svg viewBox="0 0 400 250" className="w-full max-w-md">
                                    {/* Base FOV cone */}
                                    <FOVCone cx={200} cy={230} radius={180} angle={baseFOV} color="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" label={`Base: ${baseFOV}°`} labelY={40} />
                                    {/* Recommended FOV cone */}
                                    <FOVCone cx={200} cy={230} radius={180} angle={coneAngle} color="rgba(34,197,94,0.15)" stroke="rgba(34,197,94,0.7)" label={`Target: ${result?.recommended ?? '--'}°`} labelY={20} />
                                    {/* Eye icon */}
                                    <circle cx={200} cy={230} r={6} fill="white" />
                                    <circle cx={200} cy={230} r={3} fill="#0f172a" />
                                </svg>
                            </div>
                            <div className="flex justify-center gap-6 text-xs text-gray-400">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded-full" /> Base FOV</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 rounded-full" /> Target FOV</span>
                            </div>
                        </div>

                        {/* Preset recommendations */}
                        <div className="bg-slate-800/30 rounded-xl p-6 border border-white/5">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Common Game Defaults</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { game: 'CS2 / Valorant', fov: 90 },
                                    { game: 'Overwatch 2', fov: 103 },
                                    { game: 'Apex Legends', fov: 110 },
                                    { game: 'Minecraft', fov: 70 },
                                    { game: 'Skyrim', fov: 65 },
                                    { game: 'Battlefield', fov: 90 },
                                ].map(p => (
                                    <button
                                        key={p.game}
                                        onClick={() => setBaseFOV(p.fov)}
                                        className="flex items-center justify-between p-2.5 bg-black/20 hover:bg-white/5 rounded-lg border border-white/5 hover:border-white/15 transition-colors"
                                    >
                                        <span className="text-sm text-gray-300">{p.game}</span>
                                        <span className="text-xs font-mono text-blue-400">{p.fov}°</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FOVCone: React.FC<{ cx: number; cy: number; radius: number; angle: number; color: string; stroke: string; label: string; labelY: number }> = (
    { cx, cy, radius, angle, color, stroke, label, labelY }
) => {
    const halfAngleRad = ((angle / 2) * Math.PI) / 180;
    const x1 = cx - radius * Math.sin(halfAngleRad);
    const y1 = cy - radius * Math.cos(halfAngleRad);
    const x2 = cx + radius * Math.sin(halfAngleRad);
    const y2 = cy - radius * Math.cos(halfAngleRad);
    const largeArc = angle > 180 ? 1 : 0;

    return (
        <g>
            <path
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={color}
                stroke={stroke}
                strokeWidth={1.5}
            />
            <text x={cx} y={labelY} textAnchor="middle" fill={stroke} fontSize={11} fontWeight="bold">
                {label}
            </text>
        </g>
    );
};

const InputField: React.FC<{ label: string; value: number; onChange: (v: number) => void; min: number; max: number; icon: React.ReactNode }> = (
    { label, value, onChange, min, max, icon }
) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            {icon} {label}
        </label>
        <div className="flex items-center gap-3">
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-20 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white text-center focus:border-blue-500/50 focus:outline-none"
            />
        </div>
    </div>
);

const AspectButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
        }`}
    >
        {label}
    </button>
);

const ResultCard: React.FC<{ label: string; value: string; accent: 'blue' | 'green' | 'purple' }> = ({ label, value, accent }) => {
    const colors = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[accent]}`}>
            <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</div>
            <div className="text-2xl font-black">{value}</div>
        </div>
    );
};

export default FOVCalculator;
