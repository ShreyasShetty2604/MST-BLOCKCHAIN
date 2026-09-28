import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon, Calendar, Utensils, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Bell, Info
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PatientPersona, CheckupReminder } from '../../mock/types';
import { ChainBadge } from '../../components/ChainBadge';
import { mockApi } from '../../mock/api';
import { MealScanCard } from '../../components/MealScanCard';

interface WellnessTabProps {
  persona: PatientPersona;
  onShowToast: (msg: string) => void;
}

export const WellnessTab: React.FC<WellnessTabProps> = ({ persona, onShowToast }) => {
  const [subTab, setSubTab] = useState<'diet' | 'checkups'>('diet');
  const [viewDays, setViewDays] = useState<'1-day' | '7-day'>('1-day');
  const [reminders, setReminders] = useState<CheckupReminder[]>([]);

  // Form prefilled from vault
  const [age, setAge] = useState(52);
  const [weight, setWeight] = useState(74);
  const [height, setHeight] = useState(172);
  const [activity, setActivity] = useState('Moderate (3-4 days exercise)');
  const [dietType, setDietType] = useState('Vegetarian');

  useEffect(() => {
    mockApi.getReminders().then(setReminders);
  }, []);

  // Calorie calculation
  const targetCalories = 1850;
  const macroData = [
    { name: 'Complex Carbs (45%)', value: 208, color: '#0F766E' },
    { name: 'Protein (25%)', value: 115, color: '#4F46E5' },
    { name: 'Healthy Fats (30%)', value: 61, color: '#F59E0B' }
  ];

  const meals = [
    {
      type: 'Breakfast',
      time: '8:30 AM',
      items: 'Ragi & Oats Dosa (2 pcs) + Mint Chutney + Boiled Egg / Paneer (50g)',
      calories: '380 kcal',
      gi: 'Low GI'
    },
    {
      type: 'Lunch',
      time: '1:30 PM',
      items: 'Multigrain Bajra Roti (2) + Moong Dal (1 bowl) + Bhindi Sabzi + Cucumber Salad',
      calories: '550 kcal',
      gi: 'Glycemic Balanced'
    },
    {
      type: 'Snack',
      time: '5:00 PM',
      items: 'Roasted Chana (1/2 cup) + Green Tea (No sugar)',
      calories: '180 kcal',
      gi: 'High Fiber'
    },
    {
      type: 'Dinner',
      time: '8:00 PM',
      items: 'Brown Rice / Jowar Roti + Lauki Chana Dal + Steamed Sprouts',
      calories: '440 kcal',
      gi: 'Low GI'
    }
  ];

  const avoidChips = [
    'Refined Sugar & Sweets (Diabetes)',
    'High Sodium & Pickles (Hypertension)',
    'Refined Maida & White Bread',
    'Penicillin Antibiotics (Allergy)',
    'Deep Fried Snacks'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Sub-Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Wellness & Preventive Care
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personalized glycemic nutrition engine and hospital-verified checkup schedule.
          </p>
        </div>

        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setSubTab('diet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'diet'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Diet Planner</span>
          </button>

          <button
            onClick={() => setSubTab('checkups')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              subTab === 'checkups'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Checkup Reminders ({reminders.filter((r) => r.dueState !== 'done').length})</span>
          </button>
        </div>
      </div>

      {subTab === 'diet' ? (
        /* DIET SUB-TAB */
        <div className="space-y-6 animate-fade-in">
          {/* Prefilled Profile Parameters */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Vault Prefilled Physiological Profile
              </span>
              <span className="text-[10px] font-mono text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                Auto-Synced from MediID
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-mono">AGE</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{age} Years</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-mono">WEIGHT</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{weight} kg</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-mono">HEIGHT</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{height} cm</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-mono">CONDITIONS</span>
                <span className="font-bold text-teal-700 dark:text-teal-300 mt-0.5 block truncate">
                  {persona.emergencyInfo.conditions[0]}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block font-mono">DIET TYPE</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{dietType}</span>
              </div>
            </div>
          </div>

          {/* Calorie & Macro Target Card with Recharts Donut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Daily Calorie Target
                  </h3>
                  <p className="text-xs text-slate-500">Glycemic index tailored for Type 2 Diabetes</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setViewDays('1-day')}
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      viewDays === '1-day' ? 'bg-teal-700 text-white' : 'text-slate-500'
                    }`}
                  >
                    1-Day Plan
                  </button>
                  <button
                    onClick={() => setViewDays('7-day')}
                    className={`px-3 py-1 rounded-lg font-semibold ${
                      viewDays === '7-day' ? 'bg-teal-700 text-white' : 'text-slate-500'
                    }`}
                  >
                    7-Day Cycle
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center my-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-teal-700 dark:text-teal-400 font-bold block">208g</span>
                  <span className="text-[10px] text-slate-400">Carbs (Low GI)</span>
                </div>
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block">115g</span>
                  <span className="text-[10px] text-slate-400">Protein</span>
                </div>
                <div>
                  <span className="text-amber-500 font-bold block">61g</span>
                  <span className="text-[10px] text-slate-400">Fats</span>
                </div>
              </div>
            </div>

            {/* Avoid Chips & Medical Disclaimer */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Dietary "Avoid" Flags (Based on Conditions & Allergies)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Derived from your verified health vault profile:
                </p>

                <div className="flex flex-wrap gap-2 pt-3">
                  {avoidChips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                    >
                      🚫 {chip}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Important Notice:</strong> Confirm all diet modifications with your treating endocrinologist or certified dietitian before implementing.
                </span>
              </div>
            </div>
          </div>

          {/* Meal photo scan */}
          <MealScanCard persona={persona} />

          {/* Indian Meal Cards */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Customized Indian Meal Plan ({viewDays})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {meals.map((meal) => (
                <div
                  key={meal.type}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {meal.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{meal.time}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 min-h-[48px]">
                    {meal.items}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="font-bold text-teal-700 dark:text-teal-400">{meal.calories}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px]">
                      {meal.gi}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* CHECKUPS SUB-TAB */
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Checkup reminders automatically recalculate based on hospital-anchored test reports.
            </p>
            <button
              onClick={() => onShowToast('Push notification test sent to registered mobile device!')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-300 dark:border-slate-700"
            >
              <Bell className="w-4 h-4 text-teal-600" />
              <span>Test Notification Toast</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {rem.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Last completed: {rem.lastDoneDate}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rem.dueState === 'done'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                        : rem.dueState === 'overdue'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-200 animate-pulse'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200'
                    }`}
                  >
                    {rem.dueStateLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      Next Due: {rem.dueDate}
                    </span>
                  </div>

                  {rem.hospitalVerified && rem.txHash && (
                    <ChainBadge txHash={rem.txHash} label="Hospital Verified" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
