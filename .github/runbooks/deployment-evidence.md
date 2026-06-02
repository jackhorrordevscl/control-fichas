# Runbook de evidencia de despliegue

## Objetivo

Dejar evidencia verificable de que el sistema fue desplegado con la configuración esperada en Render, Vercel y la base de datos administrada.

## Alcance

- Backend NestJS en Render.
- Frontend Vite/React en Vercel.
- PostgreSQL administrado.
- Migraciones Prisma aplicadas.
- Backups y cifrado verificados.
- Cookies de sesión y CSRF funcionando.

## Evidencia mínima a recolectar

1. URL pública de backend y frontend.
2. Captura o export de variables de entorno activas por entorno.
3. Salida de `prisma migrate status` después del deploy.
4. Registro de versión desplegada o commit SHA.
5. Prueba funcional de login, `/auth/me`, subida de documento y descarga.
6. Verificación de cookies:
   - `umbral_access_token`
   - `umbral_csrf_token`
7. Verificación de backup cifrado y retención.
8. Verificación de checksum/manifest con `npm --prefix backend run verify:backup`.

## Checklist backend

- [ ] `prisma migrate deploy` completado sin drift.
- [ ] `npm run build` exitoso en el entorno de release.
- [ ] `JWT_SECRET`, `FILE_ENCRYPTION_KEY` y `BACKUP_ENCRYPTION_KEY` provistos por el gestor de secretos.
- [ ] CORS configurado con el host del frontend.
- [ ] `SameSite` de cookies alineado al entorno.
- [ ] CSRF validado en mutaciones protegidas.
- [ ] `verify:backup` ejecutado contra el último backup generado.

## Checklist frontend

- [ ] `VITE_API_URL` apunta al backend correcto.
- [ ] Login y restauración de sesión funcionan con cookie.
- [ ] El interceptor Axios envía `X-CSRF-Token` en mutaciones.
- [ ] No hay dependencia de `localStorage` para tokens de acceso.

## Checklist de base de datos

- [ ] Migraciones aplicadas.
- [ ] Esquema coincide con el último `schema.prisma`.
- [ ] Eventos de auditoría y consentimientos insertan correctamente.

## Checklist de documentación

- [ ] Este runbook fue adjuntado al cambio.
- [ ] [policies.md](../policies.md) actualizado.
- [ ] [keys-and-s3.md](../keys-and-s3.md) actualizado.
- [ ] Evidencia firmada por responsable técnico.

## Criterio de cierre

El despliegue queda acreditado solo si hay evidencia de entorno, pruebas funcionales y migraciones aplicadas. Sin eso, el estado debe marcarse como "desplegado técnicamente" pero no "acreditado".
