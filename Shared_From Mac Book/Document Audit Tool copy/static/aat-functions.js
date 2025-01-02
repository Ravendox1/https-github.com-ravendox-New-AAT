// --- Admission Audit Tool (AAT) Functions ---

// --- Global Variables ---
let icd10Data = [];
let admitCriteria = [];

// --- Fetch JSON Data ---
async function fetchData() {
  try {
    const icd10Response = await fetch('ICD10DATA.json');
    icd10Data = await icd10Response.json();

    const admitResponse = await fetch('Admitcat.json');
    admitCriteria = await admitResponse.json();
  } catch (error) {
    console.error('Error fetching JSON data:', error);
    alert('Unable to load necessary data. Please check your files.');
  }
}

fetchData(); // Load data on page load

// --- Helper Functions ---
function updateProgressBar(progressElement, value, maxValue) {
  const percentage = (value / maxValue) * 100;
  progressElement.style.width = `${percentage}%`;
  progressElement.innerText = `CMI: ${value.toFixed(1)}`;
}

function resetTable(tableBody) {
  tableBody.innerHTML = ''; // Clear previous results
}

function showAlert(message) {
  alert(message); // Replaceable with custom alert UI
}

// --- Admission Note Input and Initial CMI Scoring ---
function calculateInitialCMI(note) {
  const wordCount = note.split(/\s+/).filter(word => word).length; // Filter empty strings
  let initialCMI = 1.0;

  if (wordCount > 50 && wordCount <= 100) initialCMI = 1.2;
  else if (wordCount > 100) initialCMI = 1.5;

  // Update Progress Bar
  const progressBar = document.getElementById('admission-cmi-progress');
  const progressLabel = document.getElementById('admission-cmi');
  updateProgressBar(progressBar, initialCMI, 2.0); // Max CMI = 2.0

  return initialCMI;
}

// Attach event listener to Admission Note input
document.getElementById('admission-note').addEventListener('input', (event) => {
  const note = event.target.value;
  calculateInitialCMI(note);
});

// --- Generate Enhanced Summary ---
async function generateEnhancedSummary() {
  const note = document.getElementById('admission-note').value.trim();
  const selectedCodes = Array.from(
    document.querySelectorAll('#icd10-table tbody input:checked')
  );

  // Validate Input
  if (!note) return showAlert('Please provide an admission note.');
  if (selectedCodes.length === 0) return showAlert('Please select at least one ICD-10 code.');

  // Create Enhanced Summary Content
  let enhancedSummary = `Admission Note:\n${note}\n\nIdentified ICD-10 Codes:\n`;

  selectedCodes.forEach((code) => {
    enhancedSummary += `- ${code.dataset.icd10}: ${code.dataset.description}\n`;
  });

  // Calculate Metrics
  const metrics = calculateDRGandGMLOS(selectedCodes);
  enhancedSummary += `\nMetrics:\nDRG: ${metrics.drg}\nBaseline GMLOS: ${metrics.baselineGMLOS} days\nAdjusted GMLOS: ${metrics.adjustedGMLOS} days\nCMI: ${metrics.cmi}\n`;

  // Update UI
  const summaryElement = document.getElementById('enhanced-summary');
  summaryElement.innerText = enhancedSummary;
  summaryElement.setAttribute('aria-live', 'polite');

  // Trigger Admission Placement Recommendation
  recommendAdmission(selectedCodes);
}

document.getElementById('generate-summary-btn').addEventListener('click', generateEnhancedSummary);

// --- DRG, GMLOS, and CMI Calculation ---
function calculateDRGandGMLOS(selectedCodes) {
  let baselineGMLOS = 0;
  const drgSet = new Set();
  let adjustedGMLOS = 0;
  let cmi = 1.0;

  selectedCodes.forEach((code) => {
    const gmlos = parseFloat(code.dataset.gmlos) || 0;
    const drg = code.dataset.drg || 'N/A';

    baselineGMLOS += gmlos;
    drgSet.add(drg);

    // Adjust CMI based on MCC/CC
    if (code.dataset.mcc === 'true') cmi += 0.5;
    else if (code.dataset.cc === 'true') cmi += 0.2;
  });

  // Adjust GMLOS dynamically
  adjustedGMLOS = baselineGMLOS + selectedCodes.length * 0.2;

  return {
    drg: [...drgSet].join(', '),
    baselineGMLOS: baselineGMLOS.toFixed(1),
    adjustedGMLOS: adjustedGMLOS.toFixed(1),
    cmi: cmi.toFixed(1),
  };
}

// --- Admission Placement Recommendation ---
function recommendAdmission(selectedCodes) {
  let recommendation = 'Discharge';

  selectedCodes.forEach((code) => {
    const icd10 = code.dataset.icd10;

    if (admitCriteria.inpatient.includes(icd10)) {
      recommendation = 'Inpatient';
    } else if (admitCriteria.observation.includes(icd10)) {
      recommendation = 'Observation';
    }
  });

  document.getElementById('admission-recommendation').innerText = `Recommendation: ${recommendation}`;
}

// --- ICD-10 Search and Display ---
function searchICD10(keyword) {
  const results = icd10Data.filter((entry) =>
    entry.description.toLowerCase().includes(keyword.toLowerCase())
  );

  // Update ICD-10 Table
  const tableBody = document.querySelector('#icd10-table tbody');
  resetTable(tableBody);

  if (results.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4">No results found</td></tr>';
    return;
  }

  results.forEach((entry) => {
    const row = `<tr>
      <td><input type="checkbox" data-icd10="${entry.code}" data-description="${entry.description}" data-drg="${entry.drg}" data-gmlos="${entry.gmlos}" data-mcc="${entry.mcc}" data-cc="${entry.cc}"></td>
      <td>${entry.code}</td>
      <td>${entry.drg}</td>
      <td>${entry.gmlos}</td>
    </tr>`;
    tableBody.insertAdjacentHTML('beforeend', row);
  });
}

document.getElementById('icd10-search-btn').addEventListener('click', () => {
  const keyword = document.getElementById('icd10-search-input').value.trim();
  if (keyword) searchICD10(keyword);
  else showAlert('Please enter a keyword to search.');
});
