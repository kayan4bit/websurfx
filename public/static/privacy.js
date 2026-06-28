/**
 * Privacy Settings Module
 * Handles privacy-related settings including E2EE encryption, tracking protection,
 * request randomization, and external resource blocking.
 */

// Encryption state
let e2eeKey = null;

/**
 * Initialize privacy settings from cookies
 */
function initPrivacySettings() {
  const cookie = decodeURIComponent(document.cookie);
  if (cookie.length) {
    try {
      const cookieParts = cookie.split(';').map(item => item.split('='));
      const cookieValue = cookieParts.reduce((_, [__, v]) => (JSON.parse(v)) && JSON.parse(v), {});

      if (cookieValue.privacy) {
        const privacySettings = cookieValue.privacy;
        
        // Set checkbox states
        const enhancedPrivacy = document.getElementById('enhanced_privacy');
        const requestRandomization = document.getElementById('request_randomization');
        const e2eeEnabled = document.getElementById('e2ee_enabled');
        const noExternal = document.getElementById('no_external');

        if (enhancedPrivacy && privacySettings.enhanced_privacy) {
          enhancedPrivacy.checked = privacySettings.enhanced_privacy;
        }
        if (requestRandomization && privacySettings.request_randomization) {
          requestRandomization.checked = privacySettings.request_randomization;
        }
        if (e2eeEnabled && privacySettings.e2ee_enabled) {
          e2eeEnabled.checked = privacySettings.e2ee_enabled;
          // Initialize E2EE if enabled
          if (privacySettings.e2ee_enabled) {
            initE2EE();
          }
        }
        if (noExternal && privacySettings.no_external) {
          noExternal.checked = privacySettings.no_external;
          applyNoExternalResources(privacySettings.no_external);
        }
      }
    } catch (e) {
      console.log('Privacy settings not found in cookie');
    }
  }
}

/**
 * Generate a random encryption key
 */
async function generateKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
}

/**
 * Export encryption key to base64
 */
