/**
 * ePub Validator
 *
 * Performs structural and accessibility validation on ePub 3.0 files:
 *   1. Structural validation (mimetype, container.xml, OPF presence)
 *   2. HTML5 validation (well-formedness, required attributes)
 *   3. Resource reference integrity (all manifest items exist)
 *   4. Accessibility checks (alt text, heading structure, lang attributes)
 *
 * This is a basic built-in validator. For full conformance testing,
 * use ePubCheck 4.x externally.
 */

import JSZip from 'jszip';
import { parseDocument } from 'htmlparser2';
import * as domutils from 'domutils';
import type { Element } from 'domhandler';
import type { ValidationReport, ValidationIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function issue(
  code: string,
  message: string,
  location: string,
  severity: 'error' | 'warning' | 'info' = 'error',
): ValidationIssue {
  return { code, message, location, severity };
}

// ---------------------------------------------------------------------------
// 1. Structural Validation
// ---------------------------------------------------------------------------

async function validateStructure(
  zip: JSZip,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): Promise<void> {
  // mimetype file
  const mimetypeFile = zip.file('mimetype');
  if (!mimetypeFile) {
    errors.push(
      issue('RSC-004', 'Missing mimetype file', 'mimetype'),
    );
  } else {
    const content = await mimetypeFile.async('string');
    if (content.trim() !== 'application/epub+zip') {
      errors.push(
        issue(
          'RSC-005',
          `Invalid mimetype: expected "application/epub+zip", got "${content.trim()}"`,
          'mimetype',
        ),
      );
    }
  }

  // META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    errors.push(
      issue('RSC-001', 'Missing META-INF/container.xml', 'META-INF/container.xml'),
    );
    return; // Cannot continue without container.xml
  }

  const containerXml = await containerFile.async('string');
  const containerDoc = parseDocument(containerXml, { xmlMode: true });

  // Find rootfile
  const rootfile = domutils.findOne(
    (node) => node.type === 'tag' && node.name.toLowerCase() === 'rootfile',
    containerDoc.children,
    true,
  );

  if (!rootfile) {
    errors.push(
      issue(
        'RSC-002',
        'No <rootfile> element in container.xml',
        'META-INF/container.xml',
      ),
    );
    return;
  }

  const opfPath = (rootfile as Element).attribs['full-path'];
  if (!opfPath) {
    errors.push(
      issue(
        'RSC-003',
        'No full-path attribute on <rootfile>',
        'META-INF/container.xml',
      ),
    );
    return;
  }

  // OPF file existence
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    errors.push(
      issue('RSC-006', `OPF file not found: ${opfPath}`, opfPath),
    );
    return;
  }

  // Parse OPF for manifest validation
  const opfXml = await opfFile.async('string');
  const opfDoc = parseDocument(opfXml, { xmlMode: true });

  // Validate package version
  const packageEl = domutils.findOne(
    (node) => node.type === 'tag' && node.name.toLowerCase() === 'package',
    opfDoc.children,
    true,
  );
  if (packageEl) {
    const version = (packageEl as Element).attribs['version'];
    if (!version) {
      warnings.push(
        issue('OPF-001', 'Missing version attribute on <package>', opfPath, 'warning'),
      );
    } else if (!version.startsWith('3')) {
      warnings.push(
        issue(
          'OPF-002',
          `Package version is ${version}, expected 3.x for ePub 3.0`,
          opfPath,
          'warning',
        ),
      );
    }
  }

  // Validate required metadata
  const dcTitle = domutils.findOne(
    (node) => node.type === 'tag' && node.name.toLowerCase() === 'dc:title',
    opfDoc.children,
    true,
  );
  if (!dcTitle || !domutils.textContent(dcTitle).trim()) {
    errors.push(
      issue('OPF-003', 'Missing or empty <dc:title> in metadata', opfPath),
    );
  }

  const dcLanguage = domutils.findOne(
    (node) => node.type === 'tag' && node.name.toLowerCase() === 'dc:language',
    opfDoc.children,
    true,
  );
  if (!dcLanguage || !domutils.textContent(dcLanguage).trim()) {
    errors.push(
      issue('OPF-004', 'Missing or empty <dc:language> in metadata', opfPath),
    );
  }

  const dcIdentifier = domutils.findOne(
    (node) => node.type === 'tag' && node.name.toLowerCase() === 'dc:identifier',
    opfDoc.children,
    true,
  );
  if (!dcIdentifier || !domutils.textContent(dcIdentifier).trim()) {
    errors.push(
      issue('OPF-005', 'Missing or empty <dc:identifier> in metadata', opfPath),
    );
  }

  // dcterms:modified is required for ePub 3.0
  const modified = domutils.findOne(
    (node) => {
      if (node.type !== 'tag' || node.name.toLowerCase() !== 'meta') return false;
      return (node as Element).attribs['property'] === 'dcterms:modified';
    },
    opfDoc.children,
    true,
  );
  if (!modified) {
    warnings.push(
      issue(
        'OPF-006',
        'Missing <meta property="dcterms:modified"> (required for ePub 3.0)',
        opfPath,
        'warning',
      ),
    );
  }

  // Check nav document presence
  const navItem = domutils.findOne(
    (node) => {
      if (node.type !== 'tag' || node.name.toLowerCase() !== 'item') return false;
      const props = (node as Element).attribs['properties'] ?? '';
      return props.includes('nav');
    },
    opfDoc.children,
    true,
  );
  if (!navItem) {
    warnings.push(
      issue(
        'OPF-007',
        'No nav document declared in manifest (item with properties="nav")',
        opfPath,
        'warning',
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Resource reference integrity
  // -------------------------------------------------------------------------
  const opfDir = opfPath.includes('/')
    ? opfPath.substring(0, opfPath.lastIndexOf('/'))
    : '';

  const manifestItems = domutils.findAll(
    (node) => node.type === 'tag' && node.name.toLowerCase() === 'item',
    opfDoc.children,
  );

  for (const item of manifestItems) {
    const el = item as Element;
    const href = el.attribs['href'];
    if (!href) continue;

    // Resolve against OPF directory
    const fullPath = opfDir ? `${opfDir}/${href}` : href;
    const exists = zip.file(fullPath) !== null;

    if (!exists) {
      // Try case-insensitive
      const lowerPath = fullPath.toLowerCase();
      const found = Object.keys(zip.files).some(
        (name) => name.toLowerCase() === lowerPath,
      );
      if (!found) {
        errors.push(
          issue(
            'RSC-007',
            `Manifest item references missing file: ${href}`,
            opfPath,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. HTML5 Validation
// ---------------------------------------------------------------------------

async function validateHtml(
  zip: JSZip,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): Promise<void> {
  const htmlFiles = Object.keys(zip.files).filter(
    (name) => /\.(x?html?)$/i.test(name) && !zip.files[name].dir,
  );

  for (const path of htmlFiles) {
    const content = await zip.file(path)!.async('string');
    const doc = parseDocument(content, { xmlMode: true });

    // Check for <html> element
    const htmlEl = domutils.findOne(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'html',
      doc.children,
      true,
    );
    if (!htmlEl) {
      errors.push(
        issue('HTM-001', 'Missing <html> root element', path),
      );
      continue;
    }

    // Check xmlns
    const xmlns = (htmlEl as Element).attribs['xmlns'];
    if (!xmlns || !xmlns.includes('xhtml')) {
      warnings.push(
        issue(
          'HTM-002',
          'Missing or invalid xmlns on <html>',
          path,
          'warning',
        ),
      );
    }

    // Check <head> and <title>
    const head = domutils.findOne(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'head',
      (htmlEl as Element).children,
      true,
    );
    if (!head) {
      warnings.push(
        issue('HTM-003', 'Missing <head> element', path, 'warning'),
      );
    } else {
      const title = domutils.findOne(
        (node) => node.type === 'tag' && node.name.toLowerCase() === 'title',
        (head as Element).children,
        true,
      );
      if (!title || !domutils.textContent(title).trim()) {
        warnings.push(
          issue('HTM-004', 'Missing or empty <title>', path, 'warning'),
        );
      }
    }

    // Check <body>
    const body = domutils.findOne(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'body',
      (htmlEl as Element).children,
      true,
    );
    if (!body) {
      errors.push(
        issue('HTM-005', 'Missing <body> element', path),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Accessibility Validation
// ---------------------------------------------------------------------------

async function validateAccessibility(
  zip: JSZip,
  issues: ValidationIssue[],
): Promise<number> {
  let totalChecks = 0;
  let passedChecks = 0;

  const htmlFiles = Object.keys(zip.files).filter(
    (name) => /\.(x?html?)$/i.test(name) && !zip.files[name].dir,
  );

  for (const path of htmlFiles) {
    const content = await zip.file(path)!.async('string');
    const doc = parseDocument(content, { xmlMode: true });

    // Check 1: All images have alt text
    const images = domutils.findAll(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'img',
      doc.children,
    );
    for (const img of images) {
      totalChecks++;
      const el = img as Element;
      const alt = el.attribs['alt'];
      if (alt === undefined || alt === null) {
        issues.push(
          issue(
            'ACC-001',
            `Image missing alt attribute: ${el.attribs['src'] ?? 'unknown'}`,
            path,
            'warning',
          ),
        );
      } else {
        passedChecks++;
      }
    }

    // Check 2: <html> has lang attribute
    const htmlEl = domutils.findOne(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'html',
      doc.children,
      true,
    );
    totalChecks++;
    if (htmlEl && (htmlEl as Element).attribs['lang']) {
      passedChecks++;
    } else {
      issues.push(
        issue('ACC-002', 'Missing lang attribute on <html>', path, 'warning'),
      );
    }

    // Check 3: Heading structure (no skipped levels)
    const headings = domutils.findAll(
      (node) =>
        node.type === 'tag' && /^h[1-6]$/i.test(node.name),
      doc.children,
    );
    let lastLevel = 0;
    let headingValid = true;
    for (const h of headings) {
      const level = parseInt((h as Element).name.charAt(1), 10);
      if (lastLevel > 0 && level > lastLevel + 1) {
        headingValid = false;
        issues.push(
          issue(
            'ACC-003',
            `Heading level skip: <h${level}> follows <h${lastLevel}>`,
            path,
            'warning',
          ),
        );
      }
      lastLevel = level;
    }
    if (headings.length > 0) {
      totalChecks++;
      if (headingValid) passedChecks++;
    }

    // Check 4: Tables have header cells
    const tables = domutils.findAll(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'table',
      doc.children,
    );
    for (const table of tables) {
      totalChecks++;
      const ths = domutils.findAll(
        (node) => node.type === 'tag' && node.name.toLowerCase() === 'th',
        (table as Element).children,
      );
      if (ths.length > 0) {
        passedChecks++;
      } else {
        issues.push(
          issue('ACC-004', 'Table missing header cells (<th>)', path, 'warning'),
        );
      }
    }

    // Check 5: Links have discernible text
    const links = domutils.findAll(
      (node) => node.type === 'tag' && node.name.toLowerCase() === 'a',
      doc.children,
    );
    for (const link of links) {
      totalChecks++;
      const el = link as Element;
      const text = domutils.textContent(el).trim();
      const ariaLabel = el.attribs['aria-label'] ?? '';
      if (text || ariaLabel) {
        passedChecks++;
      } else {
        issues.push(
          issue(
            'ACC-005',
            `Link without discernible text: href="${el.attribs['href'] ?? ''}"`,
            path,
            'warning',
          ),
        );
      }
    }
  }

  // Check accessibility metadata in OPF
  const opfFiles = Object.keys(zip.files).filter(
    (name) => /\.opf$/i.test(name) && !zip.files[name].dir,
  );
  for (const path of opfFiles) {
    const content = await zip.file(path)!.async('string');
    const doc = parseDocument(content, { xmlMode: true });

    // Check for schema:accessMode
    totalChecks++;
    const accessMode = domutils.findOne(
      (node) => {
        if (node.type !== 'tag' || node.name.toLowerCase() !== 'meta') return false;
        return (node as Element).attribs['property'] === 'schema:accessMode';
      },
      doc.children,
      true,
    );
    if (accessMode) {
      passedChecks++;
    } else {
      issues.push(
        issue('ACC-006', 'Missing accessibility metadata: schema:accessMode', path, 'warning'),
      );
    }

    // Check for schema:accessibilityFeature
    totalChecks++;
    const accessFeature = domutils.findOne(
      (node) => {
        if (node.type !== 'tag' || node.name.toLowerCase() !== 'meta') return false;
        return (node as Element).attribs['property'] === 'schema:accessibilityFeature';
      },
      doc.children,
      true,
    );
    if (accessFeature) {
      passedChecks++;
    } else {
      issues.push(
        issue(
          'ACC-007',
          'Missing accessibility metadata: schema:accessibilityFeature',
          path,
          'warning',
        ),
      );
    }
  }

  // Calculate score (0-100)
  return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
}

// ---------------------------------------------------------------------------
// 4. Interaction count (types, not instances)
// ---------------------------------------------------------------------------

/**
 * Count the number of *distinct kinds* of interactive elements present in the
 * converted ePub.  KPI #7 targets ≥ 3 types per book.
 *
 * Recognised types:
 *   - summary     ("ai-summary" aside)
 *   - quiz        ("ai-quiz" / epub:type="practice")
 *   - tts         (<audio> element or *.smil media overlay)
 *   - term-popup  (footnote / noteref / data-tooltip)
 *   - tutor       (AI tutor widget)
 *   - image       (AI-generated image or decorative figure)
 */
async function countInteractions(zip: JSZip): Promise<number> {
  const types = new Set<string>();

  const htmlFiles = Object.keys(zip.files).filter(
    (name) => /\.(x?html?)$/i.test(name) && !zip.files[name].dir,
  );

  for (const path of htmlFiles) {
    const content = await zip.file(path)!.async('string');

    if (content.includes('ai-summary')) {
      types.add('summary');
    }

    if (
      content.includes('ai-quiz') ||
      content.includes('epub:type="practice"')
    ) {
      types.add('quiz');
    }

    if (
      /<audio\b/i.test(content) ||
      content.includes('data-media-overlay') ||
      content.includes('media-overlay')
    ) {
      types.add('tts');
    }

    if (
      content.includes('epub:type="noteref"') ||
      content.includes('epub:type="footnote"') ||
      content.includes('data-tooltip')
    ) {
      types.add('term-popup');
    }

    if (content.includes('ai-tutor') || content.includes('data-ai-tutor')) {
      types.add('tutor');
    }
  }

  // SMIL file on disk also counts as a TTS / media-overlay interaction.
  const smilFiles = Object.keys(zip.files).filter(
    (name) => /\.smil$/i.test(name),
  );
  if (smilFiles.length > 0) {
    types.add('tts');
  }

  return types.size;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate an ePub buffer and return a comprehensive validation report.
 *
 * @param buffer - The raw .epub file as a Buffer
 * @returns ValidationReport with epubcheck results, accessibility score, and interaction count
 */
export async function validateEpub(buffer: Buffer): Promise<ValidationReport> {
  const epubErrors: ValidationIssue[] = [];
  const epubWarnings: ValidationIssue[] = [];
  const accessibilityIssues: ValidationIssue[] = [];

  // Load ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return {
      epubcheck: {
        passed: false,
        errors: [
          issue('PKG-001', 'Invalid ZIP archive', 'root'),
        ],
        warnings: [],
      },
      accessibility: { score: 0, issues: [] },
      interactionCount: 0,
    };
  }

  // Run validations
  await validateStructure(zip, epubErrors, epubWarnings);
  await validateHtml(zip, epubErrors, epubWarnings);
  const accessibilityScore = await validateAccessibility(
    zip,
    accessibilityIssues,
  );
  const interactionCount = await countInteractions(zip);

  return {
    epubcheck: {
      passed: epubErrors.length === 0,
      errors: epubErrors,
      warnings: epubWarnings,
    },
    accessibility: {
      score: accessibilityScore,
      issues: accessibilityIssues,
    },
    interactionCount,
  };
}
