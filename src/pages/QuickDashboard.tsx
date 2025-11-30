import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Filter } from "lucide-react";
import { ChartSelector } from "@/components/charts/ChartSelector";
import { ChartCanvas, ChartType, ChartConfig } from "@/components/charts/ChartCanvas";
import { ChartConfigDialog } from "@/components/charts/ChartConfigDialog";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

const QuickDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [pendingChartType, setPendingChartType] = useState<ChartType | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const rowsPerPage = 10;

  // Limpia filas y columnas vacías completamente
  const cleanEmptyRowsAndColumns = (rawData: any[][]): any[][] => {
    if (!rawData || rawData.length === 0) return [];

    // Remover filas completamente vacías
    const rowsCleaned = rawData.filter(row => 
      row && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "")
    );

    if (rowsCleaned.length === 0) return [];

    // Identificar columnas completamente vacías
    const maxCols = Math.max(...rowsCleaned.map(row => row.length));
    const nonEmptyColumns: number[] = [];

    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const hasData = rowsCleaned.some(row => {
        const cell = row[colIdx];
        return cell !== null && cell !== undefined && String(cell).trim() !== "";
      });
      if (hasData) {
        nonEmptyColumns.push(colIdx);
      }
    }

    // Filtrar solo las columnas no vacías
    const columnsCleaned = rowsCleaned.map(row => 
      nonEmptyColumns.map(colIdx => row[colIdx] ?? "")
    );

    return columnsCleaned;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    try {
      if (fileExtension === "csv") {
        Papa.parse(file, {
          complete: (results) => {
            try {
              const cleaned = cleanEmptyRowsAndColumns(results.data as any[][]);
              
              if (cleaned.length < 2) {
                toast({
                  title: "Error",
                  description: "El archivo no contiene suficientes datos",
                  variant: "destructive"
                });
                return;
              }

              const headerRow = cleaned[0].map(h => String(h).trim()).filter(h => h !== "");
              
              if (headerRow.length === 0) {
                toast({
                  title: "Error",
                  description: "No se encontraron encabezados válidos",
                  variant: "destructive"
                });
                return;
              }

              const dataRows = cleaned.slice(1).map(row => {
                const obj: Record<string, any> = {};
                headerRow.forEach((header, index) => {
                  obj[header] = row[index] ?? "";
                });
                return obj;
              });

              setHeaders(headerRow);
              setData(dataRows);
              setFilters({});
              setCharts([]);
              toast({
                title: "Archivo cargado",
                description: `${dataRows.length} filas cargadas correctamente`
              });
            } catch (error) {
              console.error("Error procesando CSV:", error);
              toast({
                title: "Error",
                description: "Error al procesar el archivo CSV",
                variant: "destructive"
              });
            }
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            toast({
              title: "Error",
              description: "No se pudo leer el archivo CSV",
              variant: "destructive"
            });
          }
        });
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            const cleaned = cleanEmptyRowsAndColumns(jsonData);

            if (cleaned.length < 2) {
              toast({
                title: "Error",
                description: "El archivo no contiene suficientes datos",
                variant: "destructive"
              });
              return;
            }

            const headerRow = cleaned[0].map(h => String(h).trim()).filter(h => h !== "");

            if (headerRow.length === 0) {
              toast({
                title: "Error",
                description: "No se encontraron encabezados válidos",
                variant: "destructive"
              });
              return;
            }

            const dataRows = cleaned.slice(1).map(row => {
              const obj: Record<string, any> = {};
              headerRow.forEach((header, index) => {
                obj[header] = row[index] ?? "";
              });
              return obj;
            });

            setHeaders(headerRow);
            setData(dataRows);
            setFilters({});
            setCharts([]);
            toast({
              title: "Archivo cargado",
              description: `${dataRows.length} filas cargadas correctamente`
            });
          } catch (error) {
            console.error("Error procesando Excel:", error);
            toast({
              title: "Error",
              description: "Error al procesar el archivo Excel",
              variant: "destructive"
            });
          }
        };
        reader.onerror = () => {
          toast({
            title: "Error",
            description: "No se pudo leer el archivo",
            variant: "destructive"
          });
        };
        reader.readAsArrayBuffer(file);
      } else {
        toast({
          title: "Formato inválido",
          description: "Solo se permiten archivos CSV, XLS o XLSX",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error general:", error);
      toast({
        title: "Error",
        description: "Error al cargar el archivo",
        variant: "destructive"
      });
    }
  };

  const getFilteredData = () => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value === "ALL") return true;
        return String(row[key]) === value;
      });
    });
  };

  const getUniqueValues = (column: string): string[] => {
    const values = data
      .map(row => row[column])
      .filter(val => {
        if (val === undefined || val === null) return false;
        const strVal = String(val).trim();
        return strVal !== "";
      })
      .map(val => String(val).trim());
    return Array.from(new Set(values));
  };

  const handleDragStart = (type: ChartType) => {
    setPendingChartType(type);
    setConfigDialogOpen(true);
  };

  const handleChartConfirm = (title: string, columns: string[], dataKey?: string) => {
    if (!pendingChartType) return;
    
    const newChart: ChartConfig = {
      id: Date.now().toString(),
      type: pendingChartType,
      title,
      columns,
      dataKey
    };
    
    setCharts([...charts, newChart]);
    setPendingChartType(null);
  };

  const handleRemoveChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  const handleUpdateChart = (id: string, config: Partial<ChartConfig>) => {
    setCharts(charts.map(c => c.id === id ? { ...c, ...config } : c));
  };

  const filteredData = getFilteredData();
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Inicio
          </Button>

          <Card className="border-0 shadow-elegant">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Upload className="h-20 w-20 text-primary mb-6" />
              <h2 className="text-2xl font-bold mb-2">Dashboard Rápido</h2>
              <p className="text-muted-foreground mb-8 text-center max-w-md">
                Carga un archivo CSV o Excel para crear visualizaciones interactivas al instante
              </p>
              <Button size="lg" onClick={() => document.getElementById("file-input")?.click()}>
                <Upload className="mr-2 h-5 w-5" />
                Seleccionar Archivo
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground">Dashboard Rápido</h1>
            <p className="text-primary-foreground/80">{filteredData.length} registros cargados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-background" onClick={() => document.getElementById("file-input")?.click()}>
              Cargar Nuevo
            </Button>
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>

        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Filtros */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {headers.map((header) => (
                <div key={header} className="space-y-2">
                  <label className="text-sm font-medium">{header}</label>
                  <Select
                    value={filters[header] || "ALL"}
                    onValueChange={(value) => setFilters({ ...filters, [header]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      {getUniqueValues(header).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setFilters({})}>
              Limpiar Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Selector de Gráficos */}
        <ChartSelector onDragStart={handleDragStart} />

        {/* Lienzo de Gráficos */}
        <ChartCanvas
          charts={charts}
          data={filteredData}
          onRemoveChart={handleRemoveChart}
          onUpdateChart={handleUpdateChart}
        />

        {/* Dialog de Configuración */}
        {pendingChartType && (
          <ChartConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            chartType={pendingChartType}
            headers={headers}
            onConfirm={handleChartConfirm}
          />
        )}

        {/* Tabla de Datos */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle>Datos Filtrados ({filteredData.length} registros)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, idx) => (
                    <TableRow key={idx}>
                      {headers.map((header) => (
                        <TableCell key={header}>{String(row[header] || "-")}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickDashboard;
