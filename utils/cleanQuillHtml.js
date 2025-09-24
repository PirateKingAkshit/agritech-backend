// utils/cleanQuillHtml.js
function cleanQuillHtml(html) {
  if (!html) return "";

  return html
    .replace(/class="ql-align-center"/g, 'style="text-align:center;"')
    .replace(/class="ql-align-right"/g, 'style="text-align:right;"')
    .replace(/class="ql-align-justify"/g, 'style="text-align:justify;"')
    .replace(/class="ql-align-left"/g, 'style="text-align:left;"')
    .replace(/class="ql-video"/g, 'style="display:block;max-width:100%;margin:auto;"');
}

module.exports = cleanQuillHtml;
