import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { hashToken } from "./hashToken.js";
import { verifyPassword } from "./password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  tokenExpiryDate,
  verifyRefreshToken,
} from "./tokens.js";

async function resolverPermisos(usuarioId: string, rolId: number): Promise<string[]> {
  const [permisosDelRol, overrides] = await Promise.all([
    prisma.rolPermiso.findMany({ where: { rolId }, include: { permiso: true } }),
    prisma.usuarioPermisoExtra.findMany({ where: { usuarioId }, include: { permiso: true } }),
  ]);

  const permisos = new Set(permisosDelRol.map((rp) => rp.permiso.codigo));
  for (const override of overrides) {
    if (override.tipo === "OTORGADO") {
      permisos.add(override.permiso.codigo);
    } else {
      permisos.delete(override.permiso.codigo);
    }
  }

  return [...permisos];
}

interface ResultadoAutenticacion {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    nombreCompleto: string;
    rol: string;
    permisos: string[];
  };
}

export async function login(
  usuarioLogin: string,
  password: string,
  dispositivoId?: string,
): Promise<ResultadoAutenticacion> {
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioLogin },
    include: { rol: true },
  });

  const credencialesValidas =
    usuario !== null && (await verifyPassword(usuario.passwordHash, password));

  if (!usuario || usuario.estado !== "ACTIVO" || !credencialesValidas) {
    throw new HttpError(401, "Usuario o contraseña incorrectos");
  }

  const permisos = await resolverPermisos(usuario.id, usuario.rolId);
  const accessToken = generateAccessToken({ sub: usuario.id, rol: usuario.rol.nombre, permisos });
  const refreshToken = generateRefreshToken(usuario.id);

  await prisma.sesionRefresco.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashToken(refreshToken),
      dispositivoId: dispositivoId ?? null,
      expiraEn: tokenExpiryDate(refreshToken),
    },
  });

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      rol: usuario.rol.nombre,
      permisos,
    },
  };
}

export async function refresh(
  refreshTokenRecibido: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshTokenRecibido);
  } catch {
    throw new HttpError(401, "Refresh token inválido o expirado");
  }

  const tokenHash = hashToken(refreshTokenRecibido);
  const sesion = await prisma.sesionRefresco.findUnique({ where: { tokenHash } });

  if (!sesion || sesion.revocadoEn || sesion.expiraEn < new Date()) {
    throw new HttpError(401, "Sesión inválida o revocada");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    include: { rol: true },
  });

  if (!usuario || usuario.estado !== "ACTIVO") {
    throw new HttpError(401, "Usuario inactivo");
  }

  const permisos = await resolverPermisos(usuario.id, usuario.rolId);
  const nuevoAccessToken = generateAccessToken({ sub: usuario.id, rol: usuario.rol.nombre, permisos });
  const nuevoRefreshToken = generateRefreshToken(usuario.id);

  await prisma.$transaction([
    prisma.sesionRefresco.update({
      where: { id: sesion.id },
      data: { revocadoEn: new Date() },
    }),
    prisma.sesionRefresco.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(nuevoRefreshToken),
        dispositivoId: sesion.dispositivoId,
        expiraEn: tokenExpiryDate(nuevoRefreshToken),
      },
    }),
  ]);

  return { accessToken: nuevoAccessToken, refreshToken: nuevoRefreshToken };
}

export async function logout(refreshTokenRecibido: string): Promise<void> {
  const tokenHash = hashToken(refreshTokenRecibido);
  await prisma.sesionRefresco.updateMany({
    where: { tokenHash, revocadoEn: null },
    data: { revocadoEn: new Date() },
  });
}
