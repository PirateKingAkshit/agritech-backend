function embedHtmlToShareHtml(html = "") {
  return html.replace(
    /<iframe([^>]*?)src="https:\/\/www\.youtube\.com\/embed\/([^"?]+)[^"]*"([^>]*)><\/iframe>/gi,
    (_match, before, videoId, after) => {
      return `<iframe${before}src="https://youtu.be/${videoId}"${after}></iframe>`;
    }
  );
}

module.exports = embedHtmlToShareHtml;
