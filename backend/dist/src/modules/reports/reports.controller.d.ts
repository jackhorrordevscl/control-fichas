import type { Response } from 'express';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    generateReport(patientId: string, res: Response): Promise<void>;
}
