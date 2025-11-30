// utils-normalizacion.ts
export function normalizarFacultadOCarrera(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")    // quitar tildes
    .replace(/\d+/g, "")                                 // quitar números
    .replace(/\s+/g, " ")                                 // dobles espacios
    .trim()                                               // quitar espacios inicio/final
    .toUpperCase();                                       // upper
}

export function normalizarCriterio(str: string): string {
  if (!str) return "";
  return str
    .replace(/^\d+\)\s*/, "")         // quitar "n) "
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")     // quitar tildes
    .replace(/\s+/g, " ")                                  // dobles espacios
    .trim();                                               // quitar espacios inicio/final
}

export function extraerNumeroEstrella(valor: string): number | null {
  if (!valor) return null;
  const m = valor.match(/^([1-5])\D*$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}
