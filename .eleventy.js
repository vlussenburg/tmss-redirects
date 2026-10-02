module.exports = (eleventyConfig) => {
  // Copy static assets
  eleventyConfig.addPassthroughCopy({ public: '/' })

  // Extract YouTube video ID from URL
  eleventyConfig.addFilter('youtubeId', (url) => {
    if (!url) return null
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/)
    return match ? match[1] : null
  })

  // Add UTM parameters to URL
  eleventyConfig.addFilter(
    'addUtm',
    (url, episode, medium = 'episode-page') => {
      if (!url) return url
      const utm = `utm_source=tms.show&utm_medium=${medium}&utm_campaign=ep${episode}`
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}${utm}`
    },
  )

  // Escape text for JSON
  eleventyConfig.addFilter('jsonEscape', (text) => {
    if (!text) return ''
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  })

  // Truncate text
  eleventyConfig.addFilter('truncate', (text, length) => {
    if (!text || text.length <= length) return text
    return `${text.substring(0, length - 3).trim()}...`
  })

  // Check if string is a URL
  eleventyConfig.addFilter('isUrl', (str) => {
    if (!str) return str
    return str.startsWith('http')
  })

  // Check if object has any truthy values
  eleventyConfig.addFilter('hasValues', (obj) => {
    if (!obj) return false
    return Object.values(obj).some((v) => v)
  })

  // Capitalize first letter
  eleventyConfig.addFilter('capitalize', (str) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  })

  // Split a blank-line-separated transcript into an array of paragraphs
  eleventyConfig.addFilter('paragraphs', (text) => {
    if (!text) return []
    return text
      .replace(/\r\n/g, '\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
  })

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
  }
}
