import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------------------
// Minimal XLSX generator (no external deps) – produces a valid .xlsx
// ---------------------------------------------------------------------------
function generateXlsx(data: { title: string; sheets: Array<{ name: string; headers: string[]; rows: string[][] }> }): Uint8Array {
  // We'll use a simple XML-in-ZIP approach via Deno's built-in compression
  const sheets = data.sheets && data.sheets.length > 0
    ? data.sheets
    : [{ name: "Sheet1", headers: ["A"], rows: [["No data"]] }];

  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const colLetter = (n: number) => {
    let s = "";
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
    return s;
  };

  // Build shared strings
  const allStrings: string[] = [];
  const stringIndex = new Map<string, number>();
  const addString = (s: string) => {
    if (!stringIndex.has(s)) { stringIndex.set(s, allStrings.length); allStrings.push(s); }
    return stringIndex.get(s)!;
  };
  for (const sheet of sheets) {
    for (const h of sheet.headers) addString(h);
    for (const row of sheet.rows) for (const cell of row) addString(cell);
  }

  const sst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `<si><t>${escapeXml(s)}</t></si>`).join("\n")}
</sst>`;

  const sheetXmls: string[] = [];
  for (const sheet of sheets) {
    const allRows = [sheet.headers, ...sheet.rows];
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>`;
    for (let r = 0; r < allRows.length; r++) {
      xml += `<row r="${r + 1}">`;
      for (let c = 0; c < allRows[r].length; c++) {
        const ref = `${colLetter(c)}${r + 1}`;
        const idx = stringIndex.get(allRows[r][c]) ?? 0;
        xml += `<c r="${ref}" t="s"><v>${idx}</v></c>`;
      }
      xml += `</row>`;
    }
    xml += `</sheetData></worksheet>`;
    sheetXmls.push(xml);
  }

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // Build ZIP manually using Deno compression
  const enc = new TextEncoder();
  const files: Array<{ path: string; data: Uint8Array }> = [
    { path: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { path: "_rels/.rels", data: enc.encode(rootRels) },
    { path: "xl/workbook.xml", data: enc.encode(workbook) },
    { path: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    { path: "xl/sharedStrings.xml", data: enc.encode(sst) },
    ...sheetXmls.map((xml, i) => ({
      path: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(xml),
    })),
  ];

  return createZip(files);
}

// ---------------------------------------------------------------------------
// Minimal PPTX generator
// ---------------------------------------------------------------------------
function generatePptx(data: { title: string; slides: Array<{ title: string; content: string; layout?: string }> }): Uint8Array {
  const slides = data.slides && data.slides.length > 0
    ? data.slides
    : [{ title: data.title || "Presentation", content: "No content provided" }];

  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const slideXmls: string[] = slides.map((slide) => {
    const bullets = slide.content.split("\n").filter(Boolean).map(line =>
      `<a:p><a:pPr marL="342900" indent="-342900"><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="1800" dirty="0"/><a:t>${escapeXml(line.replace(/^[-•]\s*/, ""))}</a:t></a:r></a:p>`
    ).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<p:sp>
<p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="1143000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200" b="1" dirty="0"/><a:t>${escapeXml(slide.title)}</a:t></a:r></a:p></p:txBody>
</p:sp>
<p:sp>
<p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="4525963"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/>${bullets}</p:txBody>
</p:sp>
</p:spTree>
</p:cSld>
</p:sld>`;
  });

  const enc = new TextEncoder();

  const presentation = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst/>
<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("")}</p:sldIdLst>
<p:sldSz cx="9144000" cy="6858000"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

  const presRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${slides.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n")}
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n")}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const files: Array<{ path: string; data: Uint8Array }> = [
    { path: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { path: "_rels/.rels", data: enc.encode(rootRels) },
    { path: "ppt/presentation.xml", data: enc.encode(presentation) },
    { path: "ppt/_rels/presentation.xml.rels", data: enc.encode(presRels) },
    ...slideXmls.map((xml, i) => ({
      path: `ppt/slides/slide${i + 1}.xml`,
      data: enc.encode(xml),
    })),
  ];

  return createZip(files);
}

// ---------------------------------------------------------------------------
// Minimal PDF generator for slides
// ---------------------------------------------------------------------------
function generateSlidesPdf(data: { title: string; slides: Array<{ title: string; content: string }> }): Uint8Array {
  const slides = data.slides && data.slides.length > 0
    ? data.slides
    : [{ title: data.title || "Presentation", content: "No content provided" }];

  const enc = new TextEncoder();

  // PDF with landscape pages (792x612 = letter landscape)
  const pageW = 792;
  const pageH = 612;

  const objects: string[] = [];
  const addObj = (content: string) => { objects.push(content); return objects.length; };

  // Obj 1: Catalog
  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Obj 2: Pages (placeholder, filled later)
  addObj(""); // placeholder

  // Obj 3: Font
  addObj("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj");
  // Obj 4: Bold font
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj");

  const pageObjIds: number[] = [];

  const escPdf = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  // Wrap text to fit width (approximate: ~7.2px per char at size 14)
  const wrapText = (text: string, maxChars: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if (current.length + word.length + 1 > maxChars) {
        lines.push(current);
        current = word;
      } else {
        current = current ? current + " " + word : word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  for (const slide of slides) {
    let stream = "";
    // Background
    stream += "0.15 0.15 0.2 rg\n";
    stream += `0 0 ${pageW} ${pageH} re f\n`;

    // Title bar background
    stream += "0.2 0.4 0.8 rg\n";
    stream += `0 ${pageH - 80} ${pageW} 80 re f\n`;

    // Title text (white, bold)
    stream += "1 1 1 rg\n";
    stream += "BT\n";
    stream += "/F2 24 Tf\n";
    stream += `50 ${pageH - 55} Td\n`;
    stream += `(${escPdf(slide.title)}) Tj\n`;
    stream += "ET\n";

    // Content text
    const bulletLines = slide.content.split("\n").filter(Boolean);
    stream += "0.9 0.9 0.95 rg\n";
    stream += "BT\n";
    stream += "/F1 14 Tf\n";
    stream += "16 TL\n";
    stream += `70 ${pageH - 130} Td\n`;
    const maxChars = 90;
    for (const line of bulletLines) {
      const cleanLine = line.replace(/^[-•]\s*/, "");
      const wrapped = wrapText(cleanLine, maxChars);
      // First line with bullet
      stream += `(\\267  ${escPdf(wrapped[0])}) Tj T*\n`;
      // Continuation lines indented
      for (let w = 1; w < wrapped.length; w++) {
        stream += `(    ${escPdf(wrapped[w])}) Tj T*\n`;
      }
    }
    stream += "ET\n";

    const streamBytes = enc.encode(stream);
    const contentId = addObj(
      `${objects.length + 1} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj`
    );

    const pageId = addObj(
      `${objects.length + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj`
    );
    pageObjIds.push(pageId);
  }

  // Fill in Pages object
  const kids = pageObjIds.map(id => `${id} 0 R`).join(" ");
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageObjIds.length} >>\nendobj`;

  // Build PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return enc.encode(pdf);
}

// ---------------------------------------------------------------------------
// Minimal DOCX generator
// ---------------------------------------------------------------------------
function generateDocx(data: { title: string; sections: Array<{ heading?: string; body: string }> }): Uint8Array {
  const sections = data.sections && data.sections.length > 0
    ? data.sections
    : [{ heading: data.title || "Document", body: "No content provided." }];

  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let bodyXml = "";
  for (const section of sections) {
    if (section.heading) {
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(section.heading)}</w:t></w:r></w:p>`;
    }
    const paras = section.body.split("\n").filter(Boolean);
    for (const para of paras) {
      bodyXml += `<w:p><w:r><w:t xml:space="preserve">${escapeXml(para)}</w:t></w:r></w:p>`;
    }
  }

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${bodyXml}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:styleId="Heading1">
<w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
<w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
</w:style>
</w:styles>`;

  const enc = new TextEncoder();

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const files: Array<{ path: string; data: Uint8Array }> = [
    { path: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { path: "_rels/.rels", data: enc.encode(rootRels) },
    { path: "word/document.xml", data: enc.encode(document) },
    { path: "word/styles.xml", data: enc.encode(styles) },
    { path: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
  ];

  return createZip(files);
}

// ---------------------------------------------------------------------------
// Minimal ZIP builder (no dependencies)
// ---------------------------------------------------------------------------
function createZip(files: Array<{ path: string; data: Uint8Array }>): Uint8Array {
  const crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crc32Table[i] = c;
  }
  const crc32 = (data: Uint8Array) => {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  };

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralEntries: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.path);
    const fileCrc = crc32(file.data);

    // Local file header
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034B50, true); // signature
    lv.setUint16(4, 20, true); // version
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // compression: stored
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, fileCrc, true);
    lv.setUint32(18, file.data.length, true); // compressed
    lv.setUint32(22, file.data.length, true); // uncompressed
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    new Uint8Array(local).set(nameBytes, 30);

    parts.push(new Uint8Array(local));
    parts.push(file.data);

    // Central directory header
    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014B50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, fileCrc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(central).set(nameBytes, 46);
    centralEntries.push(new Uint8Array(central));

    offset += 30 + nameBytes.length + file.data.length;
  }

  const centralStart = offset;
  for (const entry of centralEntries) {
    parts.push(entry);
    offset += entry.length;
  }
  const centralSize = offset - centralStart;

  // End of central directory
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054B50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);
  parts.push(new Uint8Array(eocd));

  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const part of parts) { result.set(part, pos); pos += part.length; }
  return result;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, content } = await req.json();

    if (!type || !content) {
      return new Response(JSON.stringify({ error: "Missing type or content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fileData: Uint8Array;
    let extension: string;
    let mimeType: string;

    switch (type) {
      case "xlsx": {
        fileData = generateXlsx(content);
        extension = "xlsx";
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      }
      case "pptx": {
        fileData = generatePptx(content);
        extension = "pptx";
        mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        break;
      }
      case "slides_pdf": {
        fileData = generateSlidesPdf(content);
        extension = "pdf";
        mimeType = "application/pdf";
        break;
      }
      case "docx": {
        fileData = generateDocx(content);
        extension = "docx";
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unsupported type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Upload to storage
    const fileName = `${content.title?.replace(/[^a-zA-Z0-9]/g, "_") || "document"}_${Date.now()}.${extension}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(filePath, fileData, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from("generated-documents")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        url: publicUrlData.publicUrl,
        fileName,
        type: extension,
        mimeType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
