// src/pages/dataset-versions/TablesAnalysis.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";

export default function TablesAnalysis() {
  const { datasetId, versionId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFacultad, setSelectedFacultad] = useState<string | null>(null);
  const [selectedCarrera, setSelectedCarrera] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!versionId) return;

      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-version`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ versionId }),
        });

        if (!res.ok) throw new Error("Error al cargar análisis");
        const result = await res.json();
        setData(result);
      } catch (err) {
        toast.error("Error cargando las tablas detalladas");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [versionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center">
        <div className="text-primary-foreground text-2xl">Cargando análisis tabular...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center">
        <div className="text-primary-foreground text-xl">No se encontraron datos</div>
      </div>
    );
  }

  const { global, criterios, facultades } = data;

  const facultad = selectedFacultad ? facultades.find((f: any) => f.nombre === selectedFacultad) : null;
  const carreras = facultad?.carreras || [];
  const carrera = selectedCarrera ? carreras.find((c: any) => c.nombre === selectedCarrera) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-8">
      <div className="max-w-7xl mx-auto">
        {/* Botón volver */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Volver
        </Button>

        <h1 className="text-4xl font-bold text-primary-foreground mb-10">
          Análisis Tabular Detallado - Versión {versionId?.slice(-6)}
        </h1>

        <div className="bg-white rounded-xl shadow-2xl p-8 space-y-16 text-gray-800">
          {/* 1. Porcentaje Global */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-primary">1. Satisfacción Global</h2>
            <Table>
              <TableBody>
                <TableRow className="h-20">
                  <TableCell className="text-2xl font-bold">Porcentaje Global de Satisfacción</TableCell>
                  <TableCell className="text-right text-6xl font-bold text-green-600">
                    {global}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          {/* 2. Por Facultad */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-primary">2. Satisfacción por Facultad</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-lg">Facultad</TableHead>
                  <TableHead className="text-right text-lg">Satisfacción (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultades.map((f: any) => (
                  <TableRow
                    key={f.nombre}
                    className="cursor-pointer hover:bg-gray-100 transition-all text-base"
                    onClick={() => {
                      setSelectedFacultad(f.nombre);
                      setSelectedCarrera(null);
                    }}
                  >
                    <TableCell className="font-medium">{f.nombre}</TableCell>
                    <TableCell className="text-right text-2xl font-bold text-blue-700">
                      {f.total}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* 3. Facultad seleccionada */}
          {facultad && (
            <section className="pt-10 border-t-4 border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-primary">
                3. Facultad: {facultad.nombre} ({facultad.total}%)
              </h2>

              <div className="grid lg:grid-cols-2 gap-12">
                {/* Carreras */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">Carreras</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Carrera</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carreras.map((c: any) => (
                        <TableRow
                          key={c.nombre}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedCarrera(c.nombre)}
                        >
                          <TableCell>{c.nombre}</TableCell>
                          <TableCell className="text-right font-bold">{c.total}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Criterios de la facultad */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">Por Criterio (Facultad)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterio</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {criterios.map((crit: string, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{crit}</TableCell>
                          <TableCell className="text-right font-medium">
                            {facultad.criterios[i]}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
          )}

          {/* 4. Carrera seleccionada */}
          {carrera && (
            <section className="pt-10 border-t-4 border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-primary">
                4. Carrera: {carrera.nombre} ({carrera.total}%)
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-lg">Criterio</TableHead>
                    <TableHead className="text-right text-lg">Satisfacción (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criterios.map((crit: string, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{crit}</TableCell>
                      <TableCell className="text-right text-xl font-bold text-green-700">
                        {carrera.criterios[i]}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          {/* 5. Global por Criterio */}
          <section className="pt-10 border-t-4 border-gray-200">
            <h2 className="text-3xl font-bold mb-6 text-primary">
              5. Satisfacción Global por Criterio (Toda la Universidad)
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-lg">Criterio</TableHead>
                  <TableHead className="text-right text-lg">Promedio Global (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criterios.map((crit: string, i: number) => {
                  const avg = (facultades.reduce((sum: number, f: any) => sum + f.criterios[i], 0) / facultades.length).toFixed(2);
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{crit}</TableCell>
                      <TableCell className="text-right text-xl font-bold text-purple-700">
                        {avg}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          {/* Botón reiniciar */}
          {(selectedFacultad || selectedCarrera) && (
            <div className="text-center pt-12">
              <Button
                size="lg"
                onClick={() => {
                  setSelectedFacultad(null);
                  setSelectedCarrera(null);
                }}
              >
                Volver al inicio del análisis
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}