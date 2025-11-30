// /functions/fusionar-analisis/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { parciales, criteriosColumnas } = await req.json();

    const fusion: any = {};

    for (const parcial of parciales) {
      for (const fac in parcial) {
        if (!fusion[fac]) fusion[fac] = { totalFilas: 0, carreras: {} };

        fusion[fac].totalFilas += parcial[fac].totalFilas;

        for (const car in parcial[fac].carreras) {
          if (!fusion[fac].carreras[car])
            fusion[fac].carreras[car] = { totalFilas: 0, criterios: {} };

          fusion[fac].carreras[car].totalFilas += parcial[fac].carreras[car].totalFilas;

          for (const crit in parcial[fac].carreras[car].criterios) {
            const pc = parcial[fac].carreras[car].criterios[crit];

            if (!fusion[fac].carreras[car].criterios[crit]) {
              fusion[fac].carreras[car].criterios[crit] = {
                sumatoria: 0,
                cuentas: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
              };
            }

            fusion[fac].carreras[car].criterios[crit].sumatoria += pc.sumatoria;

            for (let n = 1; n <= 5; n++)
              fusion[fac].carreras[car].criterios[crit].cuentas[n] += pc.cuentas[n];
          }
        }
      }
    }

    return new Response(JSON.stringify(fusion), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
