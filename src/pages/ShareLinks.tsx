// src/pages/ShareLinks.tsx

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
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Copy,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";


// -------------------------------------------------------
// UTILIDAD PARA VALIDAR UUIDS
// -------------------------------------------------------
function isUUID(value: string | undefined | null): boolean {
  return !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
}

// -------------------------------------------------------
// TIPOS
// -------------------------------------------------------

interface Analisis {
  global: number;
  criterios: string[];
  facultades: {
    nombre: string;
    total: number;
    carreras: { nombre: string; total: number }[];
  }[];
}

interface ShareLinkRow {
  id: string;
  token: string;
  link_type: string;
  filters: any;
  facultad_id: string | null;
  carrera_id: string | null;
  created_at: string;
}

// -------------------------------------------------------
// COMPONENTE PRINCIPAL
// -------------------------------------------------------
export default function ShareLinks() {
  const navigate = useNavigate();
  const { datasetId, versionId } = useParams();

  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<"FACULTAD" | "CARRERA" | null>(null);
  const [selectedFacultadIdx, setSelectedFacultadIdx] = useState(0);
  const [selectedCarreraIdx, setSelectedCarreraIdx] = useState(0);


  // -------------------------------------------------------
  // VALIDAR RUTA AL INICIAR
  // -------------------------------------------------------
  useEffect(() => {
    if (!isUUID(datasetId) || !isUUID(versionId)) {
      toast.error("ID de dataset o versión inválido.");
      navigate("/datasets");
    }
  }, [datasetId, versionId]);


  // -------------------------------------------------------
  // CARGAR LINKS + ANÁLISIS
  // -------------------------------------------------------
  useEffect(() => {
    if (!versionId) return;
    loadLinks();
    loadAnalisis();
  }, [versionId]);


  const loadLinks = async () => {
    const { data } = await supabase
      .from("share_links")
      .select("*")
      .eq("version_id", versionId)
      .order("created_at", { ascending: false });

    setLinks(data || []);
    setLoading(false);
  };


  const loadAnalisis = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-version`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId })
        }
      );

      setAnalisis(await res.json());
    } catch {
      toast.error("Error cargando análisis");
    }
  };


  // -------------------------------------------------------
  // GENERAR TOKEN
  // -------------------------------------------------------
  const generateToken = () =>
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36);


  // -------------------------------------------------------
  // CREAR LINK (INSERT REAL)
  // -------------------------------------------------------
  const generateLink = async () => {
    if (!analisis) return toast.error("Análisis no cargado");

    const fac = analisis.facultades[selectedFacultadIdx];
    const car =
      tipo === "CARRERA" ? fac.carreras[selectedCarreraIdx] : null;

    // Filters que se usarán en el dashboard
    const filters = {
      versionId,
      facultad: fac.nombre,
      carrera: car?.nombre ?? null
    };

    const { error } = await supabase.from("share_links").insert({
      dataset_id: isUUID(datasetId) ? datasetId : null,
      version_id: isUUID(versionId) ? versionId : null,
      link_type: tipo === "FACULTAD" ? "facultad" : "carrera",

      facultad_id: null, // si luego quieres enlazar con la tabla facultades
      carrera_id: null,  // igual para carreras

      token: generateToken(),
      filters
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Link generado correctamente");
    setDialogOpen(false);
    setTipo(null);
    loadLinks();
  };


  // -------------------------------------------------------
  // LOADING
  // -------------------------------------------------------
  if (loading || !analisis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center">
        <div className="text-primary-foreground text-xl">
          Cargando links...
        </div>
      </div>
    );
  }


  // -------------------------------------------------------
  // UI COMPLETA
  // -------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-6">
      <div className="max-w-7xl mx-auto">

        {/* Volver */}
        <Button
          variant="ghost"
          onClick={() =>
            navigate(`/datasets/${datasetId}/versions/${versionId}`)
          }
          className="mb-6 text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Versión
        </Button>

        {/* Cabecera */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-2">
              Links del Dashboard Estático
            </h1>
            <p className="text-primary-foreground/80">
              Compartir resultados de análisis
            </p>
          </div>

          <Button
            onClick={() => setDialogOpen(true)}
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Link
          </Button>
        </div>

        {/* Lista de links */}
        <div className="space-y-4">
          {links.map((link) => {
            const url = `${window.location.origin}/public-static/${link.token}`;

            return (
              <Card
                key={link.id}
                className="border-0 shadow-elegant hover:shadow-xl transition-all"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-accent capitalize">
                          {link.link_type}
                        </span>
                        <Badge className="bg-success">Activo</Badge>
                      </CardTitle>

                      <CardDescription className="mt-2 text-sm">
                        {new Date(link.created_at).toLocaleString()}
                      </CardDescription>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigator.clipboard.writeText(url)}
                        variant="outline"
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar
                      </Button>

                      <Button
                        onClick={() => window.open(url, "_blank")}
                        className="bg-secondary hover:bg-secondary/90"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="text-sm break-all">{url}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Si no hay links */}
        {links.length === 0 && (
          <Card className="border-0 shadow-elegant mt-10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Share2 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Sin links generados
              </h3>
              <p className="text-muted-foreground mb-6 text-center">
                Crea tu primer link para compartir resultados
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-accent hover:bg-accent/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Link
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Crear Link Compartible
            </DialogTitle>
          </DialogHeader>

          {!tipo ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Button
                onClick={() => setTipo("FACULTAD")}
                className="bg-secondary hover:bg-secondary/90 text-white"
              >
                Por Facultad
              </Button>
              <Button
                onClick={() => setTipo("CARRERA")}
                className="bg-accent hover:bg-accent/90 text-white"
              >
                Por Carrera
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Facultad */}
              <Select
                value={String(selectedFacultadIdx)}
                onValueChange={(v) => setSelectedFacultadIdx(Number(v))}
              >
                <SelectTrigger className="bg-white border text-black">
                  <SelectValue placeholder="Seleccione facultad" />
                </SelectTrigger>
                <SelectContent>
                  {analisis.facultades.map((f, i) => (
                    <SelectItem value={String(i)} key={i}>
                      {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Carrera */}
              {tipo === "CARRERA" && (
                <Select
                  value={String(selectedCarreraIdx)}
                  onValueChange={(v) => setSelectedCarreraIdx(Number(v))}
                >
                  <SelectTrigger className="bg-white border text-black">
                    <SelectValue placeholder="Seleccione carrera" />
                  </SelectTrigger>
                  <SelectContent>
                    {analisis.facultades[selectedFacultadIdx].carreras.map(
                      (c, i) => (
                        <SelectItem value={String(i)} key={i}>
                          {c.nombre}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}

              <Button
                onClick={generateLink}
                className="w-full bg-accent hover:bg-accent/90 text-white"
              >
                Crear Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
