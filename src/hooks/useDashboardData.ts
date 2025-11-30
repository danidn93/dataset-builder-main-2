import { useEffect, useState } from "react";

// --------------------------------------
// Normalizar nombres
// --------------------------------------
function normalizeName(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// --------------------------------------
// HOOK PRINCIPAL CORREGIDO
// --------------------------------------
export function useDashboardData(versionId: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    if (!versionId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-version`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ versionId }),
          }
        );

        const json = await resp.json();

        if (!resp.ok) throw new Error(json.error);

        //--------------------------------------------------
        // IMPORTANTE: LA ESTRUCTURA VIENE EN porcentajes.facultad
        //--------------------------------------------------
        const criterios = json.porcentajes?.criterios || [];
        const facultadesRaw = json.porcentajes?.facultad || [];

        const facultades = facultadesRaw.map((fac: any) => {
          const carreras = fac.carreras.map((car: any) => ({
            nombre: normalizeName(car.nombre),
            total: car.total,
            criterios: car.criterios,
          }));

          return {
            nombre: normalizeName(fac.nombre),
            total: fac.total,
            carreras,
          };
        });

        setDashboard({
          criterios,
          facultades,
          global: json.global ?? 0,
        });
      } catch (e: any) {
        console.error("ERROR DASHBOARD HOOK:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [versionId]);

  return { loading, error, dashboard };
}
