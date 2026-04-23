/**
 * Generate sealable DOCX files for Plock + EBT:
 *   - Plock 검수조서.docx (3 seals: 발주기관 / 수행기관(플락) / 검수자)
 *   - Plock 납품서.docx (2 seals: 납품자(플락) / 인수자)
 *   - EBT 검수조서.docx (3 seals: 발주기관 / 수행기관(EBT) / 검수자)
 *   - EBT 납품서.docx (2 seals: 납품자(EBT) / 인수자)
 *
 * Uses `docx` npm package. Files are placed side-by-side with existing PDFs.
 */
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageOrientation,
  convertInchesToTwip,
} from 'docx';
import { writeFileSync } from 'node:fs';

const PLOCK_DIR = '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물';
const EBT_DIR = '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/ebt-solution/결과물';

// ─── Seal box cell ────────────────────────────────────────
function sealBox(): TableCell {
  return new TableCell({
    width: { size: 3000, type: WidthType.DXA },
    children: [
      new Paragraph({ text: '', alignment: AlignmentType.CENTER }),
      new Paragraph({ text: '', alignment: AlignmentType.CENTER }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '(직인)', color: '888888', size: 16 })],
      }),
      new Paragraph({ text: '', alignment: AlignmentType.CENTER }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: '666666' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: '666666' },
      left: { style: BorderStyle.SINGLE, size: 8, color: '666666' },
      right: { style: BorderStyle.SINGLE, size: 8, color: '666666' },
    },
    margins: { top: 400, bottom: 400, left: 200, right: 200 },
  });
}

function sealInfoCell(lines: string[]): TableCell {
  return new TableCell({
    width: { size: 5000, type: WidthType.DXA },
    children: lines.map(
      (line, i) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: line,
              bold: i === 0,
              size: i === 0 ? 24 : 20,
            }),
          ],
          spacing: { after: 80 },
        }),
    ),
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    margins: { top: 200, bottom: 200, left: 200, right: 200 },
  });
}

function sealRow(label: string, org: string, rep: string): Table {
  return new Table({
    rows: [
      new TableRow({
        children: [sealInfoCell([label, org, `대표 ${rep}`]), sealBox()],
      }),
    ],
    width: { size: 9000, type: WidthType.DXA },
  });
}

// ─── Info table at top ────────────────────────────────────
function infoTable(rows: Array<[string, string]>): Table {
  return new Table({
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2500, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: k, bold: true, size: 20 })],
                }),
              ],
              shading: { fill: 'F1F5F9' },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
            }),
            new TableCell({
              width: { size: 6500, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: v, size: 20 })],
                }),
              ],
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
            }),
          ],
        }),
    ),
    width: { size: 9000, type: WidthType.DXA },
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 400 },
    children: [
      new TextRun({ text, bold: true, size: 44, font: '바탕' }),
    ],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}

function p(text: string, opts: { indent?: number; bold?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({ text, bold: opts.bold, size: opts.size ?? 22 }),
    ],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: '' });
}

function hr(): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [],
  });
}

