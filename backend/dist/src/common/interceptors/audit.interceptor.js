"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const audit_service_1 = require("../../modules/audit/audit.service");
let AuditInterceptor = class AuditInterceptor {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user)
            return next.handle();
        const method = request.method;
        const url = request.url;
        const resourceId = request.params?.id ?? request.params?.patientId ?? 'N/A';
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];
        const actionMap = {
            GET: 'VIEW',
            POST: 'CREATE',
            PATCH: 'UPDATE',
            DELETE: 'SOFT_DELETE',
        };
        const getResource = (url) => {
            if (url.includes('/patients'))
                return 'Patient';
            if (url.includes('/consultations'))
                return 'Consultation';
            if (url.includes('/reports'))
                return 'Report';
            if (url.includes('/auth/mfa'))
                return 'MFA';
            if (url.includes('/auth'))
                return 'Auth';
            return 'Unknown';
        };
        const action = actionMap[method] ?? 'VIEW';
        const resource = getResource(url);
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            this.auditService.log({
                userId: user.id,
                action,
                resource,
                resourceId,
                detail: `${method} ${url}`,
                ipAddress,
                userAgent,
            }).catch(() => { });
        }));
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map