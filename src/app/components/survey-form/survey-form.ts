import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DelegateService } from '../../services/delegate.service';
import { QrService } from '../../services/qr.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  Delegate,
  calculateAgeOnCongress,
  CONGRESS_DATE,
  EthnicityType,
  ReligionType,
  AcademicLevelType,
  PoliticalTheoryType
} from '../../models/delegate.model';

@Component({
  selector: 'app-survey-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './survey-form.html',
  styleUrl: './survey-form.css'
})
export class SurveyFormComponent {
  protected readonly delegateService = inject(DelegateService);
  protected readonly qrService = inject(QrService);
  protected readonly feedback = inject(FeedbackService);

  // Form Fields
  mssv = '';
  fullName = '';
  unit = 'Chi đoàn K22401';
  dob = '2005-04-15';
  gender: 'Nam' | 'Nữ' = 'Nam';
  isPartyMember: 0 | 1 = 0;
  ethnicity: EthnicityType = 'Kinh';
  religion: ReligionType = 'Không';
  academicLevel: AcademicLevelType = 'Đang học ĐH';
  politicalTheory: PoliticalTheoryType = 'Hoàn thành các bài LLCT';

  // 0/1 achievements
  isDoanVienTieuBieu = false;
  isCanBoTieuBieu = false;
  isThanhNienLamTheoLoiBac = false;
  isBtvThanhDoan = false;
  isBangKhenTWDoan = false;
  isNckhCapTruong = false;
  isDatGiaiHocThuat = false;
  isVanTheMy = false;
  isSv5TotCapTruong = false;
  isSv5TotCapDhqg = false;
  isSv5TotCapThanhPho = false;

  // Generated QR result state after survey submission
  readonly submittedDelegate = signal<Delegate | null>(null);
  readonly generatedQrUrl = signal<string | null>(null);

  // Bulk import mode
  readonly isBulkImportOpen = signal(false);
  bulkData = '';
  bulkImportError = signal<string | null>(null);

  get calculatedAge(): number {
    return calculateAgeOnCongress(this.dob, CONGRESS_DATE);
  }

  async onSubmitSurvey(): Promise<void> {
    if (!this.mssv.trim() || !this.fullName.trim()) {
      alert('Vui lòng nhập đầy đủ MSSV và Họ tên đại biểu!');
      return;
    }

    const cleanMssv = this.mssv.trim().toUpperCase();

    // Check if delegate already exists
    const existing = this.delegateService.getDelegateByMssv(cleanMssv);
    let targetDelegate: Delegate;

    if (existing) {
      targetDelegate = {
        ...existing,
        fullName: this.fullName.trim(),
        unit: this.unit,
        dob: this.dob,
        gender: this.gender,
        ethnicity: this.ethnicity,
        religion: this.religion,
        isPartyMember: this.isPartyMember,
        academicLevel: this.academicLevel,
        politicalTheory: this.politicalTheory,
        achievements: {
          isDoanVienTieuBieu: this.isDoanVienTieuBieu ? 1 : 0,
          isCanBoTieuBieu: this.isCanBoTieuBieu ? 1 : 0,
          isThanhNienLamTheoLoiBac: this.isThanhNienLamTheoLoiBac ? 1 : 0,
          isBtvThanhDoan: this.isBtvThanhDoan ? 1 : 0,
          isBangKhenTWDoan: this.isBangKhenTWDoan ? 1 : 0,
          isNckhCapTruong: this.isNckhCapTruong ? 1 : 0,
          isDatGiaiHocThuat: this.isDatGiaiHocThuat ? 1 : 0,
          isVanTheMy: this.isVanTheMy ? 1 : 0,
          isSv5TotCapTruong: this.isSv5TotCapTruong ? 1 : 0,
          isSv5TotCapDhqg: this.isSv5TotCapDhqg ? 1 : 0,
          isSv5TotCapThanhPho: this.isSv5TotCapThanhPho ? 1 : 0
        }
      };
      this.delegateService.updateDelegate(targetDelegate);
    } else {
      targetDelegate = this.delegateService.addDelegate({
        mssv: cleanMssv,
        fullName: this.fullName.trim(),
        unit: this.unit,
        dob: this.dob,
        gender: this.gender,
        ethnicity: this.ethnicity,
        religion: this.religion,
        isPartyMember: this.isPartyMember,
        academicLevel: this.academicLevel,
        politicalTheory: this.politicalTheory,
        seatNumber: `Dãy ${String.fromCharCode(65 + (this.delegateService.totalDelegates() % 10))} - Ghế ${String((this.delegateService.totalDelegates() % 10) + 1).padStart(2, '0')}`,
        achievements: {
          isDoanVienTieuBieu: this.isDoanVienTieuBieu ? 1 : 0,
          isCanBoTieuBieu: this.isCanBoTieuBieu ? 1 : 0,
          isThanhNienLamTheoLoiBac: this.isThanhNienLamTheoLoiBac ? 1 : 0,
          isBtvThanhDoan: this.isBtvThanhDoan ? 1 : 0,
          isBangKhenTWDoan: this.isBangKhenTWDoan ? 1 : 0,
          isNckhCapTruong: this.isNckhCapTruong ? 1 : 0,
          isDatGiaiHocThuat: this.isDatGiaiHocThuat ? 1 : 0,
          isVanTheMy: this.isVanTheMy ? 1 : 0,
          isSv5TotCapTruong: this.isSv5TotCapTruong ? 1 : 0,
          isSv5TotCapDhqg: this.isSv5TotCapDhqg ? 1 : 0,
          isSv5TotCapThanhPho: this.isSv5TotCapThanhPho ? 1 : 0
        }
      });
    }

    // Generate QR using MSSV
    const qrUrl = await this.qrService.generateQrDataUrl(targetDelegate);
    this.submittedDelegate.set(targetDelegate);
    this.generatedQrUrl.set(qrUrl);

    this.feedback.playSuccessSound();
    this.feedback.fireGrandConfetti();
  }

  downloadQr(): void {
    const d = this.submittedDelegate();
    const qr = this.generatedQrUrl();
    if (d && qr) {
      this.qrService.downloadQrPng(qr, `QR_${d.mssv}_${d.fullName}.png`);
    }
  }

  resetForm(): void {
    this.submittedDelegate.set(null);
    this.generatedQrUrl.set(null);
    this.mssv = '';
    this.fullName = '';
  }
}
