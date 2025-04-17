// Default conversion rate values
const DEFAULT_ROBUX_AMOUNT = 1000;
const DEFAULT_DOLLAR_AMOUNT = 3.5;

// Variable to store the actual conversion rate
let robuxConversionRate = DEFAULT_ROBUX_AMOUNT / DEFAULT_DOLLAR_AMOUNT;

// Immediate test of the problematic case - run this before any async code
console.log('======== DIRECT TEST ========');
// Set up the default conversion rate
robuxConversionRate = DEFAULT_ROBUX_AMOUNT / DEFAULT_DOLLAR_AMOUNT;
console.log(`Conversion rate: ${robuxConversionRate} Robux per dollar`);

// Test the specific cases that were failing
const testInput1 = '$114,799';
console.log(`\nDirect test of "${testInput1}"`);
// US format should have commas as thousands separators, not decimal
let hasCommaDecimal = /,\d{2}(?!\d)/.test(testInput1);
let hasThousandsDots = /\d{1,3}(\.\d{3})+/.test(testInput1);
console.log(`Format detection - hasCommaDecimal: ${hasCommaDecimal}, hasThousandsDots: ${hasThousandsDots}`);
console.log(`Is European format? ${hasCommaDecimal && hasThousandsDots}`);
// This should be false for US format

const testInput2 = '1.234,56€';
console.log(`\nDirect test of "${testInput2}"`);
// European format should have dots as thousands separators and comma as decimal
hasCommaDecimal = /,\d{2}(?!\d)/.test(testInput2);
hasThousandsDots = /\d{1,3}(\.\d{3})+/.test(testInput2);
console.log(`Format detection - hasCommaDecimal: ${hasCommaDecimal}, hasThousandsDots: ${hasThousandsDots}`);
console.log(`Is European format? ${hasCommaDecimal && hasThousandsDots}`);
// This should be true for European format
console.log('======== END DIRECT TEST ========');

// Robux SVG icon as a base64 encoded string for inline usage
const ROBUX_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 26.1" width="16" height="16" style="vertical-align: middle; margin-left: 3px;"><defs><style>.cls-1{fill:url(#linear-gradient);}</style><linearGradient id="linear-gradient" x1="-21.63" y1="63.75" x2="-21.63" y2="62.78" gradientTransform="matrix(24, 0, 0, -26.1, 531, 1665.03)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eedfa2"/><stop offset="0.59" stop-color="#a9935a"/><stop offset="1" stop-color="#fee3a5"/></linearGradient></defs><g id="Layer_2" data-name="Layer 2"><g id="Web-Spritesheet"><path id="path-2" class="cls-1" d="M21.4,4.62A5.2,5.2,0,0,1,24,9.12V17a5.19,5.19,0,0,1-2.6,4.5l-6.8,3.93a5.19,5.19,0,0,1-5.2,0L2.6,21.48A5.19,5.19,0,0,1,0,17V9.12a5.2,5.2,0,0,1,2.6-4.5L9.4.7a5.19,5.19,0,0,1,5.2,0ZM10.31,2.48,3.69,6.31A3.35,3.35,0,0,0,2,9.23v7.65A3.36,3.36,0,0,0,3.69,19.8l6.62,3.83a3.4,3.4,0,0,0,3.38,0l6.62-3.83A3.36,3.36,0,0,0,22,16.88V9.23a3.35,3.35,0,0,0-1.69-2.92L13.69,2.48a3.4,3.4,0,0,0-3.38,0Zm3.08,2.14,5.22,3A2.78,2.78,0,0,1,20,10v6a2.76,2.76,0,0,1-1.39,2.4l-5.22,3a2.76,2.76,0,0,1-2.78,0l-5.22-3A2.76,2.76,0,0,1,4,16.07V10A2.78,2.78,0,0,1,5.39,7.63l5.22-3a2.76,2.76,0,0,1,2.78,0ZM9,16.05h6v-6H9Z"/></g></g></svg>`;

// Set to keep track of processed nodes to avoid re-processing
const processedNodes = new Set();

// Keep track of conversions for this session
let sessionConversionCount = 0;

// Flag to indicate if processing is in progress
let isProcessing = false;

// Add debug mode capability
const DEBUG_MODE = true; // Set to true to enable console logging

// Helper function for debugging
function debugLog(...args) {
  if (DEBUG_MODE) {
    console.log('[Robux Converter]', ...args);
  }
}

