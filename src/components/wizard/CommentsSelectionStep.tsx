import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, MessageSquare } from "lucide-react";
import type { WizardData } from "@/pages/CreateVersion";

interface CommentsSelectionStepProps {
  wizardData: WizardData;
  updateWizardData: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CommentsSelectionStep = ({
  wizardData,
  updateWizardData,
  onNext,
  onBack,
}: CommentsSelectionStepProps) => {
  const handleColumnSelect = (column: string) => {
    updateWizardData({ comentariosColumn: column });
  };

  const handleNext = () => {
    if (!wizardData.comentariosColumn) {
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona la Columna de Comentarios</h2>
        <p className="text-muted-foreground">
          Esta columna será analizada con IA para generar recomendaciones por facultad y carrera
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-accent" />
            Columna de Comentarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={wizardData.comentariosColumn}
            onValueChange={handleColumnSelect}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {wizardData.headers.map((header) => (
              <div
                key={header}
                className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-all ${
                  wizardData.comentariosColumn === header
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <RadioGroupItem value={header} id={`comment-${header}`} />
                <Label
                  htmlFor={`comment-${header}`}
                  className="flex-1 cursor-pointer font-medium"
                >
                  {header}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {!wizardData.comentariosColumn && (
            <p className="text-sm text-destructive mt-4">
              * Debes seleccionar una columna de comentarios para continuar
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          onClick={handleNext}
          disabled={!wizardData.comentariosColumn}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Siguiente
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default CommentsSelectionStep;
