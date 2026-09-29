import ExcelJS from "exceljs";
import type { Response } from "express";

// Los reportes anidan relaciones (ej. { estudiante: { idPae, nombres } })
// para que el JSON sea rico; Excel no tiene celdas anidadas, así que se
// aplanan a columnas "estudiante_idPae", "estudiante_nombres", etc.
function aplanarFila(valor: Record<string, unknown>, prefijo = ""): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};
  for (const [clave, dato] of Object.entries(valor)) {
    const nombreColumna = prefijo ? `${prefijo}_${clave}` : clave;
    if (dato instanceof Date) {
      resultado[nombreColumna] = dato.toISOString();
    } else if (dato !== null && typeof dato === "object" && !Array.isArray(dato)) {
      Object.assign(resultado, aplanarFila(dato as Record<string, unknown>, nombreColumna));
    } else {
      resultado[nombreColumna] = dato;
    }
  }
  return resultado;
}

export async function enviarComoExcel(
  res: Response,
  nombreHoja: string,
  filasOriginales: Record<string, unknown>[],
): Promise<void> {
  const filas = filasOriginales.map((fila) => aplanarFila(fila));
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet(nombreHoja.slice(0, 31));

  if (filas.length > 0) {
    hoja.columns = Object.keys(filas[0]).map((clave) => ({ header: clave, key: clave, width: 20 }));
    hoja.addRows(filas);
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${nombreHoja}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}