async function exportKey(key) {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Import encryption key from base64
 */
async function importKey(keyString) {
  const keyBuffer = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Initialize E2EE system
 */
async function initE2EE() {
  // Check if we have a stored key
  const cookie = decodeURIComponent(document.cookie);
  const keyMatch = cookie.match(/e2ee_key=([^;]+)/);
  
  if (keyMatch) {
    e2eeKey = await importKey(keyMatch[1]);
  } else {
    // Generate new key
    e2eeKey = await generateKey();
    // Store key in cookie (in real app, consider secure storage)
    const keyString = await exportKey(e2eeKey);
    const expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 1);
    document.cookie = `e2ee_key=${keyString}; expires=${expiration.toUTCString()}; SameSite=Strict`;
  }
}

/**
 * Encrypt search query
 */
async function encryptQuery(query) {
  if (!e2eeKey) {
    await initE2EE();
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    e2eeKey,
    data
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Handle search with optional encryption
 */
async function handleEncryptedSearch(event) {
  event.preventDefault();
  
  const cookie = decodeURIComponent(document.cookie);
  let privacySettings = { enhanced_privacy: false, e2ee_enabled: false };
  
  try {
    const cookieParts = cookie.split(';').map(item => item.split('='));
    const cookieValue = cookieParts.reduce((_, [__, v]) => (JSON.parse(v)) && JSON.parse(v), {});
    if (cookieValue.privacy) {
      privacySettings = cookieValue.privacy;
    }
  } catch (e) {
    // Use default settings
  }
  
  const searchInput = document.querySelector('.search_bar input[type="search"]') || 
                      document.querySelector('.search-container input[type="search"]');
  const safeSearchSelect = document.querySelector('.search_options select');
  
  if (!searchInput) return;
  
  let query = searchInput.value.trim();
  if (!query) return;
  
  let searchUrl;
  
  if (privacySettings.e2ee_enabled) {
    // Encrypt the query
    const encryptedQuery = await encryptQuery(query);
    const params = new URLSearchParams();
    params.set('q', encryptedQuery);
    params.set('encrypted', 'true');
    if (safeSearchSelect) {
      params.set('safesearch', safeSearchSelect.value);
    }
    searchUrl = `/search?${params.toString()}`;
  } else {
    // Regular search
    const params = new URLSearchParams();
    params.set('q', query);
    if (safeSearchSelect) {
      params.set('safesearch', safeSearchSelect.value);
    }
    searchUrl = `/search?${params.toString()}`;
  }
  
  // Apply request randomization if enabled
  if (privacySettings.request_randomization) {
    const delay = Math.random() * 1000 + 500; // 500-1500ms delay
    setTimeout(() => {
      window.location.href = searchUrl;
    }, delay);
  } else {
    window.location.href = searchUrl;
  }
}

/**
 * Apply no external resources setting
 */
function applyNoExternalResources(enabled) {
  if (enabled) {
    // Prevent loading external fonts
    const fonts = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    fonts.forEach(font => font.remove());
    
    // Add inline font fallback styles
    const style = document.createElement('style');
    style.textContent = `
      * {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Enhanced tracking protection - remove tracking parameters
 */
function applyTrackingProtection() {
  // Remove tracking parameters from URLs
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    try {
      const url = new URL(link.href);
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => url.searchParams.delete(param));
      link.href = url.toString();
    } catch (e) {
      // Invalid URL, skip
    }
  });
}

/**
 * Save privacy settings to cookie
 */
function savePrivacySettings() {
  const enhancedPrivacy = document.getElementById('enhanced_privacy');
  const requestRandomization = document.getElementById('request_randomization');
  const e2eeEnabled = document.getElementById('e2ee_enabled');
  const noExternal = document.getElementById('no_external');
  
  const privacySettings = {
    enhanced_privacy: enhancedPrivacy ? enhancedPrivacy.checked : false,
    request_randomization: requestRandomization ? requestRandomization.checked : false,
    e2ee_enabled: e2eeEnabled ? e2eeEnabled.checked : false,
    no_external: noExternal ? noExternal.checked : false
  };
  
  // Get existing cookie or create new
  let cookie = {};
  const cookieStr = decodeURIComponent(document.cookie);
  if (cookieStr.length) {
    try {
      const cookieParts = cookieStr.split(';').map(item => item.split('='));
      cookie = cookieParts.reduce((acc, [k, v]) => (acc[k.trim()] = JSON.parse(v)) && acc, {});
    } catch (e) {
      cookie = {};
    }
  }
  
  cookie.appCookie = JSON.stringify({
    ...cookie.appCookie ? JSON.parse(cookie.appCookie) : {},
    privacy: privacySettings
  });
  
  const expiration = new Date();
  expiration.setFullYear(expiration.getFullYear() + 1);
  
  document.cookie = `appCookie=${cookie.appCookie}; expires=${expiration.toUTCString()}`;
  
  // Initialize E2EE if enabled
  if (privacySettings.e2ee_enabled) {
    initE2EE();
  }
  
  // Apply no external resources if enabled
  applyNoExternalResources(privacySettings.no_external);
  
  // Apply tracking protection if enabled
  if (privacySettings.enhanced_privacy) {
    applyTrackingProtection();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPrivacySettings);

// Attach encryption handlers to search forms
document.addEventListener('DOMContentLoaded', () => {
  const searchForms = document.querySelectorAll('.search_bar, .search-container');
  searchForms.forEach(form => {
    if (!form.tagName === 'FORM') {
      form.addEventListener('submit', handleEncryptedSearch);
    }
  });
  
  // For forms
  const actualForms = document.querySelectorAll('form[action*="search"]');
  actualForms.forEach(form => {
    form.addEventListener('submit', handleEncryptedSearch);
  });
});
