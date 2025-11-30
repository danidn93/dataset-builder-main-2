import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import type { WizardData } from "@/pages/CreateVersion";

interface PeriodoStepProps {
  wizardData: WizardData;
  updateWizardData: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PeriodoStep = ({ wizardData, updateWizardData, onNext, onBack }: PeriodoStepProps) => {
  const [periodo, setPeriodo] = useState(wizardData.periodo);

  const handleNext = () => {
    if (!periodo.trim()) return;
    updateWizardData({ periodo });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Período de Evaluación</h2>
        <p className="text-muted-foreground">
          Ejemplo: <strong>Periodo Académico 2024–2025</strong> o <strong>Cohorte 2024-1</strong>
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-3 p-6 border rounded-lg bg-card">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          Período
        </Label>
        <Input
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          placeholder="Ejemplo: Periodo 2024 – 2025"
          className="text-base h-12"
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>

        <Button
          onClick={handleNext}
          className="bg-accent hover:bg-accent/90"
          disabled={!periodo.trim()}
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PeriodoStep;
