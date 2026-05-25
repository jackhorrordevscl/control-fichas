# Backend Umbral SpA

API clínica construida con NestJS 11, Prisma 7.8 y PostgreSQL.

## Stack real

- NestJS 11
- Prisma 7.8 con `@prisma/adapter-pg`
- PostgreSQL
- JWT + Passport
- Argon2
- Speakeasy + QRCode para MFA
- PDFKit para reportes

## Comandos

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run build
npm run start:dev
npm run test
npm run test:e2e
npm run seed
```

## Variables principales

El backend espera un archivo `.env` con al menos estos valores:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/base"
JWT_SECRET="secreto-seguro"
JWT_EXPIRES_IN="8h"
MFA_APP_NAME="Umbral SpA"
FRONTEND_URL="http://localhost:5173"
ADMIN_EMAIL="admin@umbral.cl"
ADMIN_PASSWORD="clave-segura"
ADMIN_NAME="Administrador Umbral"
```

## Notas operativas

- `prisma.config.ts` gobierna la conexión de Prisma.
- El seed del administrador ya no usa una contraseña hardcodeada: requiere `ADMIN_PASSWORD`.
- `AuditLog` es append-only a nivel de PostgreSQL.
- Las correcciones de consultas crean una nueva versión vigente y no sobreescriben el registro original.
- Toda consulta requiere consentimiento informado firmado; `TELEMED` además exige consentimiento de telemedicina.

## Despliegue seguro de migraciones

Para bases activas, especialmente la instancia productiva ya desplegada en Supabase, el flujo recomendado es explícito y no destructivo:

```bash
npm run prisma:migrate:status
npm run prisma:migrate:deploy
```

Consideraciones mínimas antes de correrlo:

- Confirma que `DATABASE_URL` apunta al entorno correcto antes de ejecutar cualquier comando.
- Genera snapshot o respaldo previo desde la plataforma si vas a tocar producción.
- Usa `prisma migrate deploy` en staging o producción; no uses `prisma migrate dev` contra una base real.
- Evita ejecutar localmente estos comandos con credenciales productivas salvo que sea un procedimiento controlado.
- En este proyecto, la migración pendiente agrega el campo obligatorio `reason` a `ConsultationHistory` con un valor por defecto, por lo que el cambio esperado es aditivo.

## Render

Si despliegas el backend en Render, el servicio debe ejecutar migraciones explícitamente antes de iniciar la app. Si no lo hace, puede quedar código nuevo corriendo contra un esquema antiguo y provocar errores `500` en lecturas como consultas por paciente.

Flujo recomendado en Render:

```bash
Build Command: cd backend && npm install && npm run build
Start Command: cd backend && npm run prisma:migrate:deploy && npm run start:prod
```

Si el servicio ya está creado con otro `Start Command`, corrige esa configuración en Render o ejecuta manualmente `npm run prisma:migrate:deploy` sobre la base productiva antes de reintentar el despliegue.
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