// Performance optimization - only process visible elements
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= -100 &&
    rect.left >= -100 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 100 &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + 100
  );
}

// Load the conversion rate from settings
function loadConversionRate() {
  return new Promise((resolve) => {
    if (chrome && chrome.storage) {
      chrome.storage.sync.get({
        'robuxAmount': DEFAULT_ROBUX_AMOUNT,
        'dollarAmount': DEFAULT_DOLLAR_AMOUNT
      }, function(items) {
        // The conversion rate should be Robux per dollar
        // So if 1000 Robux = $3.5, then 1 dollar = 1000/3.5 Robux = 285.71 Robux
        robuxConversionRate = items.robuxAmount / items.dollarAmount;
        console.log(`Loaded conversion settings: ${items.robuxAmount} Robux = $${items.dollarAmount}`);
        console.log(`Calculated conversion rate: $1 = ${robuxConversionRate} Robux`);
        resolve();
      });
    } else {
      // Fallback to default if storage is not available
      robuxConversionRate = DEFAULT_ROBUX_AMOUNT / DEFAULT_DOLLAR_AMOUNT;
      console.log(`Using default conversion rate: $1 = ${robuxConversionRate} Robux`);
      resolve();
    }
  });
}

// Helper function to format numbers with commas
function formatNumberWithCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Debounce function to limit how often a function is called
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Check if a node contains a price 
function nodeContainsPrice(node) {
  if (!node || !node.nodeValue || node.nodeValue.trim() === '') return false;
  
  // Check each price regex pattern
  for (const regex of priceRegexes) {
    if (regex.test(node.nodeValue)) {
      return true;
    }
  }
  return false;
}

// Process a batch of nodes
function processBatch(textNodes, startIndex, batchSize, callback) {
  // If we've reached the end of the array, call the callback
  if (startIndex >= textNodes.length) {
    callback();
    return;
  }
  
  // Calculate the end index for this batch
  const endIndex = Math.min(startIndex + batchSize, textNodes.length);
  let localConversionCount = 0;
  
  // Process this batch
  for (let i = startIndex; i < endIndex; i++) {
    const textNode = textNodes[i];
    
    if (processedNodes.has(textNode)) continue;
    
    // Skip nodes that aren't visible
    if (textNode.parentNode && !isElementInViewport(textNode.parentNode)) {
      continue;
    }
    
    processedNodes.add(textNode);
    
    const originalText = textNode.nodeValue;
    
    // Process the text
    priceRegexes.forEach(regex => {
      regex.lastIndex = 0;
      const matches = originalText.match(regex);
      
      if (matches) {
        const parent = textNode.parentNode;
        if (!parent) return;
        
        // Create a document fragment to hold the new content
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        matches.forEach(match => {
          // Find where this match occurs in the original text
          const matchIndex = originalText.indexOf(match, lastIndex);
          
          // Add any text before this match
          if (matchIndex > lastIndex) {
            fragment.appendChild(document.createTextNode(originalText.substring(lastIndex, matchIndex)));
          }
          
          // Create the robux span
          const robuxAmount = convertToRobux(match);
          const span = document.createElement('span');
          span.innerHTML = robuxAmount;
          fragment.appendChild(span);
          
          // Update lastIndex
          lastIndex = matchIndex + match.length;
          localConversionCount++;
          sessionConversionCount++;
        });
        
        // Add any remaining text
        if (lastIndex < originalText.length) {
          fragment.appendChild(document.createTextNode(originalText.substring(lastIndex)));
        }
        
        // Replace the old text node with our new fragment
        parent.replaceChild(fragment, textNode);
      }
    });
  }
  
  // Schedule the next batch to allow the UI to update
  setTimeout(() => {
    processBatch(textNodes, endIndex, batchSize, callback);
  }, 0);
}

