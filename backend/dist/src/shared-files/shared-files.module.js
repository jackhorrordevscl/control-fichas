"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedFilesModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto_1 = require("crypto");
const shared_files_controller_1 = require("./shared-files.controller");
const shared_files_service_1 = require("./shared-files.service");
const prisma_module_1 = require("../prisma/prisma.module");
const common_2 = require("@nestjs/common");
const ALLOWED_MIMETYPES = {
    'application/pdf': 'PDF',
    'application/msword': 'Word (.doc)',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
    'application/vnd.ms-excel': 'Excel (.xls)',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx)',
    'application/vnd.ms-powerpoint': 'PowerPoint (.ppt)',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint (.pptx)',
    'image/jpeg': 'Imagen JPEG',
    'image/png': 'Imagen PNG',
    'image/gif': 'Imagen GIF',
    'image/webp': 'Imagen WebP',
    'text/plain': 'Texto plano (.txt)',
    'application/zip': 'ZIP',
};
let SharedFilesModule = class SharedFilesModule {
};
exports.SharedFilesModule = SharedFilesModule;
exports.SharedFilesModule = SharedFilesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.diskStorage)({
                    destination: (0, path_1.join)(process.cwd(), 'uploads', 'shared'),
                    filename: (_req, file, cb) => {
                        const uniqueName = `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(file.originalname)}`;
                        cb(null, uniqueName);
                    },
                }),
                limits: { fileSize: 50 * 1024 * 1024 },
                fileFilter: (_req, file, cb) => {
                    if (ALLOWED_MIMETYPES[file.mimetype]) {
                        cb(null, true);
                    }
                    else {
                        const allowed = Object.values(ALLOWED_MIMETYPES).join(', ');
                        cb(new common_2.BadRequestException(`Tipo de archivo no admitido: "${(0, path_1.extname)(file.originalname) || file.mimetype}". ` +
                            `Formatos permitidos: ${allowed}.`), false);
                    }
                },
            }),
        ],
        controllers: [shared_files_controller_1.SharedFilesController],
        providers: [shared_files_service_1.SharedFilesService],
        exports: [shared_files_service_1.SharedFilesService],
    })
], SharedFilesModule);
//# sourceMappingURL=shared-files.module.js.map