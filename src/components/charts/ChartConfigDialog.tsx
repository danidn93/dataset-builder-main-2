import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartType } from "./ChartCanvas";

interface ChartConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartType: ChartType;
  headers: string[];
  onConfirm: (title: string, columns: string[], dataKey?: string) => void;
}

export const ChartConfigDialog = ({ open, onOpenChange, chartType, headers, onConfirm }: ChartConfigDialogProps) => {
  const [title, setTitle] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dataKey, setDataKey] = useState("");

  const getChartTypeLabel = (type: ChartType) => {
    const labels: Record<ChartType, string> = {
      bar: "Barras",
      pie: "Circular",
      line: "Líneas",
      area: "Área",
      radar: "Radar",
      scatter: "Dispersión"
    };
    return labels[type];
  };

  const getColumnRequirement = (type: ChartType) => {
    switch (type) {
      case "pie":
        return "Selecciona 1 columna para agrupar";
      case "scatter":
        return "Selecciona 2 columnas (X e Y)";
      default:
        return "Selecciona al menos 2 columnas (primera será el eje X)";
    }
  };

  const handleColumnToggle = (column: string) => {
    if (chartType === "pie") {
      setDataKey(column);
      setSelectedColumns([column]);
    } else if (chartType === "scatter") {
      if (selectedColumns.includes(column)) {
        setSelectedColumns(selectedColumns.filter(c => c !== column));
      } else if (selectedColumns.length < 2) {
        setSelectedColumns([...selectedColumns, column]);
      }
    } else {
      if (selectedColumns.includes(column)) {
        setSelectedColumns(selectedColumns.filter(c => c !== column));
      } else {
        setSelectedColumns([...selectedColumns, column]);
      }
    }
  };

  const isValid = () => {
    if (!title.trim()) return false;
    if (chartType === "pie") return dataKey !== "";
    if (chartType === "scatter") return selectedColumns.length === 2;
    return selectedColumns.length >= 2;
  };

  const handleConfirm = () => {
    if (isValid()) {
      onConfirm(title, selectedColumns, chartType === "pie" ? dataKey : undefined);
      setTitle("");
      setSelectedColumns([]);
      setDataKey("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Gráfico de {getChartTypeLabel(chartType)}</DialogTitle>
          <DialogDescription>{getColumnRequirement(chartType)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chart-title">Título del Gráfico</Label>
            <Input
              id="chart-title"
              placeholder="Ej: Ventas por Región"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Columnas</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto">
              {chartType === "pie" ? (
                <Select value={dataKey} onValueChange={(value) => {
                  setDataKey(value);
                  setSelectedColumns([value]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una columna" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                headers.map((header) => (
                  <div key={header} className="flex items-center space-x-2">
                    <Checkbox
                      id={header}
                      checked={selectedColumns.includes(header)}
                      onCheckedChange={() => handleColumnToggle(header)}
                      disabled={chartType === "scatter" && selectedColumns.length >= 2 && !selectedColumns.includes(header)}
                    />
                    <label htmlFor={header} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                      {header}
                      {selectedColumns.indexOf(header) === 0 && chartType !== "scatter" && (
                        <span className="ml-2 text-xs text-muted-foreground">(Eje X)</span>
                      )}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid()}>
            Crear Gráfico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