// Regular expressions to match various price formats
const priceRegexes = [
  // Basic currency formats
  /\$\s*[\d,]+(\.\d{1,2})?/g,      // USD: $XX,XXX.XX
  /£\s*[\d,]+(\.\d{1,2})?/g,       // GBP: £XX,XXX.XX
  /€\s*[\d,]+(\.\d{1,2})?/g,       // EUR: €XX,XXX.XX
  /[\d,]+(\.\d{1,2})?\s*USD/g,     // XX,XXX.XX USD
  /[\d,]+(\.\d{1,2})?\s*dollars/ig,// XX,XXX.XX dollars
  /[\d,]+(\.\d{1,2})?\s*GBP/ig,    // XX,XXX.XX GBP
  /[\d,]+(\.\d{1,2})?\s*EUR/ig,    // XX,XXX.XX EUR
  
  // Currency symbols followed by numbers
  /[£$€¥₽₹]\s*[\d,]+(\.\d{1,2})?/g, // Currency symbol + number with optional decimal
  /[£$€¥₽₹][\d,]+/g,                // StockX format: Symbol + number without space
  
  // Numbers followed by currency symbols/codes
  /[\d,]+(\.\d{1,2})?\s*[£$€¥₽₹]/g, // Number followed by currency symbol
  
  // International formats
  /US\$[\d,]+(\.\d{1,2})?/g,       // US$ format
  /\(US\$[\d,]+(\.\d{1,2})?\)/g,   // Parenthesized US$ format
  
  // Number-only patterns (must be checked after element context is considered)
  /^\s*[\d,]+\.\d{2}\s*$/g,        // XX,XXX.XX (only in price elements)
  
  // Various decimal separators (European format)
  /[£$€]\s*[\d.]+,\d{2}/g,         // €1.234,56 (European format)
  /[\d.]+,\d{2}\s*[£$€]/g,         // 1.234,56€ (European format)
  
  // Common word patterns
  /[\d,]+(\.\d{1,2})?\s*(eur|euro|euros)/ig,  // With euro text
  /[\d,]+(\.\d{1,2})?\s*(gbp|pound|pounds)/ig, // With pound text
  /[\d,]+(\.\d{1,2})?\s*(usd|dollar|dollars)/ig // With dollar text
];

// Site-specific selectors to check
const siteSpecificSelectors = {
  // StockX selectors
  stockx: [
    '[data-testid="product-tile-lowest-ask-amount"]',
    '.css-sk35rx',
    '.chakra-text'
  ],
  // Amazon selectors
  amazon: [
    '.a-price',
    '.a-price-whole',
    '.a-price-fraction',
    '.a-offscreen',
    '.p13n-sc-price',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-color-price'
  ],
  // Google Shopping selectors
  google: [
    '.lmQWe',
    '.pVBUqb',
    '.FG68Ac .VQgkpe',
    '.DoCHT',
    '.qfU1dc',
    '.e10twf',
    '.T4OwTb span',
    '.xVDlwd',
    '.a8Pemb',
    '[aria-label*="Current price"]',
    '[aria-label*="price"]',
    '.YMlIz > span'
  ],
  // eBay selectors
  ebay: [
    '.x-price',
    '.x-price-primary',
    '.x-bin-price',
    '.displayed-price',
    '[itemprop="price"]',
    '.vi-price'
  ],
  // Shopify-based stores
  shopify: [
    '.price',
    '.product__price',
    '.price-item',
    '.product-single__price',
    '[data-product-price]',
    '.money'
  ],
  // Walmart
  walmart: [
    '.price-characteristic',
    '.price-group',
    '[data-automation="product-price"]',
    '[data-automation="buybox-price"]'
  ],
  // AliExpress
  aliexpress: [
    '.product-price-value',
    '.uniform-banner-box-price',
    '.price-current'
  ],
  // Etsy
  etsy: [
    '.price-amount',
    '.wt-text-title-01',
    '.currency-value'
  ],
  // General price selectors that work across sites
  general: [
    // Class-based selectors
    '[class*="price"]',
    '[class*="Price"]',
    '[class*="cost"]',
    '[class*="Cost"]',
    '[class*="amount"]',
    '[class*="Amount"]',
    '[class*="currency"]',
    '[class*="Currency"]',
    '[class*="money"]',
    '[class*="Money"]',
    // ID-based selectors
    '[id*="price"]',
    '[id*="Price"]',
    '[id*="cost"]',
    '[id*="amount"]',
    // Attribute-based selectors
    '[itemprop="price"]',
    '[data-price]',
    '[data-product-price]',
    // Schema.org markup
    '[itemtype*="Product"] [itemprop="price"]',
    '[itemtype*="Offer"] [itemprop="price"]'
  ]
};

