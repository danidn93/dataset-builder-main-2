import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import WizardProgress from "@/components/wizard/WizardProgress";
import FileUploadStep from "@/components/wizard/FileUploadStep";
import PreviewStep from "@/components/wizard/PreviewStep";
import ColumnSelectionStep from "@/components/wizard/ColumnSelectionStep";
import CriteriaSelectionStep from "@/components/wizard/CriteriaSelectionStep";
import CommentsSelectionStep from "@/components/wizard/CommentsSelectionStep";
import SummaryStep from "@/components/wizard/SummaryStep";

import PeriodoStep from "@/components/wizard/PeriodoStep";

const steps = [
  { id: 1, title: "Archivo", description: "Sube tu archivo" },
  { id: 2, title: "Vista Previa", description: "Revisa los datos" },
  { id: 3, title: "Columnas", description: "Selecciona columnas" },
  { id: 4, title: "Criterios", description: "Define criterios" },
  { id: 5, title: "Comentarios", description: "Columna de comentarios" },

  { id: 6, title: "Período", description: "Definir periodo académico" },
  { id: 7, title: "Resumen", description: "Confirma y crea" },

];

export interface WizardData {
  file: File | null;
  parsedData: any[][] | null;
  headers: string[];
  facultadColumn: string;
  carreraColumn: string;
  selectedCriteria: string[];
  comentariosColumn: string;

  periodo: string;

}

const CreateVersion = () => {
  const navigate = useNavigate();
  const { datasetId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    file: null,
    parsedData: null,
    headers: [],
    facultadColumn: "",
    carreraColumn: "",
    selectedCriteria: [],
    comentariosColumn: "",
    periodo: "",

  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateWizardData = (data: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...data }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <FileUploadStep
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <PreviewStep
            wizardData={wizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <ColumnSelectionStep
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CriteriaSelectionStep
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <CommentsSelectionStep
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );

      case 6: return <PeriodoStep 
                  wizardData={wizardData} 
                  updateWizardData={updateWizardData}
                  onNext={handleNext}
                  onBack={handleBack}
                />;
      case 7:
        return (
          <SummaryStep
            wizardData={wizardData}
            onBack={handleBack}
            datasetId={datasetId || ""}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/datasets/${datasetId}/versions`)}
          className="mb-6 text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Versiones
        </Button>

        <Card className="border-0 shadow-elegant">
          <CardContent className="p-8">
            <WizardProgress steps={steps} currentStep={currentStep} />
            <div className="mt-8">{renderStep()}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateVersion;
