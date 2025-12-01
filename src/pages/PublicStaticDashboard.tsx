// src/pages/PublicStaticDashboard.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(ChartDataLabels);

// -----------------------------
// TIPOS
// -----------------------------
interface FacultadLink {
  tipo: "FACULTAD";
  nombre: string;
  global: number;
  criterios: string[];
  carreras: { nombre: string; total: number; criterios: number[] }[];
}

interface CarreraLink {
  tipo: "CARRERA";
  nombre: string;
  global: number;
  criterios: string[];
  valores: number[];
}

type AnalisisFiltrado = FacultadLink | CarreraLink;

// -----------------------------
// COMPONENTE PRINCIPAL
// -----------------------------
export default function PublicStaticDashboard() {
  const { token } = useParams();
  const [info, setInfo] = useState<AnalisisFiltrado | null>(null);
  const [selected, setSelected] = useState(0);

  const [chartTop, setChartTop] = useState<any>(null);
  const [chartBottom, setChartBottom] = useState<any>(null);

  // -----------------------------
  // Cargar datos
  // -----------------------------
  useEffect(() => {
    load();
  }, [token]);

  const load = async () => {
    if (!token) return;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analisis-filtrado-chunk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    const json = await res.json();
    console.log("ANALISIS FILTRADO:", json);
    setInfo(json);
  };

  // -----------------------------
  // Dibujar gráficos una vez
  // -----------------------------
  useEffect(() => {
    if (!info) return;

    if (chartTop) chartTop.destroy();
    if (chartBottom) chartBottom.destroy();

    drawCharts();
  }, [info, selected]);

  // -----------------------------
  // Dibujar Gráficos
  // -----------------------------
  const drawCharts = () => {
    if (!info) return;

    // ============= GRÁFICO SUPERIOR =============
    const ctx1 = document.getElementById("chartTop") as HTMLCanvasElement;

    if (info.tipo === "FACULTAD") {
      const labels = info.carreras.map(c => c.nombre);
      const valores = info.carreras.map(c => c.total);

      const ct = new Chart(ctx1, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Percepción Total (%)",
              data: valores,
              backgroundColor: ["#009639", "#003A63", "#009639", "#003A63"],
              borderColor: "#003A63",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } },
          plugins: {
            datalabels: {
              anchor: "center",
              align: "center",
              color: "white",
              font: { weight: "bold", size: 16 },
              formatter: v => `${v.toFixed(2)}%`
            }
          }
        }
      });

      setChartTop(ct);
    }

    if (info.tipo === "CARRERA") {
      const ct = new Chart(ctx1, {
        type: "bar",
        data: {
          labels: ["Promedio Global"],
          datasets: [
            {
              label: "Total (%)",
              data: [info.global],
              backgroundColor: "#009639",
              borderColor: "#003A63",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } },
          plugins: {
            datalabels: {
              anchor: "center",
              align: "center",
              color: "white",
              formatter: v => `${v.toFixed(2)}%`
            }
          }
        }
      });

      setChartTop(ct);
    }

    // ============= GRÁFICO INFERIOR (INDICADORES) =============
    const ctx2 = document.getElementById("chartBottom") as HTMLCanvasElement;

    let valores: number[] = [];
    let tituloLabel = "";

    if (info.tipo === "FACULTAD") {
      valores = info.carreras[selected].criterios;
      tituloLabel = `Valores (%) - ${info.carreras[selected].nombre}`;
    } else {
      valores = info.valores;
      tituloLabel = `Valores (%) - ${info.nombre}`;
    }

    const ct2 = new Chart(ctx2, {
      type: "bar",
      data: {
        labels: info.criterios,
        datasets: [
          {
            label: tituloLabel,
            data: valores,
            backgroundColor: "#009639",
            borderColor: "#003A63",
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          datalabels: {
            color: "white",
            anchor: "center",
            align: "center",
            font: { weight: "bold" },
            formatter: v => `${v.toFixed(2)}%`
          }
        }
      }
    });

    setChartBottom(ct2);
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Cargando dashboard...
      </div>
    );
  }

  return (
    <div style={{ background: "#f5f5f5", padding: 20 }}>
      <h1 style={{ textAlign: "center", color: "#003A63" }}>
        Dashboard de Satisfacción Estudiantil - UNEMI
      </h1>

      {/* TARJETA GLOBAL */}
      <div
        className="card"
        style={{
          textAlign: "center",
          background: "#003A63",
          color: "white",
          padding: 20,
          borderRadius: 12,
          marginBottom: 20
        }}
      >
        <div style={{ fontSize: 22, fontWeight: "bold" }}>
          TOTAL DE PERCEPCIÓN - {info.nombre}
        </div>
        <div style={{ fontSize: 70, marginTop: 10, fontWeight: "bold" }}>
          {info.global.toFixed(2)}%
        </div>
      </div>

      {/* GRÁFICO SUPERIOR */}
      <div className="card" style={{ background: "white", padding: 20, borderRadius: 12 }}>
        <div className="title" style={{ fontSize: 20, marginBottom: 10, fontWeight: "bold", color: "#009345" }}>
          {info.tipo === "FACULTAD" ? "Percepción Global por Carrera" : "Promedio Global"}
        </div>

        <canvas id="chartTop"></canvas>
      </div>

      {/* SELECT SOLO PARA FACULTAD */}
      {info.tipo === "FACULTAD" && (
        <div className="card" style={{ background: "white", padding: 20, borderRadius: 12 }}>
          <div className="title" style={{ fontSize: 20, marginBottom: 10, fontWeight: "bold", color: "#009345" }}>
            Seleccione una Carrera
          </div>

          <select
            id="selectCar"
            value={selected}
            onChange={e => setSelected(Number(e.target.value))}
            style={{
              width: 250,
              padding: 10,
              borderRadius: 8,
              border: "2px solid #003A63",
              marginBottom: 20,
              fontSize: 16
            }}
          >
            {info.carreras.map((c, i) => (
              <option key={i} value={i}>
                {c.nombre}
              </option>
            ))}
          </select>

          <canvas id="chartBottom"></canvas>
        </div>
      )}

      {/* GRÁFICO PARA CARRERA */}
      {info.tipo === "CARRERA" && (
        <div className="card" style={{ background: "white", padding: 20, borderRadius: 12 }}>
          <div className="title" style={{ fontSize: 20, marginBottom: 10, fontWeight: "bold", color: "#009345" }}>
            Indicadores de {info.nombre}
          </div>

          <canvas id="chartBottom"></canvas>
        </div>
      )}
    </div>
  );
}
