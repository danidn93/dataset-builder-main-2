import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, FileText, Columns, Target } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import type { WizardData } from "@/pages/CreateVersion";
import ConfirmationModal from "./ConfirmationModal";

interface SummaryStepProps {
  wizardData: WizardData;
  onBack: () => void;
  datasetId: string;
}

const SummaryStep = ({ wizardData, onBack, datasetId }: SummaryStepProps) => {
  const navigate = useNavigate();
  
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Simular progreso de carga mientras se procesa
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setProcessingProgress(0);
      interval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) return prev; // No llega a 100% hasta que termine realmente
          return prev + Math.random() * 15;
        });
      }, 500);
    } else {
      setProcessingProgress(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleCreate = async () => {
    setIsProcessing(true);

    try {
      const headers = wizardData.headers;

      // Convertir a objetos
      const rows = wizardData.parsedData!.map((row) => {
        const o: any = {};
        headers.forEach((h, i) => (o[h] = row[i]));
        return o;
      });

      // 1. Crear versión vacía
      const { data: verResp, error: verErr } = await supabase.functions.invoke(
        "crear-version-inicial",
        {
          body: {
          datasetId,
          fileName: wizardData.file?.name,
          totalColumns: headers.length,
          comentariosColumn: wizardData.comentariosColumn,
          facultadColumn: wizardData.facultadColumn,
          carreraColumn: wizardData.carreraColumn,
          selectedCriteria: wizardData.selectedCriteria,
          periodo: wizardData.periodo,
        },
        }
      );

      if (verErr) throw verErr;
      const versionId = verResp.version.id;

      // 2. Enviar rows en chunks de 5000
      const CHUNK = 5000;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const block = rows.slice(i, i + CHUNK);

        const { error } = await supabase.functions.invoke("insertar-rows", {
          body: { versionId, rows: block },
        });

        if (error) throw error;

        setProcessingProgress(Math.round(((i + CHUNK) / rows.length) * 100));
      }

      // 3. Finalizar versión
      await supabase.functions.invoke("finalizar-version", {
        body: { versionId },
      });

      toast.success("Versión creada correctamente");
      navigate(`/datasets/${datasetId}/versions`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Resumen de la Configuración</h2>
        <p className="text-muted-foreground">
          Revisa la información antes de crear la versión
        </p>
      </div>

      {/* Barra de progreso durante el procesamiento */}
      {isProcessing && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Procesando datos...</span>
                <span className="font-semibold text-accent">{Math.round(processingProgress)}%</span>
              </div>
              <Progress value={processingProgress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                Creando versión, procesando facultades, carreras y preparando análisis de comentarios
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 max-w-3xl mx-auto">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-accent" />
              Archivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-semibold">{wizardData.file?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registros:</span>
                <span className="font-semibold">{wizardData.parsedData?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Columnas:</span>
                <span className="font-semibold">{wizardData.headers.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Columns className="h-5 w-5 text-accent" />
              Columnas Principales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Facultad:</span>
                <span className="font-semibold">{wizardData.facultadColumn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrera:</span>
                <span className="font-semibold">{wizardData.carreraColumn}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-accent" />
              Criterios de Evaluación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                {wizardData.selectedCriteria.length} criterios seleccionados:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {wizardData.selectedCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>{criterion}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-accent" />
              Análisis de Comentarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Columna de Comentarios:</span>
                <span className="font-semibold">{wizardData.comentariosColumn}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Esta columna será analizada con IA para generar recomendaciones por facultad y carrera
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4 max-w-3xl mx-auto">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-success hover:bg-success/90 text-success-foreground"
          disabled={isProcessing}
        >
          {isProcessing ? "Procesando..." : "Crear Versión"}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleCreate}
        title="Confirmar Creación de Versión"
        description="¿Estás seguro de que deseas crear esta versión con la configuración mostrada?"
      >
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Se procesarán <strong>{wizardData.parsedData?.length || 0} registros</strong> con{" "}
            <strong>{wizardData.selectedCriteria.length} criterios</strong> de evaluación.
          </p>
        </div>
      </ConfirmationModal>
    </div>
  );
};

export default SummaryStep;
