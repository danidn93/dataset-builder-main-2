import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WizardData } from "@/pages/CreateVersion";
import ConfirmationModal from "./ConfirmationModal";

interface ColumnSelectionStepProps {
  wizardData: WizardData;
  updateWizardData: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ColumnSelectionStep = ({
  wizardData,
  updateWizardData,
  onNext,
  onBack,
}: ColumnSelectionStepProps) => {
  const { toast } = useToast();
  const [facultadColumn, setFacultadColumn] = useState(wizardData.facultadColumn);
  const [carreraColumn, setCarreraColumn] = useState(wizardData.carreraColumn);
  const [showFacultadModal, setShowFacultadModal] = useState(false);
  const [showCarreraModal, setShowCarreraModal] = useState(false);

  const handleFacultadConfirm = () => {
    updateWizardData({ facultadColumn });
    setShowFacultadModal(false);
    toast({
      title: "Columna de Facultad seleccionada",
      description: `Se utilizará la columna: ${facultadColumn}`,
    });
  };

  const handleCarreraConfirm = () => {
    updateWizardData({ carreraColumn });
    setShowCarreraModal(false);
    toast({
      title: "Columna de Carrera seleccionada",
      description: `Se utilizará la columna: ${carreraColumn}`,
    });
  };

  const handleNext = () => {
    if (!wizardData.facultadColumn) {
      toast({
        title: "Selección incompleta",
        description: "Por favor selecciona la columna de Facultad",
        variant: "destructive",
      });
      return;
    }
    if (!wizardData.carreraColumn) {
      toast({
        title: "Selección incompleta",
        description: "Por favor selecciona la columna de Carrera",
        variant: "destructive",
      });
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Seleccionar Columnas</h2>
        <p className="text-muted-foreground">
          Indica qué columnas contienen la información de Facultad y Carrera
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-3 p-6 border rounded-lg bg-card">
          <Label htmlFor="facultad" className="text-lg font-semibold">
            Columna de Facultad
          </Label>
          <Select value={facultadColumn} onValueChange={setFacultadColumn}>
            <SelectTrigger id="facultad" className="text-base">
              <SelectValue placeholder="Selecciona la columna de Facultad" />
            </SelectTrigger>
            <SelectContent>
              {wizardData.headers
                .filter(header => header && header.trim() !== '')
                .map((header, index) => (
                  <SelectItem key={index} value={header}>
                    {header}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {facultadColumn && facultadColumn !== wizardData.facultadColumn && (
            <Button
              onClick={() => setShowFacultadModal(true)}
              className="w-full bg-accent hover:bg-accent/90"
            >
              Confirmar Selección de Facultad
            </Button>
          )}
        </div>

        <div className="space-y-3 p-6 border rounded-lg bg-card">
          <Label htmlFor="carrera" className="text-lg font-semibold">
            Columna de Carrera
          </Label>
          <Select value={carreraColumn} onValueChange={setCarreraColumn}>
            <SelectTrigger id="carrera" className="text-base">
              <SelectValue placeholder="Selecciona la columna de Carrera" />
            </SelectTrigger>
            <SelectContent>
              {wizardData.headers
                .filter(header => header && header.trim() !== '')
                .map((header, index) => (
                  <SelectItem key={index} value={header}>
                    {header}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {carreraColumn && carreraColumn !== wizardData.carreraColumn && (
            <Button
              onClick={() => setShowCarreraModal(true)}
              className="w-full bg-accent hover:bg-accent/90"
            >
              Confirmar Selección de Carrera
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          onClick={handleNext}
          className="bg-accent hover:bg-accent/90"
          disabled={!wizardData.facultadColumn || !wizardData.carreraColumn}
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showFacultadModal}
        onClose={() => setShowFacultadModal(false)}
        onConfirm={handleFacultadConfirm}
        title="Confirmar Columna de Facultad"
        description={`¿Confirmas que deseas usar la columna "${facultadColumn}" para identificar las Facultades?`}
      />

      <ConfirmationModal
        isOpen={showCarreraModal}
        onClose={() => setShowCarreraModal(false)}
        onConfirm={handleCarreraConfirm}
        title="Confirmar Columna de Carrera"
        description={`¿Confirmas que deseas usar la columna "${carreraColumn}" para identificar las Carreras?`}
      />
    </div>
  );
};

export default ColumnSelectionStep;
