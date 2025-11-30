// /functions/calcular-porcentajes/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface FusionCriterio {
  sumatoria: number;
  cuentas: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

interface FusionCarrera {
  totalFilas: number;
  criterios: Record<string, FusionCriterio>;
}

interface FusionFacultad {
  totalFilas: number;
  carreras: Record<string, FusionCarrera>;
}

type FusionData = Record<string, FusionFacultad>;

serve(async (req) => {
  try {
    const { fusionado, criteriosColumnas } = await req.json();

    const criteriosNorm = criteriosColumnas.map((c: string) =>
      c
        .replace(/^[0-9]+\)\s*/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    );

    // TIPADO CORRECTO
    const facultadesArr: {
      nombre: string;
      total: number;
      carreras: { nombre: string; total: number; criterios: number[] }[];
    }[] = [];

    let globalSum = 0;
    let globalTotal = 0;

    for (const fac in fusionado as FusionData) {
      const fObj = fusionado[fac] as FusionFacultad;

      const facObj = { nombre: fac, total: 0, carreras: [] as any[] };

      let sumFac = 0;
      let countFac = 0;

      for (const car in fObj.carreras) {
        const cObj = fObj.carreras[car];

        const valoresCriterios: number[] = [];

        criteriosNorm.forEach((crit) => {
          const info = cObj.criterios[crit];

          if (!info) {
            valoresCriterios.push(0);
            return;
          }

          const prom = ((info.sumatoria / cObj.totalFilas) / 5) * 100;
          valoresCriterios.push(Number(prom.toFixed(2)));
        });

        const totalCarrera = Number(
          (valoresCriterios.reduce((a, b) => a + b, 0) / valoresCriterios.length).toFixed(2)
        );

        facObj.carreras.push({
          nombre: car,
          total: totalCarrera,
          criterios: valoresCriterios,
        });

        sumFac += totalCarrera;
        countFac++;

        globalSum += totalCarrera;
        globalTotal++;
      }

      facObj.total = Number((sumFac / countFac).toFixed(2));
      facultadesArr.push(facObj);
    }

    const globalFinal = Number((globalSum / globalTotal).toFixed(2));

    const resultado = {
      criterios: criteriosNorm,
      facultades: facultadesArr,
      global: globalFinal,
    };

    return new Response(JSON.stringify(resultado), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
