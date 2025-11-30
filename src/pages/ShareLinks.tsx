// ---------------------------------------------------------
// src/pages/ShareLinks.tsx  (DEFINITIVO PARA LINKS ESTÁTICOS)
// ---------------------------------------------------------

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Link2, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface FiltersData {
  versionId: string;
  facultad: string;
  carrera: string | null;
}

interface ShareLinkRow {
  id: string;
  token: string;
  link_type: "facultad" | "carrera";
  filters: FiltersData;
  created_at: string;
}

interface Facultad {
  nombre: string;
  carreras: string[];
}

export default function ShareLinks() {
  const navigate = useNavigate();
  const { versionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [facultades, setFacultades] = useState<Facultad[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<"FACULTAD" | "CARRERA" | null>(null);
  const [fIdx, setFIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);

  // --------------------------------------------------------
  useEffect(() => {
    loadLinks();
    loadMetadata();
  }, [versionId]);

  const loadMetadata = async () => {
    const { data } = await supabase
      .from("dataset_versions")
      .select("metadata")
      .eq("id", versionId)
      .single();

    const facs = data?.metadata?.facultades || [];
    setFacultades(facs);
  };

  const loadLinks = async () => {
    const { data } = await supabase
      .from("share_links")
      .select("*")
      .eq("version_id", versionId)
      .order("created_at", { ascending: false });

    setLinks((data || []) as ShareLinkRow[]);
    setLoading(false);
  };

  const generateToken = () =>
    Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  // --------------------------------------------------------
  const generateLink = async () => {
    const f = facultades[fIdx];
    const carrera = tipo === "CARRERA" ? f.carreras[cIdx] : null;

    const filters: FiltersData = {
      versionId: versionId!,
      facultad: f.nombre,
      carrera,
    };

    const { error } = await supabase.from("share_links").insert({
      version_id: versionId,
      token: generateToken(),
      link_type: tipo === "FACULTAD" ? "facultad" : "carrera",
      filters,
    });

    if (error) {
      toast.error("Error");
    } else {
      toast.success("Link creado");
      setDialogOpen(false);
      loadLinks();
    }
  };

  // --------------------------------------------------------

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando...
      </div>
    );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" />
          Volver
        </Button>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Links Estáticos</h1>

          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2" /> Nuevo Link
          </Button>
        </div>

        {links.map((l) => {
          const url = `${window.location.origin}/public-static/${l.token}`;

          return (
            <Card key={l.id} className="shadow">
              <CardHeader>
                <CardTitle>
                  <Badge>Activo</Badge> {l.link_type} —{" "}
                  {l.filters.carrera || l.filters.facultad}
                </CardTitle>
                <CardDescription>
                  {new Date(l.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex gap-2 items-center bg-gray-100 p-2 rounded">
                  <div className="flex-1 break-all text-sm">{url}</div>

                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(url)}>
                    <Copy />
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}>
                    <ExternalLink />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* DIALOG */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear link</DialogTitle>
            </DialogHeader>

            {!tipo ? (
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => setTipo("FACULTAD")}>Por Facultad</Button>
                <Button variant="outline" onClick={() => setTipo("CARRERA")}>Por Carrera</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Facultad</label>

                  <Select value={String(fIdx)} onValueChange={(v) => setFIdx(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {facultades.map((f, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tipo === "CARRERA" && (
                  <div>
                    <label className="block mb-1">Carrera</label>

                    <Select value={String(cIdx)} onValueChange={(v) => setCIdx(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {facultades[fIdx].carreras.map((c, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button className="w-full" onClick={generateLink}>
                  <CheckCircle className="mr-2" /> Generar Link
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
