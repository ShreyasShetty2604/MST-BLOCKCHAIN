import React from 'react';
import { Salad, Soup, Wheat, Drumstick } from 'lucide-react';
import { DietType } from '../../../../features/nutrition/dietPlan';
import { useChartTokens, useIsDark, polar, inkOn } from './theme';

// ICMR-style "My Plate": ½ vegetables, ¼ protein, ¼ whole grains — built in SVG.
function sector(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y} Z`;
}

export const MyPlate: React.FC<{ dietType: DietType }> = ({ dietType }) => {
  const t = useChartTokens();
  const dark = useIsDark();
  const veg = dietType === 'Vegetarian';
  // Same entity, same colour as the macro donut: grains ≈ carbs, protein ≈ protein; vegetables a light teal wash.
  const vegFill = dark ? '#134E4A' : '#CCFBF1';
  const parts = [
    { key: 'veg', label: 'Vegetables', share: '½', from: 90, to: -90, fill: vegFill, icon: Salad, examples: 'Bhindi, lauki, salad, greens' },
    { key: 'protein', label: 'Protein', share: '¼', from: -90, to: -180, fill: t.macro.Protein, icon: veg ? Soup : Drumstick, examples: veg ? 'Dal, paneer, sprouts, curd' : 'Dal, eggs, fish, chicken' },
    { key: 'grains', label: 'Whole grains', share: '¼', from: 180, to: 90, fill: t.macro.Carbs, icon: Wheat, examples: 'Bajra, jowar, ragi, brown rice' }
  ];
  const cx = 110;
  const cy = 110;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 220 220" className="w-44 h-44 shrink-0" role="img" aria-label="My Plate: half vegetables, a quarter protein, a quarter whole grains">
        <circle cx={cx} cy={cy} r={104} fill={t.track} />
        <circle cx={cx} cy={cy} r={96} fill={t.surface} />
        {parts.map((p) => {
          const mid = polar(cx, cy, 52, (p.from + p.to) / 2);
          return (
            <g key={p.key}>
              <path d={sector(cx, cy, 88, p.from, p.to)} fill={p.fill} stroke={t.surface} strokeWidth={3}>
                <title>{`${p.share} ${p.label}: ${p.examples}`}</title>
              </path>
              <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="600" fill={inkOn(p.fill, t)}>
                {p.share}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="w-full space-y-4">
        {parts.map((p) => (
          <li key={p.key} className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: p.fill }} />
            <p.icon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {p.share} {p.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{p.examples}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
