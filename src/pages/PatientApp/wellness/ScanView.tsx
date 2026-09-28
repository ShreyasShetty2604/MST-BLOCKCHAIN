import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { PatientPersona } from '../../../mock/types';
import { MealScanCard } from '../../../components/MealScanCard';
import { DailyReference } from '../../../components/NutritionBars';
import { FoodCheckTool } from '../../../components/FoodCheckTool';
import { Card, Label, IconTile } from './ui';

interface ScanViewProps {
  persona: PatientPersona; // effective profile (vault + demo edits)
  onScanComplete: () => void;
  dailyReference: DailyReference;
}

export const ScanView: React.FC<ScanViewProps> = ({ persona, onScanComplete, dailyReference }) => (
  <div className="max-w-2xl mx-auto space-y-8">
    <MealScanCard persona={persona} onScanComplete={onScanComplete} dailyReference={dailyReference} />

    <Card className="space-y-5">
      <div className="flex items-start gap-4">
        <IconTile icon={MessageCircleQuestion} />
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Can I eat this?</h3>
          <Label>No photo? Type a food and we'll check it against your profile.</Label>
        </div>
      </div>
      <FoodCheckTool conditions={persona.emergencyInfo.conditions} allergies={persona.emergencyInfo.allergies} />
    </Card>
  </div>
);