// Combine all selectors into one array
const allSelectors = [
  ...siteSpecificSelectors.stockx,
  ...siteSpecificSelectors.amazon,
  ...siteSpecificSelectors.google,
  ...siteSpecificSelectors.ebay,
  ...siteSpecificSelectors.shopify,
  ...siteSpecificSelectors.walmart,
  ...siteSpecificSelectors.aliexpress,
  ...siteSpecificSelectors.etsy,
  ...siteSpecificSelectors.general
];

// Domain-specific overrides for better targeting
const domainOverrides = {
  'amazon': {
    additionalSelectors: ['.a-price', '#corePriceDisplay_desktop_feature_div'],
    skipSelectors: ['.a-size-small']
  },
  'ebay': {
    additionalSelectors: ['.x-price-primary'],
    currencySelectors: ['.ux-textspans--BOLD']
  },
  'walmart': {
    additionalSelectors: ['.price-characteristic'],
    priceContainerSelectors: ['.price-box']
  },
  'etsy': {
    additionalSelectors: ['.wt-text-title-01'],
    skipSelectors: ['.wt-text-caption']
  },
  'newegg': {
    additionalSelectors: ['.price-current']
  },
  'bestbuy': {
    additionalSelectors: ['.priceView-customer-price span']
  },
  'target': {
    additionalSelectors: ['.style__PriceFontSize']
  }
};

// Function to extract a price from an element, considering various HTML structures
function extractPriceFromElement(element) {
  // Handle null or undefined element
  if (!element) return '';
  
  // First, check if this is an Amazon price element with special structure
  if (element.classList && element.classList.contains('a-price')) {
    // Try to get the offscreen text first (most accurate)
    const offscreen = element.querySelector('.a-offscreen');
    if (offscreen) {
      return offscreen.textContent.trim();
    }
    
    // Otherwise try to build from parts
    const symbol = element.querySelector('.a-price-symbol');
    const whole = element.querySelector('.a-price-whole');
    const fraction = element.querySelector('.a-price-fraction');
    
    if (symbol && whole) {
      return symbol.textContent.trim() + 
             whole.textContent.trim() + 
             (fraction ? '.' + fraction.textContent.trim() : '');
    }
  }
  
  // For Google Shopping with parenthesized alternate price
  if (element.classList && element.classList.contains('DoCHT') && element.textContent.includes('US$')) {
    return element.textContent.trim();
  }
  
  // For Google price elements with aria-label (often contains the price)
  if (element.hasAttribute && element.hasAttribute('aria-label') && element.getAttribute('aria-label').includes('price')) {
    return element.getAttribute('aria-label').replace('Current price: ', '').trim();
  }
  
  // For Google's e10twf class - standard format
  if (element.classList && element.classList.contains('e10twf')) {
    return element.textContent.trim();
  }
  
  // For Walmart's price characteristic + price mantissa
  if (element.classList && element.classList.contains('price-characteristic')) {
    const mantissa = element.parentNode ? element.parentNode.querySelector('.price-mantissa') : null;
    if (mantissa) {
      return `$${element.textContent.trim()}.${mantissa.textContent.trim()}`;
    }
  }
  
  // For eBay prices
  if (element.getAttribute && element.getAttribute('itemprop') === 'price' && element.getAttribute('content')) {
    return element.getAttribute('content');
  }
  
  // For elements with data-price attribute (common in Shopify)
  if (element.getAttribute && element.getAttribute('data-price')) {
    const price = element.getAttribute('data-price');
    // Shopify often stores prices in cents
    if (price.length > 2 && !price.includes('.')) {
      const dollars = parseFloat(price) / 100;
      return `$${dollars.toFixed(2)}`;
    }
    return `$${price}`;
  }
  
  // Handle microdata price
  if (element.getAttribute && element.getAttribute('itemprop') === 'price') {
    if (element.getAttribute('content')) {
      return element.getAttribute('content');
    }
  }
  
  // Default: just use the element's text content
  return element.textContent.trim();
}

