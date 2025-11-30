import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { WizardData } from "@/pages/CreateVersion";

interface PreviewStepProps {
  wizardData: WizardData;
  onNext: () => void;
  onBack: () => void;
}

const PreviewStep = ({ wizardData, onNext, onBack }: PreviewStepProps) => {
  const previewRows = wizardData.parsedData?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Vista Previa de Datos</h2>
        <p className="text-muted-foreground">
          Mostrando los primeros 10 registros de {wizardData.parsedData?.length || 0} totales
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary">
                <TableHead className="text-primary-foreground font-bold">#</TableHead>
                {wizardData.headers.map((header, index) => (
                  <TableHead key={index} className="text-primary-foreground font-bold whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell className="font-medium bg-muted">{rowIndex + 1}</TableCell>
                  {row.map((cell: any, cellIndex: number) => (
                    <TableCell key={cellIndex} className="whitespace-nowrap">
                      {String(cell || "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button onClick={onNext} className="bg-accent hover:bg-accent/90">
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PreviewStep;
