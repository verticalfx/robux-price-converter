// Default conversion rate values
const DEFAULT_ROBUX_AMOUNT = 1000;
const DEFAULT_DOLLAR_AMOUNT = 3.5;

// Variable to store the actual conversion rate
let robuxConversionRate = DEFAULT_ROBUX_AMOUNT / DEFAULT_DOLLAR_AMOUNT;

// Flag to control auto-conversion on page load
const AUTO_CONVERT_ON_LOAD = false; // Set to false for better performance

// Robux SVG icon as a base64 encoded string for inline usage
const ROBUX_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 26.1" width="16" height="16" style="vertical-align: middle; margin-left: 3px;"><defs><style>.cls-1{fill:url(#linear-gradient);}</style><linearGradient id="linear-gradient" x1="-21.63" y1="63.75" x2="-21.63" y2="62.78" gradientTransform="matrix(24, 0, 0, -26.1, 531, 1665.03)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eedfa2"/><stop offset="0.59" stop-color="#a9935a"/><stop offset="1" stop-color="#fee3a5"/></linearGradient></defs><g id="Layer_2" data-name="Layer 2"><g id="Web-Spritesheet"><path id="path-2" class="cls-1" d="M21.4,4.62A5.2,5.2,0,0,1,24,9.12V17a5.19,5.19,0,0,1-2.6,4.5l-6.8,3.93a5.19,5.19,0,0,1-5.2,0L2.6,21.48A5.19,5.19,0,0,1,0,17V9.12a5.2,5.2,0,0,1,2.6-4.5L9.4.7a5.19,5.19,0,0,1,5.2,0ZM10.31,2.48,3.69,6.31A3.35,3.35,0,0,0,2,9.23v7.65A3.36,3.36,0,0,0,3.69,19.8l6.62,3.83a3.4,3.4,0,0,0,3.38,0l6.62-3.83A3.36,3.36,0,0,0,22,16.88V9.23a3.35,3.35,0,0,0-1.69-2.92L13.69,2.48a3.4,3.4,0,0,0-3.38,0Zm3.08,2.14,5.22,3A2.78,2.78,0,0,1,20,10v6a2.76,2.76,0,0,1-1.39,2.4l-5.22,3a2.76,2.76,0,0,1-2.78,0l-5.22-3A2.76,2.76,0,0,1,4,16.07V10A2.78,2.78,0,0,1,5.39,7.63l5.22-3a2.76,2.76,0,0,1,2.78,0ZM9,16.05h6v-6H9Z"/></g></g></svg>`;

// Track processed nodes to avoid re-processing
const processedNodes = new WeakSet();

// Flag to prevent multiple concurrent conversion operations
let isConverting = false;

// Debounce timer
let debounceTimer = null;

// Remember if we've set up the observer already
let observerInitialized = false;

// Load the conversion rate from settings
function loadConversionRate() {
  return new Promise((resolve) => {
    if (chrome && chrome.storage) {
      chrome.storage.sync.get({
        'robuxAmount': DEFAULT_ROBUX_AMOUNT,
        'dollarAmount': DEFAULT_DOLLAR_AMOUNT
      }, function(items) {
        robuxConversionRate = items.robuxAmount / items.dollarAmount;
        resolve();
      });
    } else {
      // Fallback to default if storage is not available
      resolve();
    }
  });
}

// Function to convert a dollar amount to Robux
function convertToRobux(dollarAmount) {
  // Remove currency sign, commas, and any other non-numeric characters except decimal point
  const numericValue = parseFloat(dollarAmount.replace(/[$£€,\s]/g, ''));
  
  if (isNaN(numericValue)) return dollarAmount;
  
  // Convert to Robux using the loaded conversion rate
  const robuxAmount = numericValue * robuxConversionRate;
  
  // Format with commas for thousands and add Robux icon
  return formatNumberWithCommas(Math.round(robuxAmount)) + ` ${ROBUX_ICON_SVG}`;
}