// Function to convert a dollar amount to Robux
function convertToRobux(dollarAmount) {
  console.log('==== CONVERSION DEBUG ====');
  console.log(`1. Original input: "${dollarAmount}"`);
  
  // Clean the input to handle various formats
  let cleanedAmount = dollarAmount;
  
  // Replace common thousand separators and decimal points
  cleanedAmount = cleanedAmount.replace(/\s/g, '');
  console.log(`2. After removing spaces: "${cleanedAmount}"`);
  
  // Check for European format (1.234,56€)
  // European format has "." as thousand separator and "," as decimal point
  // It must have dots followed by comma, and the comma must be followed by exactly 2 digits
  // Example: 1.234,56 or 1.234.567,89
  const hasCommaDecimal = /,\d{2}(?!\d)/.test(cleanedAmount);
  const hasThousandsDots = /\d{1,3}(\.\d{3})+/.test(cleanedAmount);
  const isEuropeanFormat = hasCommaDecimal && hasThousandsDots;
  
  console.log(`3. Format detection - hasCommaDecimal: ${hasCommaDecimal}, hasThousandsDots: ${hasThousandsDots}`);
  
  if (isEuropeanFormat) {
    console.log(`4a. Detected European format (dots for thousands, comma for decimal)`);
    cleanedAmount = cleanedAmount.replace(/\./g, '').replace(',', '.');
    console.log(`4b. Converted to standard format: "${cleanedAmount}"`);
  } else {
    // US/UK format has "," as thousand separator and "." as decimal
    // Just remove all commas
    const noCommas = cleanedAmount.replace(/,/g, '');
    console.log(`4c. Standard US/UK format - removing commas: "${noCommas}"`);
    cleanedAmount = noCommas;
  }
  
  // Now remove currency signs and any other non-numeric characters except decimal point
  const numericValue = parseFloat(cleanedAmount.replace(/[^\d.]/g, ''));
  console.log(`5. Extracted numeric value: ${numericValue}`);
  
  if (isNaN(numericValue)) {
    console.log('ERROR: Could not extract a valid number!');
    return dollarAmount;
  }
  
  // Get the conversion rate
  console.log(`6. Using conversion rate: ${robuxConversionRate} (${DEFAULT_ROBUX_AMOUNT} Robux = $${DEFAULT_DOLLAR_AMOUNT})`);
  
  // Convert to Robux using the loaded conversion rate
  const robuxAmount = numericValue * robuxConversionRate;
  console.log(`7. Calculation: ${numericValue} × ${robuxConversionRate} = ${robuxAmount} Robux`);
  
  // Round to nearest whole number
  const roundedAmount = Math.round(robuxAmount);
  console.log(`8. Rounded amount: ${roundedAmount} Robux`);
  
  // Format with commas for thousands and add Robux icon
  const formattedAmount = formatNumberWithCommas(roundedAmount) + ` ${ROBUX_ICON_SVG}`;
  console.log(`9. Final formatted output: "${formattedAmount}"`);
  console.log('========================');
  
  return formattedAmount;
}

// Function to find and process site-specific patterns based on the current domain
function addSiteSpecificSelectors() {
  // Get the current domain
  const domain = window.location.hostname.replace('www.', '');
  
  // Check if we have any domain-specific overrides
  for (const [siteDomain, config] of Object.entries(domainOverrides)) {
    if (domain.includes(siteDomain)) {
      debugLog(`Applying domain-specific overrides for ${siteDomain}`);
      
      // Add any additional selectors
      if (config.additionalSelectors) {
        for (const selector of config.additionalSelectors) {
          if (!allSelectors.includes(selector)) {
            allSelectors.push(selector);
          }
        }
      }
      
      // Apply special handling for this site if necessary
      if (siteDomain === 'amazon') {
        // Special handling for Amazon
        const priceBlocks = document.querySelectorAll('#corePriceDisplay_desktop_feature_div');
        if (priceBlocks.length > 0) {
          debugLog('Found Amazon price blocks');
        }
      } else if (siteDomain === 'walmart') {
        // Special handling for Walmart
        const priceBoxes = document.querySelectorAll('.price-box');
        if (priceBoxes.length > 0) {
          debugLog('Found Walmart price boxes');
        }
      }
      
      // We found a matching domain, no need to check others
      break;
    }
  }
}

