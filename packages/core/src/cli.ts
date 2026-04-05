#!/usr/bin/env node
/**
 * @gov-epub/core CLI
 *
 * Usage:
 *   npx @gov-epub/core convert input.epub -o output.epub [options]
 *   npx @gov-epub/core validate input.epub
 *   npx @gov-epub/core info input.epub
 */

import fs from 'fs/promises';
import path from 'path';
import { processEpub } from './index.js';
import { parseEpub } from './parser/index.js';
import { validateEpub } from './validator/index.js';
import type { ConversionOptions } from './types.js';

const VERSION = '1.0.0';

function printUsage() {
  console.log(`
@gov-epub/core CLI v${VERSION}
AI 기반 ePub 2.0 → 3.0 인터랙티브 리마스터링 엔진

Usage:
  epub-remaster convert <input.epub> -o <output.epub> [options]
  epub-remaster validate <input.epub>
  epub-remaster info <input.epub>

Commands:
  convert     ePub 2.0 → 3.0 변환
  validate    ePub 파일 검증
  info        ePub 메타데이터 및 구조 정보 출력

Convert Options:
  -o, --output <path>     출력 파일 경로 (필수)
  --quiz                  AI 퀴즈 자동 생성
  --tts                   TTS 음성 변환
  --summary               챕터 요약 생성
  --image-gen             AI 이미지 생성
  --theme <name>          CSS 테마 (default: modern)
  --format json           JSON 형식으로 결과 출력 (플러그인 연동용)

General:
  -h, --help              도움말
  -v, --version           버전 정보
  `);
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const command = args[0];
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-o' || arg === '--output') {
      flags.output = args[++i] || '';
    } else if (arg === '--format') {
      flags.format = args[++i] || 'text';
    } else if (arg === '--theme') {
      flags.theme = args[++i] || 'modern';
    } else if (arg === '--quiz') {
      flags.quiz = true;
    } else if (arg === '--tts') {
      flags.tts = true;
    } else if (arg === '--summary') {
      flags.summary = true;
    } else if (arg === '--image-gen') {
      flags.imageGen = true;
    } else if (arg === '-h' || arg === '--help') {
      flags.help = true;
    } else if (arg === '-v' || arg === '--version') {
      flags.version = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { command, flags, positional };
}

async function cmdConvert(inputPath: string, flags: Record<string, string | boolean>) {
  const outputPath = flags.output as string;
  if (!outputPath) {
    console.error('Error: --output (-o) is required');
    process.exit(1);
  }

  const isJson = flags.format === 'json';
  if (!isJson) console.log(`변환 시작: ${path.basename(inputPath)}`);

  const buffer = await fs.readFile(inputPath);
  const options: ConversionOptions = {
    enableQuiz: !!flags.quiz,
    enableTts: !!flags.tts,
    enableSummary: !!flags.summary,
    enableImageGen: !!flags.imageGen,
    templateId: 'default',
    cssTheme: (flags.theme as string) || 'modern',
  };

  const startTime = Date.now();
  const result = await processEpub(buffer, options);
  const elapsed = Date.now() - startTime;

  await fs.writeFile(outputPath, result.epub);

  if (isJson) {
    console.log(JSON.stringify({
      success: true,
      input: path.basename(inputPath),
      output: path.basename(outputPath),
      conversionTimeMs: elapsed,
      metadata: {
        title: result.metadata.title,
        author: result.metadata.author,
        language: result.metadata.language,
      },
      stats: result.stats,
      report: {
        epubcheckPassed: result.report.epubcheck.passed,
        epubcheckErrors: result.report.epubcheck.errors.length,
        accessibilityScore: result.report.accessibility.score,
        interactionCount: result.report.interactionCount,
      },
    }, null, 2));
  } else {
    console.log(`\n변환 완료 (${elapsed}ms)`);
    console.log(`  제목: ${result.metadata.title}`);
    console.log(`  저자: ${result.metadata.author}`);
    console.log(`  챕터: ${result.stats.chapterCount}개`);
    console.log(`  크기: ${(result.stats.totalSize / 1024).toFixed(1)}KB`);
    console.log(`  ePubCheck: ${result.report.epubcheck.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  접근성: ${result.report.accessibility.score}점`);
    console.log(`\n출력: ${outputPath}`);
  }
}

async function cmdValidate(inputPath: string, flags: Record<string, string | boolean>) {
  const isJson = flags.format === 'json';
  const buffer = await fs.readFile(inputPath);
  const report = await validateEpub(buffer);

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`검증: ${path.basename(inputPath)}`);
    console.log(`  ePubCheck: ${report.epubcheck.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  오류: ${report.epubcheck.errors.length}건`);
    console.log(`  경고: ${report.epubcheck.warnings.length}건`);
    console.log(`  접근성: ${report.accessibility.score}점`);
  }
}

async function cmdInfo(inputPath: string, flags: Record<string, string | boolean>) {
  const isJson = flags.format === 'json';
  const buffer = await fs.readFile(inputPath);
  const parsed = await parseEpub(buffer);

  if (isJson) {
    console.log(JSON.stringify({
      metadata: parsed.metadata,
      chapters: parsed.chapters.length,
      resources: parsed.resources.length,
      toc: parsed.toc.length,
      errors: parsed.errors.length,
    }, null, 2));
  } else {
    console.log(`정보: ${path.basename(inputPath)}`);
    console.log(`  제목: ${parsed.metadata.title}`);
    console.log(`  저자: ${parsed.metadata.author}`);
    console.log(`  언어: ${parsed.metadata.language}`);
    console.log(`  챕터: ${parsed.chapters.length}개`);
    console.log(`  리소스: ${parsed.resources.length}개`);
    console.log(`  목차: ${parsed.toc.length}항목`);
    if (parsed.errors.length > 0) {
      console.log(`  파싱 오류: ${parsed.errors.length}건`);
    }
  }
}

async function main() {
  const { command, flags, positional } = parseArgs(process.argv);

  if (flags.version) {
    console.log(VERSION);
    return;
  }

  if (flags.help || !command) {
    printUsage();
    return;
  }

  const inputPath = positional[0];
  if (!inputPath && command !== 'help') {
    console.error('Error: input file path is required');
    process.exit(1);
  }

  try {
    await fs.access(inputPath);
  } catch {
    console.error(`Error: file not found: ${inputPath}`);
    process.exit(1);
  }

  switch (command) {
    case 'convert':
      await cmdConvert(inputPath, flags);
      break;
    case 'validate':
      await cmdValidate(inputPath, flags);
      break;
    case 'info':
      await cmdInfo(inputPath, flags);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
