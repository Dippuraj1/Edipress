const mammoth = require('mammoth');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const htmlDocx = require('html-docx-js');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class KDPFormatter {
  constructor() {
    this.formattingRules = {
      // Front Matter
      titlePage: {
        title: {
          fontSize: '24pt',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '2in',
          marginBottom: '1in'
        },
        author: {
          fontSize: '16pt',
          textAlign: 'center',
          marginBottom: '2in'
        }
      },
      
      // Chapter Formatting
      chapter: {
        title: {
          fontSize: '16pt',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '1in',
          marginBottom: '0.5in',
          pageBreakBefore: 'always'
        },
        firstParagraph: {
          textIndent: '0',
          marginTop: '0.5in'
        },
        paragraph: {
          textIndent: '0.25in',
          lineHeight: '1.15',
          marginBottom: '0.5em',
          orphans: '2',
          widows: '2'
        }
      },

      // Section Formatting
      section: {
        title: {
          fontSize: '14pt',
          fontWeight: 'bold',
          marginTop: '0.5in',
          marginBottom: '0.25in'
        }
      },

      // General Text Formatting
      text: {
        fontFamily: 'Times New Roman',
        fontSize: '12pt',
        color: '#000000'
      },

      // Page Layout
      page: {
        margin: {
          top: '0.75in',
          bottom: '0.75in',
          left: '0.75in',
          right: '0.75in'
        },
        size: {
          width: '6in',
          height: '9in'
        }
      }
    };

    this.templates = {
      fiction: {
        name: 'Fiction',
        description: 'Standard fiction book formatting',
        rules: {
          ...this.formattingRules,
          chapter: {
            ...this.formattingRules.chapter,
            title: {
              ...this.formattingRules.chapter.title,
              fontSize: '18pt',
              marginTop: '1.5in'
            }
          }
        }
      },
      nonFiction: {
        name: 'Non-Fiction',
        description: 'Academic and non-fiction book formatting',
        rules: {
          ...this.formattingRules,
          chapter: {
            ...this.formattingRules.chapter,
            title: {
              ...this.formattingRules.chapter.title,
              fontSize: '16pt',
              marginTop: '1in'
            }
          },
          section: {
            ...this.formattingRules.section,
            title: {
              ...this.formattingRules.section.title,
              fontSize: '14pt',
              marginTop: '0.75in'
            }
          }
        }
      }
    };
  }

  async formatDocument(filePath, templateName = 'fiction') {
    try {
      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml({ path: filePath });
      const html = result.value;

      // Get selected template
      const template = this.templates[templateName] || this.templates.fiction;

      // Apply formatting
      const formattedHtml = this.applyFormatting(html, template.rules);

      // Generate output files
      const docxBuffer = await this.generateDocx(formattedHtml);
      const pdfBuffer = await this.generatePdf(formattedHtml, template.rules);

      return {
        docx: docxBuffer,
        pdf: pdfBuffer
      };
    } catch (error) {
      throw new Error(`Document formatting failed: ${error.message}`);
    }
  }

  applyFormatting(html, rules) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Apply general text formatting
    const allText = doc.querySelectorAll('p, span, div');
    allText.forEach(element => {
      element.style.fontFamily = rules.text.fontFamily;
      element.style.fontSize = rules.text.fontSize;
      element.style.color = rules.text.color;
    });

    // Apply chapter title formatting
    const chapterTitles = doc.querySelectorAll('h1');
    chapterTitles.forEach(h1 => {
      Object.assign(h1.style, rules.chapter.title);
    });

    // Apply section title formatting
    const sectionTitles = doc.querySelectorAll('h2');
    sectionTitles.forEach(h2 => {
      Object.assign(h2.style, rules.section.title);
    });

    // Apply paragraph formatting
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach((p, index) => {
      if (index === 0) {
        Object.assign(p.style, rules.chapter.firstParagraph);
      } else {
        Object.assign(p.style, rules.chapter.paragraph);
      }
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

  async generatePdf(html, rules) {
    try {
      // Create a temporary HTML file with proper styling
      const tempHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                size: ${rules.page.size.width} ${rules.page.size.height};
                margin: ${rules.page.margin.top} ${rules.page.margin.right} ${rules.page.margin.bottom} ${rules.page.margin.left};
              }
              body {
                font-family: ${rules.text.fontFamily};
                font-size: ${rules.text.fontSize};
                color: ${rules.text.color};
                line-height: ${rules.chapter.paragraph.lineHeight};
                margin: 0;
                padding: 0;
              }
              h1 {
                font-size: ${rules.chapter.title.fontSize};
                font-weight: ${rules.chapter.title.fontWeight};
                text-align: ${rules.chapter.title.textAlign};
                margin-top: ${rules.chapter.title.marginTop};
                margin-bottom: ${rules.chapter.title.marginBottom};
                page-break-before: ${rules.chapter.title.pageBreakBefore};
              }
              h2 {
                font-size: ${rules.section.title.fontSize};
                font-weight: ${rules.section.title.fontWeight};
                margin-top: ${rules.section.title.marginTop};
                margin-bottom: ${rules.section.title.marginBottom};
              }
              p:first-of-type {
                text-indent: ${rules.chapter.firstParagraph.textIndent};
                margin-top: ${rules.chapter.firstParagraph.marginTop};
              }
              p {
                text-indent: ${rules.chapter.paragraph.textIndent};
                margin-bottom: ${rules.chapter.paragraph.marginBottom};
                orphans: ${rules.chapter.paragraph.orphans};
                widows: ${rules.chapter.paragraph.widows};
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      // Create a temporary file
      const tempDir = path.join(__dirname, 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      const tempHtmlPath = path.join(tempDir, 'temp.html');
      await fs.writeFile(tempHtmlPath, tempHtml);

      // Launch Puppeteer
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      try {
        const page = await browser.newPage();
        
        // Load the HTML file
        await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: {
            width: parseFloat(rules.page.size.width) * 72,
            height: parseFloat(rules.page.size.height) * 72
          },
          margin: {
            top: parseFloat(rules.page.margin.top) * 72,
            right: parseFloat(rules.page.margin.right) * 72,
            bottom: parseFloat(rules.page.margin.bottom) * 72,
            left: parseFloat(rules.page.margin.left) * 72
          },
          printBackground: true
        });

        return pdfBuffer;
      } finally {
        await browser.close();
        // Clean up temporary file
        await fs.unlink(tempHtmlPath).catch(() => {});
      }
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  getAvailableTemplates() {
    return Object.entries(this.templates).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description
    }));
  }
}

module.exports = new KDPFormatter(); 