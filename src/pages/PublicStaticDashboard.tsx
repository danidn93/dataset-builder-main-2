// src/pages/PublicStaticDashboard.tsx
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { supabase } from "@/integrations/supabase/client";

Chart.register(ChartDataLabels);

export default function PublicStaticDashboard() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [analisis, setAnalisis] = useState<any>(null);

  // refs Charts
  const chart1Ref = useRef<HTMLCanvasElement | null>(null);
  const chart2Ref = useRef<HTMLCanvasElement | null>(null);
  const chart1Instance = useRef<Chart | null>(null);
  const chart2Instance = useRef<Chart | null>(null);

  const [selectedCarrera, setSelectedCarrera] = useState("");

  // =========================================================
  // CARGA PRINCIPAL → primero obtener filters del token
  // luego llamar a analisis-filtrado-chunk
  // =========================================================
  const load = async () => {
    try {
      // 1. cargar los filtros desde share_links
      const { data, error } = await supabase
        .from("share_links")
        .select("filters")
        .eq("token", token)
        .single();

      if (error || !data) throw new Error("Token inválido");

      // CAST a tipo real que esperamos recibir
        const filters = data.filters as {
        versionId: string;
        facultad: string;
        carrera: string | null;
        };

        const versionId = filters.versionId;
        const facultad = filters.facultad;
        const carrera = filters.carrera;


      // 2. llamar a la función enviando LO CORRECTO
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-filtrado-chunk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId,
            facultad,
            carrera, // puede ser null si es filtro por facultad
          }),
        }
      );

      const json = await res.json();

      if (!json || !json.global) throw new Error("Datos incompletos");

      setAnalisis(json);

      // seleccionar primera carrera por defecto
      if (json.carreras?.length > 0) {
        setSelectedCarrera(json.carreras[0].nombre);
      }
    } catch (err) {
      console.error("ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =========================================================
  // Cargar gráfico 1
  // =========================================================
  useEffect(() => {
    if (!analisis) return;
    renderChart1();
  }, [analisis]);

  const renderChart1 = () => {
    if (!chart1Ref.current || !analisis) return;

    if (chart1Instance.current) chart1Instance.current.destroy();

    const labels = analisis.carreras.map((c: any) => c.nombre);
    const valores = analisis.carreras.map((c: any) => c.total);

    chart1Instance.current = new Chart(chart1Ref.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            data: valores,
            label: "Percepción (%)",
            backgroundColor: ["#009639", "#003A63", "#009639", "#003A63"],
            borderColor: "#003A63",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          datalabels: {
            anchor: "center",
            align: "center",
            color: "white",
            font: { weight: "bold", size: 14 },
            formatter: (v: number) => v.toFixed(2) + "%",
          },
        },
      },
    });
  };

  // =========================================================
  // Cargar gráfico 2
  // =========================================================
  useEffect(() => {
    if (!analisis) return;
    renderChart2();
  }, [analisis, selectedCarrera]);

  const renderChart2 = () => {
    if (!chart2Ref.current || !analisis || !selectedCarrera) return;

    if (chart2Instance.current) chart2Instance.current.destroy();

    const indicadores = analisis.criterios;
    const valores = analisis.indicadoresPorCarrera[selectedCarrera] || [];

    chart2Instance.current = new Chart(chart2Ref.current, {
      type: "bar",
      data: {
        labels: indicadores,
        datasets: [
          {
            label: selectedCarrera,
            data: valores,
            backgroundColor: "#009639",
            borderColor: "#003A63",
            borderWidth: 2,
          },
        ],
      },
      options: {
        indexAxis: "x",
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          legend: { display: true },
          datalabels: {
            anchor: "center",
            align: "center",
            color: "white",
            font: { weight: "bold", size: 14 },
            formatter: (v: number) => v.toFixed(2) + "%",
          },
        },
      },
    });
  };

  // =========================================================
  // PAGINA
  // =========================================================
  if (loading || !analisis) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 20 }}>
        Cargando dashboard…
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f5f5", padding: 20 }}>
      <h1
        style={{
          textAlign: "center",
          color: "#003A63",
          fontSize: 36,
          marginBottom: 20,
        }}
      >
        Dashboard de Satisfacción Estudiantil - UNEMI
      </h1>

      {/* TARJETA GLOBAL */}
      <div
        style={{
          background: "#003A63",
          color: "white",
          padding: 20,
          borderRadius: 12,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: "bold" }}>
          TOTAL DE PERCEPCIÓN
        </div>

        <div style={{ fontSize: 70, fontWeight: "bold", marginTop: 10 }}>
          {analisis.global.toFixed(2)}%
        </div>
      </div>

      {/* GRAFICO 1 */}
      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          marginBottom: 30,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#009345",
            marginBottom: 10,
          }}
        >
          Percepción Global por Carrera
        </div>

        <canvas ref={chart1Ref} height={300}></canvas>
      </div>

      {/* SELECT + GRAFICO 2 */}
      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#009345",
            marginBottom: 10,
          }}
        >
          Seleccione una Carrera
        </div>

        <select
          value={selectedCarrera}
          onChange={(e) => setSelectedCarrera(e.target.value)}
          style={{
            width: 300,
            padding: 10,
            borderRadius: 8,
            border: "2px solid #003A63",
            marginBottom: 20,
            fontSize: 16,
          }}
        >
          {analisis.carreras.map((c: any) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>

        <canvas ref={chart2Ref} height={300}></canvas>
      </div>
    </div>
  );
}
