import ExcelJS from "exceljs";
import type { TipoCambioImportacion } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import type { ContextoActor } from "../auditoria/auditoria.service.js";
import { registrarAuditoria } from "../auditoria/auditoria.service.js";

// Columnas que el archivo exportado por SIMAT siempre trae, identificadas
// por nombre (no por posición: el orden de columnas puede variar entre
// cortes, pero estos encabezados son estándar del Ministerio).
const COLUMNAS_REQUERIDAS = [
  "ESTADO",
  "JERARQUIA",
  "INSTITUCION",
  "DANE",
  "SEDE",
  "CODIGO_DANE_SEDE",
  "DOC",
  "TIPODOC",
  "APELLIDO1",
  "APELLIDO2",
  "NOMBRE1",
  "NOMBRE2",
  "GENERO",
  "FECHA_NACIMIENTO",
] as const;

interface FilaParseada {
  fila: number;
  doc: string;
  documentoTipo: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date | null;
  genero: string | null;
  zonaNombre: string;
  institucionNombre: string;
  institucionDane: string;
  sedeNombre: string;
  sedeDane: string;
}

interface FilaInvalida {
  fila: number;
  motivo: string;
}

function textoCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object" && "result" in (valor as Record<string, unknown>)) {
    // Celdas con fórmula: exceljs expone { result, formula }.
    return String((valor as { result: unknown }).result ?? "").trim();
  }
  return String(valor).trim();
}