// ─── Plock 검수조서 ───────────────────────────────────────
function plockGeomsu(): Document {
  return new Document({
    styles: {
      default: {
        document: { run: { font: 'Pretendard', size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
            },
            size: { orientation: PageOrientation.PORTRAIT },
          },
        },
        children: [
          h1('검 수 조 서'),
          hr(),
          h2('1. 기본 정보'),
          infoTable([
            ['과제명', 'AI 기반 ePub 2.0 이하 전자책의 ePub 3.0 인터랙티브 리마스터링 기술 개발'],
            ['세부과제명', '출판 콘텐츠 R&D 서비스 런칭 마케팅 자료 제작 (카드뉴스·영상)'],
            ['발주기관', '(주)하얀마인드 (사업자등록번호: 562-86-00666)'],
            ['수행기관', '플락 PLOCK (사업자등록번호: 120-12-23372)'],
            ['계약기간', '2026년 04월 01일 ~ 2026년 04월 20일'],
            ['계약금액', '17,000,000원 (부가세 별도)'],
            ['납품일', '2026년 04월 20일'],
            ['검수일', '2026년 04월 22일'],
            ['검수자', '김대훈 (CTO, (주)하얀마인드)'],
          ]),

          h2('2. 검수 개요'),
          p('(주)하얀마인드와 플락 PLOCK 간 체결한 「출판 콘텐츠 R&D 서비스 런칭 마케팅 자료 제작」 용역 계약에 따라, 2026년 04월 20일 납품된 결과물(RePub 마케팅 자료)에 대하여 아래와 같이 검수를 실시하였다.'),

          h2('3. 검수 결과 요약'),
          p('• 카드뉴스 최종본: 20세트 × 3포맷 × 평균 8장 = 477장 (적합)'),
          p('• 카드뉴스 편집 원본: HTML 소스 번들 + SVG 40장 + Figma 가이드 (적합)'),
          p('• 영상: 데모 풀/숏 + 홍보 풀/숏 4편 (적합)'),
          p('• 영상 편집 프로젝트: FCPXML 1.11 4편 (Final Cut/DaVinci/Premiere 호환) (적합)'),
          p('• 내레이션·자막·폰트·이미지 소스: 일괄 제공 (적합)'),
          p('• 과업 진행 문서: 킥오프 + 중간 검수 2회 + 최종 검수 회의록 (적합)'),
          p('• RePub 브랜딩 반영: 전수 검증 완료 (적합)'),

          h2('4. 검수 결과'),
          p('상기 검수를 실시한 결과, 플락 PLOCK이 납품한 RePub 마케팅 자료는 계약 요건을 모두 충족하는 것으로 확인되었다. 이에 본 검수조서를 작성하여 검수 완료를 확인한다.'),

          spacer(),
          p('검수 판정: 적합 (합격)', { bold: true, size: 26 }),

          spacer(),
          hr(),
          h2('5. 날인'),
          p('검수일: 2026년 04월 22일', { bold: true }),
          spacer(),

          // 발주기관 확인
          sealRow('발주기관 확인', '(주)하얀마인드', '오정민'),
          spacer(),

          // 수행기관 확인 (플락 직인)
          sealRow('수행기관 확인', '플락 PLOCK', '이은지'),
          spacer(),

          // 검수자 서명
          sealRow('검수자', 'CTO (주)하얀마인드', '김대훈'),
        ],
      },
    ],
  });
}

