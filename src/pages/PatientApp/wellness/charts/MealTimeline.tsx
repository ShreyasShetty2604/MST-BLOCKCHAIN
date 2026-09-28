import React from 'react';
import { Check } from 'lucide-react';
import { PlannedMeal } from '../../../../features/nutrition/dietPlan';
import { MEAL_ICONS } from '../shared';

// Horizontal day timeline: Breakfast → Mid-morning → Lunch → Snack → Dinner, ticks for logged meals.
// Scrolls sideways on narrow screens instead of squashing.
export const MealTimeline: React.FC<{ meals: PlannedMeal[]; logged: Set<string> }> = ({ meals, logged }) => (
  <div className="-mx-6 px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <ol className="relative flex min-w-[560px]">
      {meals.map((meal, i) => {
        const done = logged.has(meal.type);
        const nextDone = i < meals.length - 1 && logged.has(meals[i + 1].type);
        const Icon = MEAL_ICONS[meal.type];
        return (
          <li key={meal.type} className="relative flex-1 flex flex-col items-center text-center">
            {/* connector to the next stop */}
            {i < meals.length - 1 && (
              <span
                aria-hidden
                className={`absolute top-6 left-1/2 w-full h-0.5 ${done && nextDone ? 'bg-teal-600 dark:bg-teal-500' : 'bg-slate-200 dark:bg-slate-800'}`}
              />
            )}
            <span
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 transition-colors ${
                done ? 'bg-teal-600 dark:bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
              title={`${meal.type} · ${meal.time} · ${meal.calories} kcal${done ? ' · logged' : ''}`}
            >
              {Icon && <Icon className="w-5 h-5" />}
              {done && (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{meal.type}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{meal.time}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{meal.calories} kcal</span>
          </li>
        );
      })}
    </ol>
  </div>
);
