import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WizardData } from "@/pages/CreateVersion";
import ConfirmationModal from "./ConfirmationModal";

interface CriteriaSelectionStepProps {
  wizardData: WizardData;
  updateWizardData: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CriteriaSelectionStep = ({
  wizardData,
  updateWizardData,
  onNext,
  onBack,
}: CriteriaSelectionStepProps) => {
  const { toast } = useToast();
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(wizardData.selectedCriteria);
  const [showModal, setShowModal] = useState(false);

  // Filter out facultad and carrera columns from available criteria
  const availableCriteria = wizardData.headers.filter(
    (header) => header !== wizardData.facultadColumn && header !== wizardData.carreraColumn
  );

  const handleToggleCriterion = (criterion: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(criterion) ? prev.filter((c) => c !== criterion) : [...prev, criterion]
    );
  };

  const handleConfirm = () => {
    updateWizardData({ selectedCriteria });
    setShowModal(false);
    toast({
      title: "Criterios confirmados",
      description: `Se evaluarán ${selectedCriteria.length} criterios`,
    });
  };

  const handleNext = () => {
    if (selectedCriteria.length === 0) {
      toast({
        title: "Selección incompleta",
        description: "Por favor selecciona al menos un criterio",
        variant: "destructive",
      });
      return;
    }
    if (JSON.stringify(selectedCriteria) !== JSON.stringify(wizardData.selectedCriteria)) {
      setShowModal(true);
    } else {
      onNext();
    }
  };

  const confirmAndNext = () => {
    handleConfirm();
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Seleccionar Criterios de Evaluación</h2>
        <p className="text-muted-foreground">
          Marca los criterios que deseas incluir en el análisis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {availableCriteria.map((criterion, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
          >
            <Checkbox
              id={`criterion-${index}`}
              checked={selectedCriteria.includes(criterion)}
              onCheckedChange={() => handleToggleCriterion(criterion)}
              className="mt-1"
            />
            <Label
              htmlFor={`criterion-${index}`}
              className="flex-1 cursor-pointer font-medium leading-relaxed"
            >
              {criterion}
            </Label>
          </div>
        ))}
      </div>

      {selectedCriteria.length > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 max-w-4xl mx-auto">
          <p className="font-semibold text-accent mb-2">
            Criterios seleccionados: {selectedCriteria.length}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCriteria.map((criterion, index) => (
              <span
                key={index}
                className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-medium"
              >
                {criterion}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          onClick={handleNext}
          className="bg-accent hover:bg-accent/90"
          disabled={selectedCriteria.length === 0}
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={confirmAndNext}
        title="Confirmar Criterios Seleccionados"
        description={`Has seleccionado ${selectedCriteria.length} criterios para evaluar. ¿Deseas continuar?`}
      >
        <div className="mt-4 space-y-2">
          {selectedCriteria.map((criterion, index) => (
            <div key={index} className="text-sm text-muted-foreground">
              • {criterion}
            </div>
          ))}
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default CriteriaSelectionStep;
