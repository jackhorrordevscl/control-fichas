import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('patient/:patientId')
  async generateReport(
    @Param('patientId') patientId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generatePatientReport(patientId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ficha-${patientId}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}