
// src/pages/PublicStaticDashboard.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

// ------------------------
// TIPOS
// ------------------------

interface Carrera {
  nombre: string;
  total: number;
  criterios: number[];
}

interface Facultad {
  nombre: string;
  total: number;
  carreras: Carrera[];
}

interface AnalisisRaw {
  global: number;
  criterios: string[];
  facultades: Facultad[];
  [key: string]: any;
}

interface FiltersData {
  tipo: string;
  facultadNombre: string | null;
  carreraNombre: string | null;
  analisis: AnalisisRaw;
}

interface SharedRow {
  filters: FiltersData;
}

// ------------------------
// COMPONENTE
// ------------------------

export default function PublicStaticDashboard() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState<{
    global: number;
    criteriosLista: string[];
    facultades: Facultad[];
  } | null>(null);

  const [facultadSel, setFacultadSel] = useState("");
  const [carreraSel, setCarreraSel] = useState("");

  // -----------------------------------
  // CARGAR DATOS DESDE SUPABASE
  // -----------------------------------

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data, error } = await supabase
          .from("share_links")
          .select("filters")
          .eq("token", token)
          .single<SharedRow>();

        if (error) throw error;
        if (!data?.filters?.analisis) {
          throw new Error("Filtros inválidos o análisis no encontrado");
        }

        const raw = data.filters.analisis as AnalisisRaw;

        const analisisAdaptado = {
          global: Number(raw.global ?? 0),
          criteriosLista: Array.isArray(raw.criterios) ? raw.criterios : [],
          facultades: Array.isArray(raw.facultades) ? raw.facultades : [],
        };

        if (
          isNaN(analisisAdaptado.global) ||
          !Array.isArray(analisisAdaptado.criteriosLista) ||
          !Array.isArray(analisisAdaptado.facultades)
        ) {
          throw new Error("Estructura de datos inválida");
        }

        if (analisisAdaptado.facultades.length === 0) {
          throw new Error("No existen facultades en el análisis");
        }

        setDatos(analisisAdaptado);

        const f0 = analisisAdaptado.facultades[0];
        setFacultadSel(f0.nombre);

        if (f0.carreras.length > 0) {
          setCarreraSel(f0.carreras[0].nombre);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setDatos(null);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [token]);

  // -----------------------------------
  // BUSCAR FACULTAD Y CARRERA
  // -----------------------------------

  const facultad = datos?.facultades.find((f) => f.nombre === facultadSel);
  const carrera = facultad?.carreras.find((c) => c.nombre === carreraSel);

  // -----------------------------------
  // RENDER GLOBAL
  // -----------------------------------

  const renderGlobal = () => {
    const el = document.getElementById("totalGlobal");
    if (el && datos) {
      el.innerText = datos.global.toFixed(2).replace(".", ",") + "%";
    }
  };

  let chart1: Chart | null = null;

  const renderCarreras = () => {
    const ctx = document.getElementById("chartCarreras") as HTMLCanvasElement;
    if (!ctx || !facultad) return;
    if (chart1) chart1.destroy();

    chart1 = new Chart(ctx, {
      type: "bar",
      plugins: [ChartDataLabels],
      data: {
        labels: facultad.carreras.map((c) => c.nombre),
        datasets: [
          {
            data: facultad.carreras.map((c) => c.total),
            backgroundColor: "#009639",
            borderColor: "#003A63",
            borderWidth: 2,
          },
        ],
      },
      options: {
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          datalabels: {
            color: "white",
            font: { size: 14, weight: "bold" },
            formatter: (v: number) => v.toFixed(2).replace(".", ",") + "%",
          },
        },
      },
    });
  };

  let chart2: Chart | null = null;

  const renderCriterios = () => {
    const ctx = document.getElementById("chartCriterios") as HTMLCanvasElement;
    if (!ctx || !carrera || !datos) return;
    if (chart2) chart2.destroy();

    chart2 = new Chart(ctx, {
      type: "bar",
      plugins: [ChartDataLabels],
      data: {
        labels: datos.criteriosLista,
        datasets: [
          {
            label: carrera.nombre,
            data: carrera.criterios,
            backgroundColor: "#009639",
            borderColor: "#003A63",
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: carrera.nombre,
            color: "#003A63",
            font: { size: 20 },
          },
          datalabels: {
            color: "white",
            font: { size: 14, weight: "bold" },
            formatter: (v: number) => v.toFixed(2).replace(".", ",") + "%",
          },
        },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });
  };

  useEffect(() => {
    if (!datos || !facultad || !carrera) return;

    const t = setTimeout(() => {
      renderGlobal();
      renderCarreras();
      renderCriterios();
    }, 100);

    return () => clearTimeout(t);
  }, [datos, facultadSel, carreraSel]);

  // -----------------------------------
  // UI
  // -----------------------------------

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl">
        Cargando...
      </div>
    );

  if (!datos)
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-red-600">
        Link no válido
      </div>
    );

  return (
    <div
      style={{
        background: "#f8f9fa",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 className="text-center text-4xl font-bold text-[#003A63] mb-10">
        Dashboard de Satisfacción Estudiantil - UNEMI
      </h1>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* GLOBAL */}
        <div className="bg-[#003A63] text-white p-10 rounded-2xl text-center">
          <h2 className="text-3xl mb-4">Percepción Global</h2>
          <div id="totalGlobal" className="text-8xl font-bold">
            0%
          </div>
        </div>

        {/* FACULTADES */}
        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <select
            value={facultadSel}
            onChange={(e) => {
              setFacultadSel(e.target.value);
              const f = datos.facultades.find((x) => x.nombre === e.target.value);
              if (f?.carreras[0]) setCarreraSel(f.carreras[0].nombre);
            }}
            className="w-full p-4 text-lg border-2 border-[#003A63] rounded-xl mb-6"
          >
            {datos.facultades.map((f) => (
              <option key={f.nombre} value={f.nombre}>
                {f.nombre}
              </option>
            ))}
          </select>

          {facultad && (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#003A63] mb-2">
                {facultad.nombre}
              </h2>
              <div className="text-7xl font-bold text-[#009639]">
                {facultad.total.toFixed(2).replace(".", ",")}%
              </div>
            </div>
          )}

          <canvas id="chartCarreras" height="120"></canvas>
        </div>

        {/* CARRERAS */}
        {facultad && (
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <select
              value={carreraSel}
              onChange={(e) => setCarreraSel(e.target.value)}
              className="w-full p-4 text-lg border-2 border-[#009639] rounded-xl mb-6"
            >
              {facultad.carreras.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <canvas id="chartCriterios" height="140"></canvas>
          </div>
        )}
      </div>
    </div>
  );
}
