document.addEventListener('DOMContentLoaded', function() {
  // Get the current tab information when the popup is opened
  getCurrentTab().then(tab => {
    // Add click event listener to the convert button
    document.getElementById('convertButton').addEventListener('click', function() {
      // Execute the conversion script in the active tab
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: triggerConversion
      })
      .then(() => {
        // Show feedback to the user
        const button = document.getElementById('convertButton');
        const originalText = button.textContent;
        
        button.textContent = 'Converting...';
        button.disabled = true;
        
        // Reset button after a short delay
        setTimeout(() => {
          button.textContent = 'Conversion Complete!';
          
          setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
          }, 1500);
        }, 500);
      })
      .catch(error => {
        console.error('Error executing script:', error);
        document.getElementById('convertButton').textContent = 'Error - Try Again';
      });
    });
    
    // Add click event listener to the options link
    document.getElementById('optionsLink').addEventListener('click', function(e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    
    // Load and display the current conversion rate
    loadConversionRate();
  });
});

// Function to get the current active tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  return tab;
}

// Robux SVG icon HTML (simplified version for reuse)
const ROBUX_ICON_HTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 26.1" class="robux-icon">
  <defs>
    <style>.cls-1{fill:url(#linear-gradient-info);}</style>
    <linearGradient id="linear-gradient-info" x1="-21.63" y1="63.75" x2="-21.63" y2="62.78" gradientTransform="matrix(24, 0, 0, -26.1, 531, 1665.03)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#eedfa2"/>
      <stop offset="0.59" stop-color="#a9935a"/>
      <stop offset="1" stop-color="#fee3a5"/>
    </linearGradient>
  </defs>
  <g>
    <g>
      <path class="cls-1" d="M21.4,4.62A5.2,5.2,0,0,1,24,9.12V17a5.19,5.19,0,0,1-2.6,4.5l-6.8,3.93a5.19,5.19,0,0,1-5.2,0L2.6,21.48A5.19,5.19,0,0,1,0,17V9.12a5.2,5.2,0,0,1,2.6-4.5L9.4.7a5.19,5.19,0,0,1,5.2,0ZM10.31,2.48,3.69,6.31A3.35,3.35,0,0,0,2,9.23v7.65A3.36,3.36,0,0,0,3.69,19.8l6.62,3.83a3.4,3.4,0,0,0,3.38,0l6.62-3.83A3.36,3.36,0,0,0,22,16.88V9.23a3.35,3.35,0,0,0-1.69-2.92L13.69,2.48a3.4,3.4,0,0,0-3.38,0Zm3.08,2.14,5.22,3A2.78,2.78,0,0,1,20,10v6a2.76,2.76,0,0,1-1.39,2.4l-5.22,3a2.76,2.76,0,0,1-2.78,0l-5.22-3A2.76,2.76,0,0,1,4,16.07V10A2.78,2.78,0,0,1,5.39,7.63l5.22-3a2.76,2.76,0,0,1,2.78,0ZM9,16.05h6v-6H9Z"/>
    </g>
  </g>
</svg>`;

// Function to load the conversion rate from storage and update the info text
function loadConversionRate() {
  chrome.storage.sync.get({
    'robuxAmount': 1000,
    'dollarAmount': 3.5
  }, function(items) {
    const infoText = document.getElementById('infoText');
    // Clear current content and set new content with SVG
    infoText.innerHTML = `Conversion rate: ${items.robuxAmount} ${ROBUX_ICON_HTML} = $${items.dollarAmount}`;
  });
}

// This function will be injected into the page
function triggerConversion() {
  // Dispatch a custom event that the content script is listening for
  document.dispatchEvent(new CustomEvent('convertToRobux'));
  
  return true; // Indicate success
} 