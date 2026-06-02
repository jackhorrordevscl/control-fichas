-- Extend audit action catalog with document download events
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_DOWNLOAD';
