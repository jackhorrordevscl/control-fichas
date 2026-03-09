"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedFilesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const fs = __importStar(require("fs"));
let SharedFilesService = class SharedFilesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadFile(file, dto, userId) {
        return this.prisma.sharedFile.create({
            data: {
                name: dto.name || file.originalname,
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                mimetype: file.mimetype,
                size: file.size,
                category: dto.category ?? 'GENERAL',
                description: dto.description,
                uploadedById: userId,
            },
            include: { uploadedBy: { select: { name: true, email: true } } },
        });
    }
    async findAll(category) {
        return this.prisma.sharedFile.findMany({
            where: {
                isActive: true,
                ...(category ? { category } : {}),
            },
            include: {
                uploadedBy: { select: { name: true, email: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const file = await this.prisma.sharedFile.findFirst({
            where: { id, isActive: true },
            include: { uploadedBy: { select: { name: true } } },
        });
        if (!file)
            throw new common_1.NotFoundException('Archivo no encontrado');
        return file;
    }
    async getFilePath(id) {
        const file = await this.findOne(id);
        if (!fs.existsSync(file.path)) {
            throw new common_1.NotFoundException('Archivo físico no encontrado en el servidor');
        }
        return file.path;
    }
    async deleteFile(id, userId, userRole) {
        const file = await this.findOne(id);
        const canDelete = file.uploadedById === userId ||
            userRole === 'DIRECTOR' ||
            userRole === 'ADMIN';
        if (!canDelete) {
            throw new common_1.ForbiddenException('No tienes permiso para eliminar este archivo');
        }
        await this.prisma.sharedFile.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: 'Archivo eliminado correctamente' };
    }
    async updateFile(id, dto, userId, userRole) {
        const file = await this.findOne(id);
        const canEdit = file.uploadedById === userId ||
            userRole === 'DIRECTOR' ||
            userRole === 'ADMIN';
        if (!canEdit)
            throw new common_1.ForbiddenException('Sin permiso para editar');
        return this.prisma.sharedFile.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.category && { category: dto.category }),
            },
        });
    }
};
exports.SharedFilesService = SharedFilesService;
exports.SharedFilesService = SharedFilesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SharedFilesService);
//# sourceMappingURL=shared-files.service.js.map