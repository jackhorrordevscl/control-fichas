import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { DocumentsController } from '../src/modules/documents/documents.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { PatientsService } from '../src/modules/patients/patients.service';
import * as fs from 'fs';

describe('Documents E2E (mocked Prisma/S3)', () => {
  let service: DocumentsService;
  let controller: DocumentsController;

  const prismaMock = {
    patientDocument: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  } as any;

  const patientsServiceMock = { findOne: jest.fn() } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // create a real temp file for upload
    const os = require('os');
    const tmpPath = require('path').join(os.tmpdir(), `test-upload-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, 'hello');
    (global as any).__TEST_TMP_FILE__ = tmpPath;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PatientsService, useValue: patientsServiceMock },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('upload guarda metadata cifrada cuando FILE_ENCRYPTION_KEY está presente', async () => {
    process.env.FILE_ENCRYPTION_KEY = Buffer.from('1'.repeat(32)).toString('base64');
    patientsServiceMock.findOne.mockResolvedValue({ id: 'p1' });
    prismaMock.patientDocument.create.mockResolvedValue({ id: 'doc-1' });

    const file = { path: (global as any).__TEST_TMP_FILE__, originalname: 'test.pdf', mimetype: 'application/pdf' } as Express.Multer.File;

    const result = await service.uploadDocument('p1', 'user-1', 'THERAPIST', file, 'INFORMED_CONSENT');

    expect(prismaMock.patientDocument.create).toHaveBeenCalled();
    const data = prismaMock.patientDocument.create.mock.calls[0][0].data;
    expect(data.encrypted).toBe(true);
    expect(data.encDataKey).toBeDefined();
  });

  it('findByPatient lista documentos tras validar acceso', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'p1' });
    prismaMock.patientDocument.findMany.mockResolvedValue([{ id: 'doc-1' }]);

    const docs = await service.findByPatient('p1', 'user-1', 'THERAPIST');
    expect(docs).toEqual([{ id: 'doc-1' }]);
  });
});