function fechaCelda(valor: unknown): Date | null {
  if (valor instanceof Date) return valor;
  if (typeof valor === "string" && valor.trim()) {
    const parsed = new Date(valor);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function hojaSimat(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const hoja = workbook.worksheets.find((ws) => /^SIMAT-/i.test(ws.name.trim()));
  if (!hoja) {
    throw new HttpError(
      400,
      "El archivo no tiene una hoja cuyo nombre empiece con 'SIMAT-' (el formato estándar del corte, ej. 'SIMAT-01-08-2026')",
    );
  }
  return hoja;
}

function mapaColumnas(hoja: ExcelJS.Worksheet): Record<string, number> {
  const encabezado = hoja.getRow(1);
  const mapa: Record<string, number> = {};
  for (let c = 1; c <= hoja.columnCount; c++) {
    const nombre = textoCelda(encabezado.getCell(c).value).toUpperCase();
    if (nombre) mapa[nombre] = c;
  }
  const faltantes = COLUMNAS_REQUERIDAS.filter((col) => !(col in mapa));
  if (faltantes.length > 0) {
    throw new HttpError(400, `La hoja SIMAT no tiene las columnas esperadas: ${faltantes.join(", ")}`);
  }
  return mapa;
}

function parsearFilas(hoja: ExcelJS.Worksheet, columnas: Record<string, number>) {
  const validas: FilaParseada[] = [];
  const invalidas: FilaInvalida[] = [];

  const celda = (row: ExcelJS.Row, nombreCol: string) => row.getCell(columnas[nombreCol]).value;

  for (let r = 2; r <= hoja.rowCount; r++) {
    const row = hoja.getRow(r);
    const doc = textoCelda(celda(row, "DOC"));
    const institucionDane = textoCelda(celda(row, "DANE"));
    const sedeDane = textoCelda(celda(row, "CODIGO_DANE_SEDE"));
    const nombre1 = textoCelda(celda(row, "NOMBRE1"));
    const apellido1 = textoCelda(celda(row, "APELLIDO1"));
    const estado = textoCelda(celda(row, "ESTADO")).toUpperCase();

    // Fila totalmente vacía (relleno al final de la hoja): se ignora en
    // silencio, no es un error del archivo.
    if (!doc && !institucionDane && !sedeDane && !nombre1 && !apellido1) continue;

    if (estado !== "MATRICULADO") {
      invalidas.push({ fila: r, motivo: `Estado '${estado || "(vacío)"}' no es MATRICULADO, se omite` });
      continue;
    }
    if (!doc) {
      invalidas.push({ fila: r, motivo: "Sin número de documento (columna DOC)" });
      continue;
    }
    if (!nombre1 || !apellido1) {
      invalidas.push({ fila: r, motivo: "Sin nombre o apellido" });
      continue;
    }
    if (!institucionDane || !sedeDane) {
      invalidas.push({ fila: r, motivo: "Sin código DANE de institución o de sede" });
      continue;
    }

    const tipoDocCrudo = textoCelda(celda(row, "TIPODOC"));
    const documentoTipo = tipoDocCrudo.includes(":") ? tipoDocCrudo.split(":")[0]!.trim() : tipoDocCrudo;
    const nombre2 = textoCelda(celda(row, "NOMBRE2"));
    const apellido2 = textoCelda(celda(row, "APELLIDO2"));

    validas.push({
      fila: r,
      doc,
      documentoTipo: documentoTipo || "NO_INFORMADO",
      nombres: [nombre1, nombre2].filter(Boolean).join(" "),
      apellidos: [apellido1, apellido2].filter(Boolean).join(" "),
      fechaNacimiento: fechaCelda(celda(row, "FECHA_NACIMIENTO")),
      genero: textoCelda(celda(row, "GENERO")) || null,
      zonaNombre: textoCelda(celda(row, "JERARQUIA")) || "SIN ZONA",
      institucionNombre: textoCelda(celda(row, "INSTITUCION")),
      institucionDane,
      sedeNombre: textoCelda(celda(row, "SEDE")),
      sedeDane,
    });
  }

  return { validas, invalidas };
}

/** Resuelve (o crea) zona/institución/sede por código DANE, con caché en
 * memoria: un corte SIMAT trae miles de filas pero solo decenas de sedes
 * distintas, así que cachear evita repetir la misma consulta miles de veces. */
async function resolverEstructura(filas: FilaParseada[]) {
  const zonaCache = new Map<string, number>();
  const institucionCache = new Map<string, number>();
  const sedeCache = new Map<string, { id: number; institucionId: number }>();

  const porInstitucionDane = new Map<string, FilaParseada>();
  const porSedeDane = new Map<string, FilaParseada>();
  for (const fila of filas) {
    porInstitucionDane.set(fila.institucionDane, fila);
    porSedeDane.set(fila.sedeDane, fila);
  }

  for (const fila of filas) {
    if (!zonaCache.has(fila.zonaNombre)) {
      const zona =
        (await prisma.zonaEducativa.findUnique({ where: { nombre: fila.zonaNombre } })) ??
        (await prisma.zonaEducativa.create({ data: { nombre: fila.zonaNombre } }));
      zonaCache.set(fila.zonaNombre, zona.id);
    }
  }

  for (const [dane, fila] of porInstitucionDane) {
    const existente = await prisma.institucion.findUnique({ where: { codigoDane: dane } });
    if (existente) {
      institucionCache.set(dane, existente.id);
      continue;
    }
    const creada = await prisma.institucion.create({
      data: { nombre: fila.institucionNombre, codigoDane: dane, zonaId: zonaCache.get(fila.zonaNombre)! },
    });
    institucionCache.set(dane, creada.id);
  }

  for (const [dane, fila] of porSedeDane) {
    const existente = await prisma.sede.findUnique({ where: { codigoDaneSede: dane } });
    if (existente) {
      sedeCache.set(dane, { id: existente.id, institucionId: existente.institucionId });
      continue;
    }
    const creada = await prisma.sede.create({
      data: {
        nombre: fila.sedeNombre,
        codigoDaneSede: dane,
        institucionId: institucionCache.get(fila.institucionDane)!,
      },
    });
    sedeCache.set(dane, { id: creada.id, institucionId: creada.institucionId });
  }

  return { institucionCache, sedeCache };
}

const CAMPOS_COMPARABLES = ["nombres", "apellidos", "fechaNacimiento", "documentoTipo", "genero"] as const;

function compararCampos(
  actual: Record<string, unknown>,
  nuevo: Record<string, unknown>,
): { campo: string; valorAnterior: string | null; valorNuevo: string | null }[] {
  const cambios: { campo: string; valorAnterior: string | null; valorNuevo: string | null }[] = [];
  for (const campo of CAMPOS_COMPARABLES) {
    const anterior = actual[campo];
    const nuevoValor = nuevo[campo];
    const anteriorTexto =
      anterior instanceof Date ? anterior.toISOString().slice(0, 10) : anterior == null ? null : String(anterior);
    const nuevoTexto =
      nuevoValor instanceof Date ? nuevoValor.toISOString().slice(0, 10) : nuevoValor == null ? null : String(nuevoValor);
    if (anteriorTexto !== nuevoTexto) {
      cambios.push({ campo, valorAnterior: anteriorTexto, valorNuevo: nuevoTexto });
    }
  }
  return cambios;
}

function chunk<T>(items: T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) grupos.push(items.slice(i, i + tamano));
  return grupos;
}

export async function procesarArchivo(buffer: Buffer, nombreArchivo: string, actor: ContextoActor) {
  const workbook = new ExcelJS.Workbook();
  // El tipo de `buffer` del Buffer global (genérico sobre ArrayBufferLike en
  // @types/node reciente) no encaja estructuralmente con el Buffer no
  // genérico que declara exceljs; en runtime es el mismo objeto Buffer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const hoja = hojaSimat(workbook);
  const columnas = mapaColumnas(hoja);
  const { validas, invalidas } = parsearFilas(hoja, columnas);

  const { institucionCache, sedeCache } = await resolverEstructura(validas);

  const existentes = await prisma.estudiante.findMany({
    where: { origen: "SIMAT" },
    select: {
      id: true,
      documentoNumero: true,
      nombres: true,
      apellidos: true,
      fechaNacimiento: true,
      documentoTipo: true,
      genero: true,
      sedeId: true,
      institucionId: true,
      estado: true,
    },
  });
  const existentesPorDoc = new Map(existentes.filter((e) => e.documentoNumero).map((e) => [e.documentoNumero!, e]));
  const vistos = new Set<string>();

  type DetalleAInsertar = {
    estudianteId: string | null;
    tipoCambio: TipoCambioImportacion;
    detalle: Record<string, unknown>;
  };
  const detalles: DetalleAInsertar[] = [];

  let nuevos = 0;
  let actualizados = 0;
  let trasladados = 0;
  let sinCambios = 0;

  for (const fila of validas) {
    const sede = sedeCache.get(fila.sedeDane)!;
    const institucionId = institucionCache.get(fila.institucionDane)!;
    const existente = existentesPorDoc.get(fila.doc);

    if (!existente) {
      nuevos++;
      detalles.push({
        estudianteId: null,
        tipoCambio: "NUEVO",
        detalle: {
          fila: fila.fila,
          documentoTipo: fila.documentoTipo,
          documentoNumero: fila.doc,
          nombres: fila.nombres,
          apellidos: fila.apellidos,
          fechaNacimiento: fila.fechaNacimiento?.toISOString() ?? null,
          genero: fila.genero,
          sedeId: sede.id,
          institucionId,
        },
      });
      continue;
    }

    vistos.add(fila.doc);
    const huboTraslado = existente.sedeId !== sede.id;
    const cambiosCampos = compararCampos(existente, {
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      fechaNacimiento: fila.fechaNacimiento,
      documentoTipo: fila.documentoTipo,
      genero: fila.genero,
    });

    if (huboTraslado) {
      trasladados++;
      detalles.push({
        estudianteId: existente.id,
        tipoCambio: "TRASLADADO",
        detalle: {
          fila: fila.fila,
          cambios: cambiosCampos,
          sedeAnteriorId: existente.sedeId,
          institucionAnteriorId: existente.institucionId,
          sedeNuevaId: sede.id,
          institucionNuevaId: institucionId,
        },
      });
    } else if (cambiosCampos.length > 0) {
      actualizados++;
      detalles.push({
        estudianteId: existente.id,
        tipoCambio: "ACTUALIZADO",
        detalle: { fila: fila.fila, cambios: cambiosCampos },
      });
    } else {
      sinCambios++;
      detalles.push({ estudianteId: existente.id, tipoCambio: "SIN_CAMBIO", detalle: { fila: fila.fila } });
    }
  }

  for (const existente of existentes) {
    if (existente.estado === "ACTIVO" && existente.documentoNumero && !vistos.has(existente.documentoNumero)) {
      detalles.push({ estudianteId: existente.id, tipoCambio: "RETIRADO", detalle: {} });
    }
  }

  const importacion = await prisma.importacionSimat.create({
    data: {
      usuarioId: actor.usuarioId!,
      archivoNombre: nombreArchivo,
      totalRecibidos: validas.length,
      nuevos,
      actualizados,
      retirados: detalles.filter((d) => d.tipoCambio === "RETIRADO").length,
      trasladados,
      sinCambios,
      errores: invalidas.length,
    },
  });

  for (const grupo of chunk(detalles, 1000)) {
    await prisma.importacionDetalle.createMany({
      data: grupo.map((d) => ({
        importacionId: importacion.id,
        estudianteId: d.estudianteId,
        tipoCambio: d.tipoCambio,
        detalle: d.detalle as never,
      })),
    });
  }
  for (const grupo of chunk(invalidas, 1000)) {
    await prisma.importacionDetalle.createMany({
      data: grupo.map((inv) => ({
        importacionId: importacion.id,
        tipoCambio: "ERROR" as const,
        detalle: { fila: inv.fila, motivo: inv.motivo } as never,
      })),
    });
  }

  await registrarAuditoria({
    accion: "importacion_simat.procesar",
    entidad: "ImportacionSimat",
    entidadId: String(importacion.id),
    valorNuevo: {
      archivoNombre: nombreArchivo,
      totalRecibidos: validas.length,
      nuevos,
      actualizados,
      retirados: detalles.filter((d) => d.tipoCambio === "RETIRADO").length,
      trasladados,
      sinCambios,
      errores: invalidas.length,
    },
    actor,
  });

  return importacion;
}

export async function listarImportaciones() {
  return prisma.importacionSimat.findMany({
    orderBy: { fechaImportacion: "desc" },
    include: { usuario: { select: { id: true, nombreCompleto: true } } },
  });
}

export async function obtenerImportacionOFallar(id: number) {
  const importacion = await prisma.importacionSimat.findUnique({ where: { id } });
  if (!importacion) {
    throw new HttpError(404, "Importación no encontrada");
  }
  return importacion;
}

export async function obtenerDetalleImportacion(
  id: number,
  filtros: { tipoCambio?: TipoCambioImportacion; limit: number; offset: number },
) {
  const importacion = await obtenerImportacionOFallar(id);
  const detalles = filtros.tipoCambio
    ? await prisma.importacionDetalle.findMany({
        where: { importacionId: id, tipoCambio: filtros.tipoCambio },
        take: filtros.limit,
        skip: filtros.offset,
        include: { estudiante: { select: { id: true, nombres: true, apellidos: true, documentoNumero: true } } },
      })
    : [];
  return { importacion, detalles };
}

export async function aplicarImportacion(id: number, actor: ContextoActor) {
  const importacion = await obtenerImportacionOFallar(id);
  if (importacion.estado !== "PENDIENTE_REVISION") {
    throw new HttpError(409, `Esta importación ya está en estado ${importacion.estado}, no se puede volver a aplicar`);
  }

  const detalles = await prisma.importacionDetalle.findMany({ where: { importacionId: id } });
  const nuevos = detalles.filter((d) => d.tipoCambio === "NUEVO");
  const actualizados = detalles.filter((d) => d.tipoCambio === "ACTUALIZADO");
  const trasladados = detalles.filter((d) => d.tipoCambio === "TRASLADADO");
  const retirados = detalles.filter((d) => d.tipoCambio === "RETIRADO");

  // idPae secuencial: se calcula una sola vez el punto de partida y se
  // incrementa en memoria, en vez de volver a contar en cada creación (con
  // miles de estudiantes nuevos esa sería una consulta por fila).
  const anio = new Date().getFullYear();
  const totalPaeExistentes = await prisma.estudiante.count({
    where: { idPae: { startsWith: `PAE-${anio}-` }, esCapacitacion: false },
  });
  let siguienteConsecutivo = totalPaeExistentes + 1;

  await prisma.$transaction(async (tx) => {
    for (const grupo of chunk(nuevos, 500)) {
      await tx.estudiante.createMany({
        data: grupo.map((d) => {
          const datos = d.detalle as Record<string, unknown>;
          const idPae = `PAE-${anio}-${String(siguienteConsecutivo++).padStart(6, "0")}`;
          return {
            idPae,
            tipoIdentificador: "PAE",
            origen: "SIMAT",
            documentoTipo: datos.documentoTipo as string,
            documentoNumero: datos.documentoNumero as string,
            nombres: datos.nombres as string,
            apellidos: datos.apellidos as string,
            fechaNacimiento: datos.fechaNacimiento ? new Date(datos.fechaNacimiento as string) : null,
            genero: datos.genero as string | null,
            sedeId: datos.sedeId as number,
            institucionId: datos.institucionId as number,
          };
        }),
        skipDuplicates: true,
      });
    }

    for (const d of actualizados) {
      const datos = d.detalle as { cambios: { campo: string; valorAnterior: string | null; valorNuevo: string | null }[] };
      const dataUpdate: Record<string, unknown> = {};
      for (const cambio of datos.cambios) {
        dataUpdate[cambio.campo] = cambio.campo === "fechaNacimiento" && cambio.valorNuevo ? new Date(cambio.valorNuevo) : cambio.valorNuevo;
      }
      await tx.estudiante.update({ where: { id: d.estudianteId! }, data: dataUpdate });
      await tx.historicoEstudiante.createMany({
        data: datos.cambios.map((c) => ({
          estudianteId: d.estudianteId!,
          campo: c.campo,
          valorAnterior: c.valorAnterior,
          valorNuevo: c.valorNuevo,
          origen: "IMPORT_SIMAT",
          importacionId: id,
          usuarioId: actor.usuarioId,
        })),
      });
    }

    for (const d of trasladados) {
      const datos = d.detalle as {
        cambios: { campo: string; valorAnterior: string | null; valorNuevo: string | null }[];
        sedeAnteriorId: number;
        institucionAnteriorId: number;
        sedeNuevaId: number;
        institucionNuevaId: number;
      };
      if (datos.cambios.length > 0) {
        const dataUpdate: Record<string, unknown> = {};
        for (const cambio of datos.cambios) {
          dataUpdate[cambio.campo] =
            cambio.campo === "fechaNacimiento" && cambio.valorNuevo ? new Date(cambio.valorNuevo) : cambio.valorNuevo;
        }
        await tx.estudiante.update({ where: { id: d.estudianteId! }, data: dataUpdate });
        await tx.historicoEstudiante.createMany({
          data: datos.cambios.map((c) => ({
            estudianteId: d.estudianteId!,
            campo: c.campo,
            valorAnterior: c.valorAnterior,
            valorNuevo: c.valorNuevo,
            origen: "IMPORT_SIMAT",
            importacionId: id,
            usuarioId: actor.usuarioId,
          })),
        });
      }
      // La sede/institución del estudiante NO se toca aquí: el traslado
      // queda PENDIENTE para revisión y confirmación explícita (fuera de
      // alcance de esta fase), igual que marca el modelo `Traslado`.
      await tx.traslado.create({
        data: {
          estudianteId: d.estudianteId!,
          sedeAnteriorId: datos.sedeAnteriorId,
          institucionAnteriorId: datos.institucionAnteriorId,
          sedeNuevaId: datos.sedeNuevaId,
          institucionNuevaId: datos.institucionNuevaId,
          importacionId: id,
        },
      });
    }

    for (const d of retirados) {
      const actual = await tx.estudiante.findUniqueOrThrow({ where: { id: d.estudianteId! } });
      await tx.estudiante.update({ where: { id: d.estudianteId! }, data: { estado: "RETIRADO" } });
      await tx.historicoEstudiante.create({
        data: {
          estudianteId: d.estudianteId!,
          campo: "estado",
          valorAnterior: actual.estado,
          valorNuevo: "RETIRADO",
          origen: "IMPORT_SIMAT",
          importacionId: id,
          usuarioId: actor.usuarioId,
        },
      });
      await tx.novedad.create({
        data: {
          estudianteId: d.estudianteId!,
          sedeId: actual.sedeId,
          tipo: "RETIRO",
          descripcion: `Retirado automáticamente: no aparece como MATRICULADO en la importación SIMAT #${id}`,
          usuarioId: actor.usuarioId!,
        },
      });
    }

    await tx.importacionSimat.update({ where: { id }, data: { estado: "APLICADA" } });
  });

  await registrarAuditoria({
    accion: "importacion_simat.aplicar",
    entidad: "ImportacionSimat",
    entidadId: String(id),
    valorNuevo: { nuevos: nuevos.length, actualizados: actualizados.length, trasladados: trasladados.length, retirados: retirados.length },
    actor,
  });

  return obtenerImportacionOFallar(id);
}

export async function descartarImportacion(id: number, actor: ContextoActor) {
  const importacion = await obtenerImportacionOFallar(id);
  if (importacion.estado !== "PENDIENTE_REVISION") {
    throw new HttpError(409, `Esta importación ya está en estado ${importacion.estado}, no se puede descartar`);
  }

  const actualizada = await prisma.importacionSimat.update({ where: { id }, data: { estado: "DESCARTADA" } });

  await registrarAuditoria({
    accion: "importacion_simat.descartar",
    entidad: "ImportacionSimat",
    entidadId: String(id),
    valorNuevo: { estado: "DESCARTADA" },
    actor,
  });

  return actualizada;
}
