function extractYouTubeIframes(html = "") {
  const regex =
    /<iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/([^"?]+)[^"]*"[^>]*><\/iframe>/gi;

  const videos = [];
  let cleanedHtml = html;

  cleanedHtml = cleanedHtml.replace(regex, (_, videoId) => {
    videos.push({
      type: "youtube",
      videoId,
    });
    return ""; // remove iframe completely
  });

  return { cleanedHtml, videos };
}

module.exports = extractYouTubeIframes;
