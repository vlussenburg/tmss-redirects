module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy({ "public": "/" });

  // Extract YouTube video ID from URL
  eleventyConfig.addFilter("youtubeId", function(url) {
    if (!url) return null;
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
    return match ? match[1] : null;
  });

  // Add UTM parameters to URL
  eleventyConfig.addFilter("addUtm", function(url, episode, medium = 'episode-page') {
    if (!url) return url;
    const utm = `utm_source=tms.show&utm_medium=${medium}&utm_campaign=ep${episode}`;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${utm}`;
  });

  // Escape text for JSON
  eleventyConfig.addFilter("jsonEscape", function(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  });

  // Truncate text
  eleventyConfig.addFilter("truncate", function(text, length) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length - 3).trim() + '...';
  });

  // Check if string is a URL
  eleventyConfig.addFilter("isUrl", function(str) {
    return str && str.startsWith('http');
  });

  // Check if object has any truthy values
  eleventyConfig.addFilter("hasValues", function(obj) {
    if (!obj) return false;
    return Object.values(obj).some(v => v);
  });

  // Capitalize first letter
  eleventyConfig.addFilter("capitalize", function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};