// ─── Plock 납품서 ─────────────────────────────────────────
function plockNappum(): Document {
  return new Document({
    styles: { default: { document: { run: { font: 'Pretendard', size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          h1('납 품 서'),
          hr(),
          h2('1. 기본 정보'),
          infoTable([
            ['과제명', '출판 콘텐츠 R&D 서비스 런칭 마케팅 자료 제작 (RePub 마케팅)'],
            ['발주기관', '(주)하얀마인드 (대표 오정민, 사업자등록번호: 562-86-00666)'],
            ['수행기관', '플락 PLOCK (대표 이은지, 사업자등록번호: 120-12-23372)'],
            ['계약기간', '2026년 04월 01일 ~ 2026년 04월 20일'],
            ['계약금액', '17,000,000원 (부가세 별도)'],
            ['납품일', '2026년 04월 20일'],
          ]),

          h2('2. 납품물 목록'),
          p('1. 카드뉴스 최종본 20세트 × 3포맷 (인스타그램/블로그/B2B A4) — 총 477장 PNG'),
          p('2. 카드뉴스 편집 원본: HTML 소스 번들 + SVG 40장 + Figma Import 가이드'),
          p('3. 카테고리별 콘텐츠 기획안 (5개 카테고리 × 4세트 = 20건)'),
          p('4. 서비스 데모 영상 풀버전 (MP4, Full HD, 4분)'),
          p('5. 서비스 데모 영상 숏버전 (MP4, Full HD, 45초)'),
          p('6. 대외 홍보 영상 풀버전 (MP4, Full HD, 3분 30초)'),
          p('7. 대외 홍보 영상 숏버전 (MP4, Full HD, 30초)'),
          p('8. 영상 편집 프로젝트 파일 (FCPXML 1.11) 4편'),
          p('9. 자막 SRT 4건'),
          p('10. 내레이션 스크립트 (RePub 브랜딩 반영)'),
          p('11. 소스 번들: Pretendard 폰트 라이선스, BGM 추천 리스트, 배경 이미지 183장'),
          p('12. 과업 진행 문서 (킥오프, 중간검수 2회, 최종검수)'),
          p('13. 최종 결과 보고서 (Executive Summary)'),

          h2('3. 납품 방법'),
          p('• 파일 전달: Google Drive 공유 폴더 (발주기관 지정 계정)'),
          p('• 온라인 열람: epub-remastering.hayanmind.com (RePub 서비스)'),

          h2('4. 확인'),
          p('상기 납품물을 계약 내용에 따라 정상적으로 납품합니다.'),

          spacer(),
          hr(),
          h2('5. 날인'),
          p('납품일: 2026년 04월 20일', { bold: true }),
          spacer(),

          sealRow('납품자', '플락 PLOCK', '이은지'),
          spacer(),
          sealRow('인수자', '(주)하얀마인드', '오정민'),
        ],
      },
    ],
  });
}

// ─── EBT 검수조서 ─────────────────────────────────────────
function ebtGeomsu(): Document {
  return new Document({
    styles: { default: { document: { run: { font: 'Pretendard', size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          h1('검 수 조 서'),
          hr(),
          h2('1. 기본 정보'),
          infoTable([
            ['과제명', 'AI 기반 ePub 2.0 이하 전자책의 ePub 3.0 인터랙티브 리마스터링 기술 개발'],
            ['세부과제명', 'ePub 데이터셋 1,000건 이상 구축 및 ePub 구조 패턴 분석 연구'],
            ['발주기관', '(주)하얀마인드 (사업자등록번호: 562-86-00666)'],
            ['수행기관', '주식회사 이비티솔루션 (사업자등록번호: 218-88-03324)'],
            ['계약기간', '2026년 02월 23일 ~ 2026년 04월 22일'],
            ['계약금액', '20,000,000원 (부가세 별도)'],
            ['납품일', '2026년 04월 22일'],
            ['검수일', '2026년 04월 23일'],
            ['검수자', '김대훈 (CTO, (주)하얀마인드)'],
          ]),

          h2('2. 검수 개요'),
          p('(주)하얀마인드와 주식회사 이비티솔루션 간 체결한 「ePub 데이터셋 구축 및 구조 패턴 분석 연구」 용역 계약에 따라, 2026년 04월 22일 납품된 결과물에 대하여 아래와 같이 검수를 실시하였다.'),

          h2('3. 검수 결과 요약'),
          p('• ePub 데이터셋 1,000건 이상 구축: 1,010권 (적합, 목표치 초과)'),
          p('• 메타데이터 정규화 DB (CSV/JSON): 완비 (적합)'),
          p('• ePubCheck 전수 검사 결과: 100% 수행 (적합)'),
          p('• 출판사별 Convention 분석서: 5건 (적합)'),
          p('• 오류 패턴 분류: 10종 패턴 식별 (적합)'),
          p('• 품질 등급 분류: 5단계(A~E) 전건 분류 (적합)'),
          p('• 변환 Requirement 정의서: 필수 18개 + 권장 7개 (적합)'),
          p('• 연구용역 결과보고서: 완비 (적합)'),

          h2('4. 검수 결과'),
          p('상기 검수를 실시한 결과, 주식회사 이비티솔루션이 납품한 「ePub 데이터셋 구축 및 구조 패턴 분석 연구」 결과물은 계약 요건을 모두 충족하는 것으로 확인되었다. 이에 본 검수조서를 작성하여 검수 완료를 확인한다.'),

          spacer(),
          p('검수 판정: 적합 (합격)', { bold: true, size: 26 }),

          spacer(),
          hr(),
          h2('5. 날인'),
          p('검수일: 2026년 04월 23일', { bold: true }),
          spacer(),

          sealRow('발주기관 확인', '(주)하얀마인드', '오정민'),
          spacer(),
          sealRow('수행기관 확인', '주식회사 이비티솔루션', '오유미'),
          spacer(),
          sealRow('검수자', 'CTO (주)하얀마인드', '김대훈'),
        ],
      },
    ],
  });
}

// ─── EBT 납품서 ───────────────────────────────────────────
function ebtNappum(): Document {
  return new Document({
    styles: { default: { document: { run: { font: 'Pretendard', size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          h1('납 품 서'),
          hr(),
          h2('1. 기본 정보'),
          infoTable([
            ['과제명', 'ePub 데이터셋 1,000건 이상 구축 및 ePub 구조 패턴 분석 연구'],
            ['발주기관', '(주)하얀마인드 (대표 오정민, 사업자등록번호: 562-86-00666)'],
            ['수행기관', '주식회사 이비티솔루션 (대표 오유미, 사업자등록번호: 218-88-03324)'],
            ['계약기간', '2026년 02월 23일 ~ 2026년 04월 22일'],
            ['계약금액', '20,000,000원 (부가세 별도)'],
            ['납품일', '2026년 04월 22일'],
          ]),

          h2('2. 납품물 목록'),
          p('1. ePub 데이터셋 1,010권 (.epub 파일, 문학 500 + 비문학 500 + 한국어 10)'),
          p('2. 메타데이터 정규화 DB (catalog.csv, 1,010행 × 29열)'),
          p('3. 메타데이터 정규화 DB (catalog.json)'),
          p('4. 파일별 상세 분석 결과 (per_file 샘플 50건 JSON)'),
          p('5. ePubCheck 전수 검사 결과 요약 (summary.csv)'),
          p('6. ePubCheck 전수 검사 결과 상세 (per_file 샘플 50건 JSON)'),
          p('7. 출판사별 Convention 분석서 (A~E 5건 PDF)'),
          p('8. 오류 패턴 분류표 (error-patterns.json, 10종 패턴)'),
          p('9. 오류 패턴 매트릭스 (1,010행 × 13열 CSV)'),
          p('10. 오류 패턴 요약표 (CSV)'),
          p('11. 품질 등급 분류표 (CSV + JSON, A~E 5단계)'),
          p('12. 변환 Requirement 정의서 (R-001 ~ R-025)'),
          p('13. 연구용역 결과보고서 (PDF)'),
          p('14. 데이터셋 사용 가이드 (README PDF)'),

          h2('3. 납품 방법'),
          p('• 파일 전달: Google Drive 공유 폴더'),
          p('• 데이터셋 규모: 약 265 MB'),

          h2('4. 특기사항'),
          p('• ePub 데이터셋은 Project Gutenberg (공개 도메인) 1,001건 + Wikisource 한국어 9건으로 구성됨.'),
          p('• 원본 파일은 저작권 만료(Public Domain) 또는 CC-BY-SA 라이선스이므로 연구 목적 자유 활용 가능.'),

          h2('5. 확인'),
          p('상기 납품물을 계약 내용에 따라 정상적으로 납품합니다.'),

          spacer(),
          hr(),
          h2('6. 날인'),
          p('납품일: 2026년 04월 22일', { bold: true }),
          spacer(),

          sealRow('납품자', '주식회사 이비티솔루션', '오유미'),
          spacer(),
          sealRow('인수자', '(주)하얀마인드', '오정민'),
        ],
      },
    ],
  });
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  const docs = [
    { doc: plockGeomsu(), path: `${PLOCK_DIR}/검수조서.docx`, name: 'Plock 검수조서' },
    { doc: plockNappum(), path: `${PLOCK_DIR}/납품서.docx`, name: 'Plock 납품서' },
    { doc: ebtGeomsu(), path: `${EBT_DIR}/검수조서.docx`, name: 'EBT 검수조서' },
    { doc: ebtNappum(), path: `${EBT_DIR}/납품서.docx`, name: 'EBT 납품서' },
  ];
  console.log('\n→ Generating 4 DOCX files with seal areas\n');
  for (const { doc, path, name } of docs) {
    const buf = await Packer.toBuffer(doc);
    writeFileSync(path, buf);
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`  ✓ ${name}  →  ${path}  (${kb} KB)`);
  }
  console.log('\n✓ All DOCX files generated.\n');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