// Find and process site-specific prices
function findSiteSpecificPrices() {
  let priceElements = [];
  
  // First add any site-specific selectors based on the current domain
  addSiteSpecificSelectors();
  
  // Query for all selectors
  allSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        priceElements = [...priceElements, ...Array.from(elements)];
      }
    } catch (e) {
      // Ignore invalid selectors
      debugLog("Invalid selector:", selector, e);
    }
  });
  
  // Store original parents to avoid duplicates when dealing with nested price elements
  const processedParents = new WeakSet();
  
  // Process the found elements
  priceElements.forEach(element => {
    // If we've already processed this element or one of its ancestors, skip it
    if (processedNodes.has(element)) return;
    
    // Skip invisible elements
    if (!isElementInViewport(element)) return;
    
    // Skip if any parent is already processed
    let parent = element.parentNode;
    let skipDueToParent = false;
    while (parent) {
      if (processedNodes.has(parent) || processedParents.has(parent)) {
        skipDueToParent = true;
        break;
      }
      parent = parent.parentNode;
    }
    if (skipDueToParent) return;
    
    // Special handling for Google's T4OwTb div
    if (element.parentNode && element.parentNode.classList && element.parentNode.classList.contains('T4OwTb')) {
      processedNodes.add(element.parentNode);
      processedParents.add(element.parentNode);
    }
    
    // Mark as processed
    processedNodes.add(element);
    if (element.parentNode) {
      processedParents.add(element.parentNode);
    }
    
    // Extract the price text, handling special site structures
    const priceText = extractPriceFromElement(element);
    
    // If the element doesn't contain any text, skip it
    if (!priceText || priceText.trim() === '') return;
    
    // Check if it matches any of our price patterns
    let foundMatch = false;
    for (const regex of priceRegexes) {
      regex.lastIndex = 0;
      if (regex.test(priceText)) {
        foundMatch = true;
        break;
      }
    }
    
    // Also check for numeric-only patterns, but only if the element looks like a price context
    if (!foundMatch && /^\s*[\d,]+\.?\d*\s*$/.test(priceText) && 
        (element.className && (
          element.className.toLowerCase().includes('price') || 
          element.className.toLowerCase().includes('cost') || 
          element.className.toLowerCase().includes('amount')
        ))) {
      foundMatch = true;
    }
    
    if (foundMatch) {
      // Convert the price text to Robux
      const robuxAmount = convertToRobux(priceText);
      
      // Handle different element types
      if (element.tagName === 'INPUT') {
        // For input elements, set the value
        element.value = robuxAmount.replace(/<[^>]*>/g, ''); // Strip HTML tags
      } else {
        // Create a wrapper for normal elements
        const wrapper = document.createElement('span');
        wrapper.style.display = 'inline-block';
        
        // Preserve original classes and attributes that might be needed for styling
        if (element.className) {
          wrapper.className = element.className;
        }
        
        wrapper.innerHTML = robuxAmount;
        
        // For Amazon prices, try to maintain their structure
        if (element.classList && element.classList.contains('a-price')) {
          // Just update the visible part while keeping structure
          const visiblePart = element.querySelector('[aria-hidden="true"]');
          if (visiblePart) {
            visiblePart.innerHTML = robuxAmount;
            // Update the screen-reader text too
            const offscreen = element.querySelector('.a-offscreen');
            if (offscreen) {
              offscreen.textContent = robuxAmount.replace(/<[^>]*>/g, '');
            }
            // Don't replace the element, just count it
            sessionConversionCount++;
            return;
          }
        }
        
        // For Google's T4OwTb > e10twf structure
        if (element.classList && element.classList.contains('e10twf') && 
            element.parentNode && element.parentNode.classList && 
            element.parentNode.classList.contains('T4OwTb')) {
          try {
            element.innerHTML = robuxAmount;
            sessionConversionCount++;
            return;
          } catch (e) {
            debugLog("Error updating Google price:", e);
          }
        }
        
        // For Walmart's price characteristic
        if (element.classList && element.classList.contains('price-characteristic')) {
          try {
            // Find the price container
            let priceContainer = element.parentNode;
            while (priceContainer && !priceContainer.classList.contains('price-box')) {
              priceContainer = priceContainer.parentNode;
            }
            
            if (priceContainer) {
              // Create a new element to replace the entire price structure
              const newPrice = document.createElement('span');
              newPrice.className = 'robux-price';
              newPrice.innerHTML = robuxAmount;
              
              // Replace the price container with our new price
              priceContainer.parentNode.replaceChild(newPrice, priceContainer);
              sessionConversionCount++;
              return;
            }
          } catch (e) {
            debugLog("Error updating Walmart price:", e);
          }
        }
        
        // Replace the element's content if we didn't do special handling
        try {
          element.innerHTML = robuxAmount;
          sessionConversionCount++;
        } catch (e) {
          debugLog("Error replacing element:", e);
        }
      }
    }
  });
}

