import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText, ExternalLink, Share2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
interface Version {
  id: string;
  version_number: number;
  file_path: string;

  created_at: string;
  total_rows: number | null;
}

const DatasetVersions = () => {
  const navigate = useNavigate();
  const { datasetId } = useParams();

  const [versions, setVersions] = useState<Version[]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // Cargar dataset + versiones
  // -----------------------------
  useEffect(() => {
    if (!datasetId) return;

    loadVersions();
  }, [datasetId]);

  const loadVersions = async () => {
    try {

      setLoading(true);

      // --------------------
      // Obtener nombre dataset
      // --------------------

      const { data: datasetData, error: datasetError } = await supabase
        .from("datasets")
        .select("nombre")
        .eq("id", datasetId)
        .single();

      if (datasetError) throw datasetError;
      setDatasetName(datasetData.nombre);

      // --------------------
      // Obtener versiones
      // --------------------

      const { data: versionsData, error: versionsError } = await supabase
        .from("dataset_versions")
        .select("*")
        .eq("dataset_id", datasetId)
        .order("version_number", { ascending: false });

      if (versionsError) throw versionsError;

      setVersions(versionsData || []);
    } catch (error: any) {

      toast.error(error.message || "Error al cargar versiones");

    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Pantalla de carga
  // -----------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center">
        <div className="text-primary-foreground text-xl">Cargando versiones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-6">
      <div className="max-w-7xl mx-auto">


        {/* Volver */}

        <Button
          variant="ghost"
          onClick={() => navigate("/datasets")}
          className="mb-6 text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Datasets
        </Button>

        {/* Cabecera */}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-2">
              Versiones del Dataset
            </h1>
            <p className="text-primary-foreground/80">{datasetName}</p>
          </div>

          <Button
            onClick={() => navigate(`/datasets/${datasetId}/versions/create`)}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nueva Versión
          </Button>
        </div>

        {/* Lista de versiones */}
        <div className="space-y-4">
          {versions.map((version) => {
            const recordsCount = version.total_rows ?? 0;

            return (
              <Card
                key={version.id}
                className="border-0 shadow-elegant hover:shadow-xl transition-all"
              >

                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-3">

                        <span className="text-2xl font-bold text-accent">
                          v{version.version_number}
                        </span>
                        <Badge className="bg-success">Lista</Badge>
                      </CardTitle>

                      <CardDescription className="flex items-center gap-2 mt-2">
                        <FileText className="h-4 w-4" />
                        {version.file_path}
                      </CardDescription>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          navigate(`/datasets/${datasetId}/versions/${version.id}/tables`)
                        }
                        variant="outline"
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        Tablas Detalladas
                      </Button>

                      <Button
                        onClick={() =>
                          navigate(
                            `/datasets/${datasetId}/versions/${version.id}/dashboard?versionId=${version.id}`
                          )
                        }

                        className="bg-secondary hover:bg-secondary/90"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver Dashboard
                      </Button>

                      <Button
                        onClick={() =>
                          navigate(
                            `/datasets/${datasetId}/versions/${version.id}/share-links`
                          )
                        }

                        variant="outline"
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Links
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

                    <div>
                      <span className="text-muted-foreground">Registros:</span>
                      <p className="font-semibold text-lg">
                        {recordsCount.toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <span className="text-muted-foreground">
                        Fecha de creación:
                      </span>

                      <p className="font-semibold">
                        {new Date(version.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <p className="font-semibold capitalize">Lista</p>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Cuando no hay versiones */}
        {versions.length === 0 && (
          <Card className="border-0 shadow-elegant mt-10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay versiones</h3>
              <p className="text-muted-foreground mb-6">
                Comienza creando tu primera versión
              </p>
              <Button
                onClick={() =>
                  navigate(`/datasets/${datasetId}/versions/create`)
                }

                className="bg-accent hover:bg-accent/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Versión
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DatasetVersions;
