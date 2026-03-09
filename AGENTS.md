# AGENTS.md
## Proposito
- Este repositorio es un sistema de fichas clinicas con frontend React + Vite en `frontend/` y backend NestJS + Prisma en `backend/`.
- Prioriza cambios pequenos y acotados que preserven integridad de registros, auditoria, soft delete y control por roles.
- No existen reglas de Cursor en `.cursor/rules/`, no existe `.cursorrules` y no existe `.github/copilot-instructions.md`.

## Estructura Del Repositorio
- `frontend/`: React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind.
- `backend/`: NestJS 11, TypeScript, Prisma, PostgreSQL, JWT, MFA y generacion de PDF.
- `backend/prisma/schema.prisma`: fuente principal de modelos y enums.
- `backend/test/`: configuracion e2e de Jest y pruebas end-to-end.
- `README.md`: contexto del producto, instalacion, variables de entorno y reglas del dominio.

## Reglas Generales Para Agentes
- Lee el archivo y su contexto cercano antes de editar; el frontend tiene algo de deriva de estilo.
- Respeta el estilo dominante del archivo que toques en vez de reformatear codigo no relacionado.
- Mantiene cambios estrechos; evita refactors amplios salvo que se pidan explicitamente.
- No cambies lenguaje legal/compliance, nombres de roles, comportamiento de auditoria o semantica de borrado salvo indicacion explicita.
- Asume que el soft delete es intencional; no lo reemplaces por hard delete.
- Ejecuta comandos desde `frontend/` o `backend/`; no existe un runner unico en la raiz.

## Instalacion Y Ejecucion
### Frontend
- Instalar dependencias: `npm install`
- Servidor de desarrollo: `npm run dev`
- Build de produccion: `npm run build`
- Lint: `npm run lint`
- Vista previa del build: `npm run preview`

### Backend
- Instalar dependencias: `npm install`
- Servidor de desarrollo: `npm run start:dev`
- Servidor de desarrollo con debug: `npm run start:debug`
- Build de produccion: `npm run build`
- Ejecutar build compilado: `npm run start:prod`
- Formatear fuentes del backend: `npm run format`
- Lint con auto-fix: `npm run lint`
- Seed de base de datos: `npm run seed`

## Comandos De Pruebas
### Suite De Backend
- Ejecutar todas las pruebas unitarias: `npm run test`
- Ejecutar pruebas unitarias en watch: `npm run test:watch`
- Cobertura: `npm run test:cov`
- Debug de pruebas en serie: `npm run test:debug`
- Ejecutar todas las pruebas e2e: `npm run test:e2e`

### Ejecutar Un Solo Archivo De Prueba
- Comando preferido para un unit test: `npm run test -- app.controller.spec.ts`
- Equivalente directo con Jest: `npx jest src/app.controller.spec.ts`
- Comando preferido para un e2e: `npm run test:e2e -- app.e2e-spec.ts`
- Equivalente directo e2e: `npx jest --config ./test/jest-e2e.json test/app.e2e-spec.ts`

### Ejecutar Una Sola Prueba Por Nombre
- Unit test por nombre: `npm run test -- -t "should return \"Hello World!\""`
- E2E por nombre: `npm run test:e2e -- -t "AppController (e2e)"`

### Pruebas Del Frontend
- Actualmente no hay runner de pruebas configurado en `frontend/package.json`.
- No agregues Vitest o Jest salvo que la tarea incluya incorporar esa herramienta.
- Para cambios solo de frontend, como minimo ejecuta `npm run lint` y `npm run build` en `frontend/`.

## Base De Datos Y Prisma
- Prisma usa PostgreSQL y lee `DATABASE_URL` desde variables de entorno.
- Los cambios de esquema normalmente requieren `npx prisma generate` y `npx prisma migrate dev --name <cambio>` desde `backend/`.
- Si necesitas regenerar datos locales despues de un cambio de esquema, usa `npm run seed`.
- Mantiene nombres de modelos Prisma en singular y PascalCase, siguiendo la convencion actual.

## Guia De Estilo Del Frontend
- Usa TypeScript en todo; `frontend/tsconfig.app.json` es estricto y rechaza locales o parametros sin uso.
- Prefiere componentes funcionales y hooks; no hay class components.
- Mantiene el enrutado en `frontend/src/App.tsx` y las paginas en `frontend/src/pages/`.
- Mantiene el estado global de autenticacion en contexto; la logica actual vive en `frontend/src/context/AuthContext.tsx`.
- Prefiere TanStack Query para datos remotos y mutaciones en vez de fetch manual con `useEffect`.
- Prefiere React Hook Form + Zod para formularios no triviales.
- Usa imports relativos; no hay aliases de paths configurados.
- Usa `import type` para imports solo de tipos cuando sea practico.
- No dejes imports sin uso; el lint del frontend fallara.