// Find and replace prices on the page with better performance
function findAndReplacePrices(isUserTriggered = false) {
  // If already processing, don't start another job
  if (isProcessing) return;
  isProcessing = true;
  
  // First load the conversion rate from settings
  loadConversionRate().then(() => {
    // Reset the session conversion count if this is user-triggered
    if (isUserTriggered) {
      sessionConversionCount = 0;
    }
    
    const startTime = performance.now();
    
    // If this is user-triggered, we want to do a complete scan
    if (isUserTriggered) {
      debugLog('Triggered by user, clearing processed nodes cache');
      processedNodes.clear();
    }
    
    // Run a direct capture of Google's price format first
    try {
      const googlePrices = document.querySelectorAll('.T4OwTb .e10twf');
      googlePrices.forEach(element => {
        if (!processedNodes.has(element)) {
          debugLog('Found Google price element:', element);
          processedNodes.add(element);
          element.innerHTML = convertToRobux(element.textContent.trim());
          sessionConversionCount++;
        }
      });
    } catch (e) {
      debugLog('Error processing Google prices:', e);
    }
    
    // First check for site-specific elements (StockX, Amazon, Google)
    findSiteSpecificPrices();
    
    // Get visible elements only for better performance
    const visibleElements = [];
    const elementsToCheck = document.querySelectorAll('body *');
    
    for (let i = 0; i < elementsToCheck.length; i++) {
      if (isElementInViewport(elementsToCheck[i])) {
        visibleElements.push(elementsToCheck[i]);
      }
      
      // Only check a limited number of elements to prevent slowdown
      if (visibleElements.length >= 200) break;
    }
    
    // Find text nodes that contain prices
    const textNodes = [];
    
    visibleElements.forEach(element => {
      // Skip script, style, and nodes that are already processed
      if (element.tagName === 'SCRIPT' || 
          element.tagName === 'STYLE' || 
          element.tagName === 'SVG' ||
          processedNodes.has(element)) {
        return;
      }
      
      // Check child text nodes
      const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
      let node;
      
      while ((node = walk.nextNode()) && textNodes.length < 500) {
        if (!processedNodes.has(node) && nodeContainsPrice(node)) {
          textNodes.push(node);
        }
      }
    });
    
    // Process in batches of 20 nodes
    const batchSize = 20;
    processBatch(textNodes, 0, batchSize, () => {
      isProcessing = false;
      
      // Show a message only if we converted something
      if (sessionConversionCount > 0) {
        showConversionMessage();
      }
      
      debugLog(`Processing completed in ${(performance.now() - startTime).toFixed(2)}ms, converted ${sessionConversionCount} prices`);
      console.log(`Processing completed in ${(performance.now() - startTime).toFixed(2)}ms, converted ${sessionConversionCount} prices`);
    });
  });
}

// Show message about conversion
function showConversionMessage() {
  // Remove any existing message
  const existingMessage = document.getElementById('robux-conversion-message');
  if (existingMessage) {
    document.body.removeChild(existingMessage);
  }
  
  // Create new message
  const message = document.createElement('div');
  message.id = 'robux-conversion-message';
  message.style.position = 'fixed';
  message.style.top = '10px';
  message.style.right = '10px';
  message.style.backgroundColor = '#00b06f';
  message.style.color = 'white';
  message.style.padding = '10px';
  message.style.borderRadius = '5px';
  message.style.zIndex = '9999';
  message.style.fontFamily = 'Arial, sans-serif';
  message.innerHTML = `Converted ${sessionConversionCount} prices to Robux<br>
                      <small>Rate: ${DEFAULT_ROBUX_AMOUNT} ${ROBUX_ICON_SVG} = $${DEFAULT_DOLLAR_AMOUNT}</small>`;
  
  document.body.appendChild(message);
  
  // Remove the message after 3 seconds
  setTimeout(() => {
    if (document.body.contains(message)) {
      document.body.removeChild(message);
    }
  }, 3000);
}

// Debounced version of findAndReplacePrices for the scroll handler
const debouncedFindAndReplace = debounce(findAndReplacePrices, 250);

