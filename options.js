// Default values
const DEFAULT_ROBUX_AMOUNT = 1000;
const DEFAULT_DOLLAR_AMOUNT = 3.5;

// Robux SVG icon HTML (simplified version for reuse)
const ROBUX_ICON_HTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 26.1" class="robux-icon">
  <defs>
    <style>.cls-1{fill:url(#linear-gradient-update);}</style>
    <linearGradient id="linear-gradient-update" x1="-21.63" y1="63.75" x2="-21.63" y2="62.78" gradientTransform="matrix(24, 0, 0, -26.1, 531, 1665.03)" gradientUnits="userSpaceOnUse">
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

// DOM elements
const robuxAmountInput = document.getElementById('robuxAmount');
const dollarAmountInput = document.getElementById('dollarAmount');
const saveButton = document.getElementById('saveButton');
const statusDiv = document.getElementById('status');

// Load saved settings when the options page is opened
document.addEventListener('DOMContentLoaded', loadSettings);

// Add event listener to the save button
saveButton.addEventListener('click', saveSettings);

// Function to load settings from storage
function loadSettings() {
  chrome.storage.sync.get({
    'robuxAmount': DEFAULT_ROBUX_AMOUNT,
    'dollarAmount': DEFAULT_DOLLAR_AMOUNT
  }, function(items) {
    robuxAmountInput.value = items.robuxAmount;
    dollarAmountInput.value = items.dollarAmount;
    
    // Update the info text with current values (optional)
    const infoDiv = document.querySelector('.info');
    if (infoDiv) {
      infoDiv.innerHTML = `Default: ${DEFAULT_ROBUX_AMOUNT} ${ROBUX_ICON_HTML} = $${DEFAULT_DOLLAR_AMOUNT}`;
    }
  });
}

// Function to save settings to storage
function saveSettings() {
  // Get values from inputs
  const robuxAmount = parseFloat(robuxAmountInput.value);
  const dollarAmount = parseFloat(dollarAmountInput.value);
  
  // Validate inputs
  if (isNaN(robuxAmount) || robuxAmount <= 0) {
    showStatus('Please enter a valid Robux amount (must be greater than 0)', 'error');
    return;
  }
  
  if (isNaN(dollarAmount) || dollarAmount <= 0) {
    showStatus('Please enter a valid dollar amount (must be greater than 0)', 'error');
    return;
  }
  
  // Save to Chrome storage
  chrome.storage.sync.set({
    'robuxAmount': robuxAmount,
    'dollarAmount': dollarAmount
  }, function() {
    // Show success message
    showStatus('Settings saved successfully!', 'success');
  });
}

// Helper function to show status messages
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + (type || 'info');
  statusDiv.style.display = 'block';
  
  // Hide the message after 3 seconds
  setTimeout(function() {
    statusDiv.style.display = 'none';
  }, 3000);
} 