// The Meaningful Shit Show - Episode Renderer
// Fetches episodes.json and dynamically renders episode cards

// UTM Parameters Configuration
const UTM_PARAMS = {
  source: 'tms.show',
  medium: 'episode-card',
  campaign: 'podcast-discovery'
};

// Helper function to add UTM parameters to URLs
function addUTMParams(url) {
  if (!url) return url;

  const utmString = `utm_source=${UTM_PARAMS.source}&utm_medium=${UTM_PARAMS.medium}&utm_campaign=${UTM_PARAMS.campaign}`;
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}${utmString}`;
}

// Platform icon URLs from simple-icons CDN
const PLATFORM_ICONS = {
  youtube: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/youtube.svg',
  spotify: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/spotify.svg',
  apple: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/applepodcasts.svg',
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/instagram.svg',
  tiktok: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/tiktok.svg',
  substack: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/substack.svg'
};

// Fetch episodes data from JSON file
async function fetchEpisodes() {
  try {
    const response = await fetch('/episodes.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch episodes: ${response.status}`);
    }
    const data = await response.json();
    return data.episodes || [];
  } catch (error) {
    console.error('Error loading episodes:', error);
    return [];
  }
}

// Create platform links section for an episode
function createPlatformLinks(links) {
  if (!links || Object.keys(links).length === 0) {
    return null;
  }

  const linksContainer = document.createElement('div');
  linksContainer.className = 'episode-links';

  // Iterate through available platform links
  Object.entries(links).forEach(([platform, url]) => {
    if (url && PLATFORM_ICONS[platform]) {
      const link = document.createElement('a');
      link.href = addUTMParams(url);
      link.title = platform.charAt(0).toUpperCase() + platform.slice(1);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const img = document.createElement('img');
      img.src = PLATFORM_ICONS[platform];
      img.alt = platform;
      img.height = 20;
      img.className = `platform-icon platform-${platform}`;

      link.appendChild(img);
      linksContainer.appendChild(link);
    }
  });

  // Only return links container if it has children
  return linksContainer.children.length > 0 ? linksContainer : null;
}

// Create a single episode card element
function createEpisodeCard(episode) {
  const article = document.createElement('article');
  article.className = 'episode-card';
  article.id = `ep${episode.episode}`;

  // Episode header (icon + metadata)
  const header = document.createElement('div');
  header.className = 'episode-header';

  // Episode icon (emoji or image)
  const iconContainer = document.createElement('span');
  iconContainer.className = 'episode-icon';

  if (episode.icon) {
    // Check if icon is a URL (starts with http)
    if (episode.icon.startsWith('http')) {
      const iconImg = document.createElement('img');
      iconImg.src = episode.icon;
      iconImg.alt = `Episode ${episode.episode} icon`;
      iconContainer.appendChild(iconImg);
    } else {
      // Treat as emoji
      iconContainer.textContent = episode.icon;
    }
  } else {
    // Default icon if none provided
    iconContainer.textContent = '🎙️';
  }

  // Episode metadata (number and title)
  const meta = document.createElement('div');
  meta.className = 'episode-meta';

  const episodeNumber = document.createElement('span');
  episodeNumber.className = 'episode-number';
  episodeNumber.textContent = `Episode ${episode.episode}`;

  const title = document.createElement('h2');
  title.className = 'episode-title';
  title.textContent = episode.title;

  meta.appendChild(episodeNumber);
  meta.appendChild(title);

  header.appendChild(iconContainer);
  header.appendChild(meta);

  // Add header to card
  article.appendChild(header);

  // Episode description (only if present)
  if (episode.description && episode.description.trim()) {
    const description = document.createElement('p');
    description.className = 'episode-description';
    description.textContent = episode.description;
    article.appendChild(description);
  }

  // Platform links (only if present)
  const linksSection = createPlatformLinks(episode.links);
  if (linksSection) {
    article.appendChild(linksSection);
  }

  return article;
}

// Render all episodes to the container
function renderEpisodes(episodes) {
  const container = document.getElementById('episodes-container');

  if (!container) {
    console.error('Episodes container not found');
    return;
  }

  // Clear loading state
  container.innerHTML = '';

  // Check if episodes array is empty
  if (episodes.length === 0) {
    const errorMsg = document.createElement('p');
    errorMsg.className = 'error';
    errorMsg.textContent = 'No episodes available at this time. Please try again later.';
    container.appendChild(errorMsg);
    return;
  }

  // Sort episodes by number (descending - newest first)
  const sortedEpisodes = [...episodes].sort((a, b) => b.episode - a.episode);

  // Create and append episode cards
  sortedEpisodes.forEach(episode => {
    const card = createEpisodeCard(episode);
    container.appendChild(card);
  });

  // Handle hash navigation after cards are rendered
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1); // Remove the #
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        // Remove highlight from any previously highlighted cards
        document.querySelectorAll('.episode-card.highlighted').forEach(card => {
          card.classList.remove('highlighted');
        });

        // Add highlight class
        targetElement.classList.add('highlighted');

        // Scroll with offset for better positioning
        const yOffset = -80; // Offset from top
        const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 100);
    }
  }
}

// Initialize the application
async function init() {
  const episodes = await fetchEpisodes();

  if (episodes.length === 0) {
    // Show error state if no episodes loaded
    const container = document.getElementById('episodes-container');
    if (container) {
      container.innerHTML = '<p class="error">Unable to load episodes. Please check your connection and try again.</p>';
    }
    return;
  }

  renderEpisodes(episodes);
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
