import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { ESTADOS_ESTUDIANTE_HABILITADOS, obtenerEstudianteOFallar } from "../estudiantes/estudiantes.service.js";

function generarToken(): string {
  // Token opaco, no derivado del id_pae ni del id interno: el id_pae es
  // secuencial y predecible, y usarlo en el QR permitiría enumerar/falsificar
  // carnets de otros estudiantes.
  return randomBytes(32).toString("base64url");
}

function verificarEstudianteHabilitado(estudiante: { estado: string }) {
  if (!ESTADOS_ESTUDIANTE_HABILITADOS.includes(estudiante.estado as (typeof ESTADOS_ESTUDIANTE_HABILITADOS)[number])) {
    throw new HttpError(
      409,
      `No se puede emitir un QR para un estudiante en estado ${estudiante.estado}`,
    );
  }
}

export async function generarQr(estudianteId: string) {
  const estudiante = await obtenerEstudianteOFallar(estudianteId);
  verificarEstudianteHabilitado(estudiante);

  const existente = await prisma.qrCode.findUnique({ where: { estudianteId } });
  if (existente) {
    throw new HttpError(409, "El estudiante ya tiene un QR asignado; use reemitir si necesita uno nuevo");
  }

  for (let intento = 0; intento < 5; intento++) {
    try {
      return await prisma.qrCode.create({
        data: { estudianteId, token: generarToken() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new HttpError(409, "No se pudo generar un token de QR único, intente de nuevo");
}

export async function reemitirQr(estudianteId: string) {
  const estudiante = await obtenerEstudianteOFallar(estudianteId);
  verificarEstudianteHabilitado(estudiante);

  const actual = await prisma.qrCode.findUnique({ where: { estudianteId } });
  if (!actual) {
    throw new HttpError(404, "El estudiante no tiene un QR generado todavía");
  }

  for (let intento = 0; intento < 5; intento++) {
    try {
      return await prisma.qrCode.update({
        where: { estudianteId },
        data: { token: generarToken(), estado: "ACTIVO", versionCarnet: { increment: 1 } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new HttpError(409, "No se pudo reemitir el QR, intente de nuevo");
}

export async function revocarQr(estudianteId: string) {
  const actual = await prisma.qrCode.findUnique({ where: { estudianteId } });
  if (!actual) {
    throw new HttpError(404, "El estudiante no tiene un QR generado todavía");
  }
  if (actual.estado === "REVOCADO") {
    throw new HttpError(409, "El QR ya está revocado");
  }

  return prisma.qrCode.update({ where: { estudianteId }, data: { estado: "REVOCADO" } });
}

export async function obtenerQrDeEstudiante(estudianteId: string) {
  const qr = await prisma.qrCode.findUnique({ where: { estudianteId } });
  if (!qr) {
    throw new HttpError(404, "El estudiante no tiene un QR generado todavía");
  }
  return qr;
}

export async function generarImagenQr(estudianteId: string): Promise<string> {
  const qr = await obtenerQrDeEstudiante(estudianteId);
  if (qr.estado !== "ACTIVO") {
    throw new HttpError(409, "El QR de este estudiante está revocado, reemita uno nuevo antes de imprimir el carnet");
  }
  return QRCode.toDataURL(qr.token, { errorCorrectionLevel: "M", margin: 1 });
}

const estudianteResueltoSelect = {
  id: true,
  idPae: true,
  tipoIdentificador: true,
  nombres: true,
  apellidos: true,
  estado: true,
  sedeId: true,
  institucionId: true,
  gradoId: true,
  grupoId: true,
} as const;

export async function resolverToken(token: string) {
  const qr = await prisma.qrCode.findUnique({
    where: { token },
    include: { estudiante: { select: estudianteResueltoSelect } },
  });

  if (!qr) {
    throw new HttpError(404, "QR no reconocido");
  }
  if (qr.estado !== "ACTIVO") {
    throw new HttpError(409, "Este QR fue revocado; el portador debe solicitar un nuevo carnet");
  }

  return qr.estudiante;
}