// Function to handle dynamic content loading with better performance
function observePageChanges() {
  // Create a MutationObserver to watch for changes to the DOM
  const observer = new MutationObserver(debounce((mutations) => {
    let shouldScanForPrices = false;
    
    // Quick check if there are any significant changes
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScanForPrices = true;
        
        // Check if we have Google price elements in the added nodes
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && (node.classList.contains('T4OwTb') || node.classList.contains('e10twf'))) {
              debugLog('Detected Google price element added to DOM');
              // Process immediately
              findAndReplacePrices(false);
              return;
            }
            
            // Check for Google price in descendants
            const googlePrices = node.querySelectorAll && node.querySelectorAll('.T4OwTb .e10twf');
            if (googlePrices && googlePrices.length > 0) {
              debugLog('Detected Google price elements in added DOM subtree');
              // Process immediately
              findAndReplacePrices(false);
              return;
            }
          }
        }
        
        break;
      }
    }
    
    // If new content was added, scan for prices again but without resetting count
    if (shouldScanForPrices) {
      findAndReplacePrices(false);
    }
  }, 500));
  
  // Start observing the document body for changes - use more specific targets if possible
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false // Don't need character data changes
  });
  
  // Also scan for new prices when the user scrolls
  window.addEventListener('scroll', debouncedFindAndReplace, { passive: true });
}

// Listen for the conversion event from the popup - this will be user-triggered
document.addEventListener('convertToRobux', () => {
  // Reset processed nodes to allow re-processing
  processedNodes.clear();
  findAndReplacePrices(true);
});

// Test conversion function directly
function testConversion() {
  console.log('===== TESTING CONVERSION CASES =====');
  
  // Define test cases: [input, expected numeric value]
  const testCases = [
    ['$114,799', 114799],       // US format with comma as thousands separator
    ['$1,234.56', 1234.56],     // US format with decimal
    ['1.234,56€', 1234.56],     // European format with dot as thousands and comma as decimal
    ['£42.99', 42.99],          // UK price
    ['123,456', 123456],        // Number with comma thousands separator
    ['123456', 123456],         // Plain number
    ['$114,799.99', 114799.99], // US format with comma and decimal
    ['1.234.567,89 €', 1234567.89] // European format with multiple dots
  ];
  
  // Run tests
  for (const [input, expected] of testCases) {
    console.log(`\nTesting: "${input}"`);
    
    // Get numeric value
    let cleanedAmount = input.replace(/\s/g, '');
    
    // Check for European format
    const hasCommaDecimal = /,\d{2}(?!\d)/.test(cleanedAmount);
    const hasThousandsDots = /\d{1,3}(\.\d{3})+/.test(cleanedAmount);
    const isEuropeanFormat = hasCommaDecimal && hasThousandsDots;
    
    console.log(`Format detection - hasCommaDecimal: ${hasCommaDecimal}, hasThousandsDots: ${hasThousandsDots}`);
    
    if (isEuropeanFormat) {
      console.log(`European format detected`);
      cleanedAmount = cleanedAmount.replace(/\./g, '').replace(',', '.');
    } else {
      console.log(`Standard US/UK format detected`);
      cleanedAmount = cleanedAmount.replace(/,/g, '');
    }
    
    const numericValue = parseFloat(cleanedAmount.replace(/[^\d.]/g, ''));
    
    // Calculate expected Robux
    const expectedRobux = Math.round(expected * (DEFAULT_ROBUX_AMOUNT / DEFAULT_DOLLAR_AMOUNT));
    const formattedExpected = formatNumberWithCommas(expectedRobux);
    
    console.log(`Numeric value: ${numericValue} (Expected: ${expected})`);
    console.log(`Robux: ${formattedExpected}`);
    
    if (Math.abs(numericValue - expected) > 0.01) {
      console.error(`❌ Test failed: Got ${numericValue}, expected ${expected}`);
    } else {
      console.log('✅ Test passed');
    }
  }
  
  console.log('\n===== END TESTING =====');
}

// Run test cases immediately
testConversion();

// Run the price finder when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Test the conversion of the problematic case
    console.log('==== TEST CONVERSION ====');
    const testCase = '$114,799';
    console.log(`Testing conversion of: ${testCase}`);
    const result = convertToRobux(testCase);
    console.log(`Result: ${result}`);
    console.log('==== END TEST ====');
    
    setTimeout(() => findAndReplacePrices(true), 500);
    observePageChanges();
  });
} else {
  // Test the conversion of the problematic case
  console.log('==== TEST CONVERSION ====');
  const testCase = '$114,799';
  console.log(`Testing conversion of: ${testCase}`);
  const result = convertToRobux(testCase);
  console.log(`Result: ${result}`);
  console.log('==== END TEST ====');
  
  setTimeout(() => findAndReplacePrices(true), 500);
  observePageChanges();
} 