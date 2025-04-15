const mammoth = require('mammoth');
const { PDFDocument } = require('pdf-lib');
const htmlDocx = require('html-docx-js');

class DocumentProcessor {
  constructor() {
    this.kdpFormattingRules = {
      paragraph: {
        indent: '1.25em',
        lineSpacing: '1.15',
        fontFamily: 'Times New Roman',
        fontSize: '12pt'
      },
      chapterTitle: {
        fontSize: '16pt',
        fontWeight: 'bold',
        marginBottom: '2em',
        textAlign: 'center'
      },
      pageBreak: {
        before: 'always'
      }
    };
  }

  async processDocx(filePath) {
    try {
      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;

      // Apply KDP formatting
      const formattedHtml = this.applyKdpFormatting(html);

      // Generate output files
      const docxBuffer = await this.generateDocx(formattedHtml);
      const pdfBuffer = await this.generatePdf(formattedHtml);

      return {
        docx: docxBuffer,
        pdf: pdfBuffer
      };
    } catch (error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  applyKdpFormatting(html) {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Apply paragraph formatting
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.style.textIndent = this.kdpFormattingRules.paragraph.indent;
      p.style.lineHeight = this.kdpFormattingRules.paragraph.lineSpacing;
      p.style.fontFamily = this.kdpFormattingRules.paragraph.fontFamily;
      p.style.fontSize = this.kdpFormattingRules.paragraph.fontSize;
    });

    // Apply chapter title formatting
    const chapterTitles = doc.querySelectorAll('h1');
    chapterTitles.forEach(h1 => {
      h1.style.fontSize = this.kdpFormattingRules.chapterTitle.fontSize;
      h1.style.fontWeight = this.kdpFormattingRules.chapterTitle.fontWeight;
      h1.style.marginBottom = this.kdpFormattingRules.chapterTitle.marginBottom;
      h1.style.textAlign = this.kdpFormattingRules.chapterTitle.textAlign;
    });

    return doc.documentElement.outerHTML;
  }

  async generateDocx(html) {
    try {
      return await htmlDocx.asBlob(html);
    } catch (error) {
      throw new Error(`DOCX generation failed: ${error.message}`);
    }
  }

  async generatePdf(html) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      // TODO: Implement PDF generation with proper formatting
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
}

module.exports = new DocumentProcessor(); 