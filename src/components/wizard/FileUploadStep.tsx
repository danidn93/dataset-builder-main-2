import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { WizardData } from "@/pages/CreateVersion";

interface FileUploadStepProps {
  wizardData: WizardData;
  updateWizardData: (data: Partial<WizardData>) => void;
  onNext: () => void;
}

const FileUploadStep = ({ wizardData, updateWizardData, onNext }: FileUploadStepProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanEmptyRowsAndColumns = (data: any[][]): any[][] => {
    // Remove completely empty rows
    const rowsWithData = data.filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
    );

    if (rowsWithData.length === 0) return [];

    // Find columns that have at least one non-empty value (including header)
    const columnsWithData: number[] = [];
    const numColumns = Math.max(...rowsWithData.map((row) => row.length));

    for (let colIndex = 0; colIndex < numColumns; colIndex++) {
      // Check if header is not empty
      const headerValue = String(rowsWithData[0]?.[colIndex] || "").trim();
      
      // Check if any data row has a value in this column
      const hasDataInColumn = rowsWithData.slice(1).some(
        (row) => {
          const cellValue = String(row[colIndex] || "").trim();
          return cellValue !== "";
        }
      );
      
      // Keep column only if header is not empty AND there's data in the column
      if (headerValue !== "" && hasDataInColumn) {
        columnsWithData.push(colIndex);
      }
    }

    // Keep only columns with data
    const cleanedData = rowsWithData.map((row) =>
      columnsWithData.map((colIndex) => row[colIndex] || "")
    );

    return cleanedData;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["xlsx", "xls", "csv"];

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast({
        title: "Formato no válido",
        description: "Por favor, sube un archivo XLSX, XLS o CSV",
        variant: "destructive",
      });
      return;
    }

    try {
      let parsedData: any[][] = [];

      if (fileExtension === "csv") {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { skipEmptyLines: true });
        parsedData = result.data as any[][];
      } else {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      }

      // Clean empty rows and columns
      const cleanedData = cleanEmptyRowsAndColumns(parsedData);

      if (cleanedData.length === 0) {
        toast({
          title: "Archivo vacío",
          description: "El archivo no contiene datos válidos",
          variant: "destructive",
        });
        return;
      }

      const headers = cleanedData[0].map((h: any) => String(h || ""));
      const dataRows = cleanedData.slice(1);

      updateWizardData({
        file,
        parsedData: dataRows,
        headers,
      });

      toast({
        title: "Archivo cargado",
        description: `${dataRows.length} registros procesados correctamente`,
      });

      onNext();
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Error al procesar archivo",
        description: "No se pudo leer el archivo. Verifica el formato.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Subir Archivo de Datos</h2>
        <p className="text-muted-foreground">
          Selecciona un archivo XLSX, XLS o CSV con los datos de evaluación
        </p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-accent" />
          </div>
          <div>
            <p className="font-semibold mb-1">Click para seleccionar archivo</p>
            <p className="text-sm text-muted-foreground">o arrastra y suelta aquí</p>
          </div>
          <p className="text-xs text-muted-foreground">XLSX, XLS o CSV (máx. 50MB)</p>
        </div>
      </div>

      {wizardData.file && (
        <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-accent" />
          <div className="flex-1">
            <p className="font-semibold">{wizardData.file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(wizardData.file.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateWizardData({ file: null, parsedData: null, headers: [] });
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Cambiar
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUploadStep;