## Formato Y Nombres En Frontend
- El formato del frontend no esta totalmente estandarizado; algunos archivos usan punto y coma y otros no.
- Respeta el estilo dominante del archivo en vez de normalizar masivamente.
- Usa PascalCase para componentes, paginas y providers.
- Usa camelCase para variables, funciones, helpers, props y hooks.
- Usa UPPER_SNAKE_CASE para constantes reales, como tablas de opciones tipo `ROLES`.
- Mantiene helpers reutilizables cerca del componente salvo que se compartan ampliamente.
- Prefiere nombres descriptivos como `handleSearch`, `handleDelete`, `onSubmit` y `onMfaSubmit`.

## Manejo De Errores Y UI En Frontend
- Captura fallos de API y muestra mensajes amigables en espanol, alineados con el copy existente.
- Conserva el comportamiento actual del `401` en `frontend/src/api/client.ts`: limpiar autenticacion y redirigir a `/login`.
- Cuando Axios entregue un mensaje del backend, prefierelo si es seguro y usa un fallback razonable.
- Evita fallos silenciosos salvo que la UI este disenada para degradar de forma controlada.
- Reutiliza patrones existentes de Tailwind y clases utilitarias en vez de inventar un sistema visual nuevo.
- Clases compartidas actuales: `input-field`, `btn-primary`, `btn-secondary`, `card` y `sidebar-link`.
- Conserva comportamiento responsive; los layouts actuales ya contemplan desktop y mobile.
- Mantiene nuevas etiquetas, validaciones y mensajes en espanol salvo que la UI circundante este en ingles.

## Guia De Estilo Del Backend
- Sigue la estructura actual de Nest: controller + service + dto + module.
- Usa clases DTO con decoradores de `class-validator` para validar requests.
- Mantiene controllers delgados y mueve la logica de negocio a services.
- Usa excepciones de Nest como `UnauthorizedException`, `ForbiddenException` y `NotFoundException` en vez de errores genericos.
- Prefiere metodos async y acceso a datos via Prisma a traves de `PrismaService`.
- Mantiene checks de roles, guards y auditoria alineados con el diseno actual de autenticacion.

## Imports, Formato Y Tipos En Backend
- El formato del backend esta estandarizado con Prettier: comillas simples y trailing commas.
- Los archivos del backend usan punto y coma de forma consistente; mantenlos.
- Importa primero Nest y paquetes externos, luego modulos internos.
- Usa imports relativos en modulos internos; no hay convencion de aliases.
- `@typescript-eslint/no-explicit-any` esta desactivada, pero evita `any` cuando sea facil escribir un tipo adecuado.
- `@typescript-eslint/no-floating-promises` es solo warning, pero aun asi espera o maneja las promesas explicitamente.
- Mantiene enums en DTOs o archivos cercanos al esquema cuando pertenezcan a validacion de request o dominio.

## Nombres Y Reglas De Datos En Backend
- Usa PascalCase para DTOs, services, modules, guards, decorators y enums.
- Usa camelCase para metodos, servicios inyectados, propiedades de DTO y variables locales.
- Mantiene recursos REST alineados con controllers actuales como `patients`, `consultations`, `users` y `auth`.
- Los roles son strings tipo enum en mayusculas: `ADMIN`, `DIRECTOR`, `COORDINATOR`, `THERAPIST`.
- Apoyate en el `ValidationPipe` global de `backend/src/main.ts` para validacion de requests.
- Conserva filtros de soft delete con `deletedAt: null` salvo que la tarea requiera ver archivados.
- Ten cuidado con conversiones de fecha; varios services convierten strings DTO con `new Date(...)` antes de persistir.
- No debilites CORS, JWT, MFA o auditoria salvo que se pida explicitamente.

## Expectativas De Verificacion
- Cambio solo de backend: ejecuta `npm run lint` y la prueba backend mas relevante.
- Cambio solo de frontend: ejecuta `npm run lint` y `npm run build` en `frontend/`.
- Cambio full-stack que toque contratos o autenticacion: ejecuta build del frontend, lint del backend y pruebas backend relevantes.
- Si no puedes ejecutar un comando, indicalo claramente y deja el comando exacto a correr.

## Zonas De Mayor Riesgo
- `backend/src/modules/auth/`: login, JWT, MFA y manejo de credenciales.
- `backend/src/common/` y `backend/src/modules/audit/`: autorizacion y auditoria.
- `backend/prisma/schema.prisma`: cambios de esquema o enums afectan API, seeds y migraciones.
- `frontend/src/api/client.ts`: base URL e interceptor global de autenticacion.
- Cualquier codigo que cambie visibilidad de pacientes, historial clinico, borrado o exportacion de reportes.

## Consejos Practicos Para Agentes
- Decide primero si la tarea corresponde a frontend, backend o ambos; el repo no funciona como paquete unico.
- Si cambias contratos de API, actualiza tanto DTO/service/controller en backend como la pagina o formulario consumidor en frontend.
- Prefiere parches minimos sobre limpiezas amplias.
- Agrega pruebas si tocas logica de backend que ya tiene o claramente necesita cobertura.
- No agregues un formatter, linter o framework de testing nuevo salvo pedido explicito.