// Helper function to format numbers with commas
function formatNumberWithCommas(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Function to process a single node
function processNode(textNode) {
  if (processedNodes.has(textNode)) return false;
  
  const originalText = textNode.nodeValue;
  if (!originalText || originalText.trim() === '') return false;
  
  // Regular expressions to match various price formats
  const priceRegexes = [
    /\$\s*[\d,]+(\.\d{1,2})?/g,    // USD: $XX,XXX.XX
    /£\s*[\d,]+(\.\d{1,2})?/g,     // GBP: £XX,XXX.XX
    /€\s*[\d,]+(\.\d{1,2})?/g,     // EUR: €XX,XXX.XX
    /[\d,]+(\.\d{1,2})?\s*USD/g,   // XX,XXX.XX USD
    /[\d,]+(\.\d{1,2})?\s*dollars/ig  // XX,XXX.XX dollars
  ];
  
  // Check if the node contains a price
  let containsPrice = false;
  let matches = null;
  
  for (const regex of priceRegexes) {
    regex.lastIndex = 0; // Reset regex state
    if (regex.test(originalText)) {
      regex.lastIndex = 0; // Reset again for the actual matching
      matches = originalText.match(regex);
      containsPrice = true;
      break;
    }
  }
  
  if (!containsPrice || !matches) return false;
  
  // Create a document fragment to hold the new content
  const parent = textNode.parentNode;
  if (!parent) return false;
  
  const fragment = document.createDocumentFragment();
  
  // Process each match
  let lastIndex = 0;
  for (const match of matches) {
    const matchIndex = originalText.indexOf(match, lastIndex);
    
    // Add text before the match
    if (matchIndex > lastIndex) {
      fragment.appendChild(document.createTextNode(
        originalText.substring(lastIndex, matchIndex)
      ));
    }
    
    // Add the converted price
    const span = document.createElement('span');
    span.innerHTML = convertToRobux(match);
    fragment.appendChild(span);
    
    // Update lastIndex
    lastIndex = matchIndex + match.length;
  }
  
  // Add any remaining text
  if (lastIndex < originalText.length) {
    fragment.appendChild(document.createTextNode(
      originalText.substring(lastIndex)
    ));
  }
  
  // Replace the original node with our fragment
  parent.replaceChild(fragment, textNode);
  
  // Mark as processed
  processedNodes.add(textNode);
  
  return true;
}

// Function to find and replace prices in a subtree
function findAndReplacePricesInSubtree(root) {
  // Use a non-recursive approach for better performance
  const nodeIterator = document.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT,
    { 
      acceptNode: function(node) {
        // Skip already processed nodes and nodes with no content
        if (processedNodes.has(node) || !node.nodeValue || node.nodeValue.trim() === '') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip nodes in scripts, style, etc.
        const parent = node.parentNode;
        if (!parent || 
            parent.nodeName === 'SCRIPT' || 
            parent.nodeName === 'STYLE' || 
            parent.nodeName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  
  // Process a limited number of nodes per cycle to avoid freezing the browser
  const MAX_NODES_PER_CYCLE = 50;
  let nodesToProcess = [];
  
  // Collect nodes to process
  let node;
  let count = 0;
  while ((node = nodeIterator.nextNode()) && count < MAX_NODES_PER_CYCLE) {
    nodesToProcess.push(node);
    count++;
  }
  
  // If we have more nodes to process, schedule them for later
  const hasMoreNodes = nodeIterator.nextNode() !== null;
  
  // Process the collected nodes
  let replacementCount = 0;
  for (const textNode of nodesToProcess) {
    if (processNode(textNode)) {
      replacementCount++;
    }
  }
  
  // If there are more nodes to process and we want to continue, schedule the next batch
  if (hasMoreNodes && !isConverting) {
    setTimeout(() => findAndReplacePricesInSubtree(root), 50);
  }
  
  return replacementCount;
}

// Main function to find and replace prices on the page
function findAndReplacePrices() {
  // Prevent concurrent conversions
  if (isConverting) return;
  isConverting = true;
  
  // First load the conversion rate from settings
  loadConversionRate().then(() => {
    // Only process the visible part of the page for better performance
    const visibleElements = getVisibleElements();
    let conversionCount = 0;
    
    for (const element of visibleElements) {
      conversionCount += findAndReplacePricesInSubtree(element);
    }
    
    // Show a message with conversion count and rate used
    if (conversionCount > 0) {
      showConversionMessage(conversionCount);
    }
    
    isConverting = false;
    
    // Initialize observer if not already done
    if (!observerInitialized) {
      observePageChanges();
      observerInitialized = true;
    }
  });
}

// Helper function to get visible elements
function getVisibleElements() {
  // Focus on the main content areas of the page
  const mainElements = [];
  
  // Try to target just the main content container
  const contentContainers = document.querySelectorAll('main, article, #content, .content, #main, .main');
  let foundContentContainer = false;
  
  contentContainers.forEach(container => {
    if (isElementVisible(container)) {
      mainElements.push(container);
      foundContentContainer = true;
    }
  });
  
  // If no content container was found, use the body
  if (!foundContentContainer) {
    mainElements.push(document.body);
  }
  
  return mainElements;
}

// Check if element is visible
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.left < (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Show conversion message
function showConversionMessage(conversionCount) {
  // Remove existing message if present
  const existingMessage = document.getElementById('robux-conversion-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
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
  message.innerHTML = `Converted ${conversionCount} prices to Robux<br>
                      <small>Rate: ${DEFAULT_ROBUX_AMOUNT} ${ROBUX_ICON_SVG} = $${DEFAULT_DOLLAR_AMOUNT}</small>`;
  
  document.body.appendChild(message);
  
  // Remove the message after 3 seconds
  setTimeout(() => {
    if (message.parentNode) {
      message.parentNode.removeChild(message);
    }
  }, 3000);
}

// Function to handle dynamic content loading with debouncing
function observePageChanges() {
  // Create a MutationObserver to watch for changes to the DOM
  const observer = new MutationObserver((mutations) => {
    let shouldScanForPrices = false;
    
    // Check if any of the mutations added nodes that might contain prices
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScanForPrices = true;
        break;
      }
    }
    
    // If new content was added, schedule a scan with debouncing
    if (shouldScanForPrices && !isConverting) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        findAndReplacePrices();
      }, 1000);
    }
  });
  
  // Configure to reduce unnecessary observations
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false
  });
}

// Listen for the conversion event from the popup
document.addEventListener('convertToRobux', () => {
  // Reset processed nodes to allow re-conversion
  processedNodes.clear();
  findAndReplacePrices();
});

// Run the price finder when the DOM is ready, with a delay for performance
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (AUTO_CONVERT_ON_LOAD) {
      setTimeout(findAndReplacePrices, 1500);
    }
  });
} else {
  if (AUTO_CONVERT_ON_LOAD) {
    setTimeout(findAndReplacePrices, 1500);
  }
} 