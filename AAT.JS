document.addEventListener("DOMContentLoaded", () => {
  // ===== Variable Declarations =====
  const darkModeSwitch = document.getElementById("dark-mode-switch");
  const toggleLabel = document.getElementById("toggle-label"); // Label for theme toggle
  const body = document.body;
  const admissionNote = document.getElementById("admission-note");
  const summaryICD10 = document.getElementById('primary-icd10');
  const summaryDRG = document.getElementById('primary-drg');
  const summaryGMLOS = document.getElementById('primary-gmlos');
  const summaryCMI = document.getElementById('primary-cmi');
  const icd10TableBody = document.querySelector('#icd10-table tbody');

  // ===== Light/Dark Mode Toggle =====
  const toggleTheme = (mode) => {
    const isLightMode = mode === "light";
    body.classList.toggle("light-mode", isLightMode);
    localStorage.setItem("theme", mode); // Save user preference
    toggleLabel.textContent = isLightMode ? "Enable Dark Mode" : "Enable Light Mode"; // Update label text
    console.log(`Theme set to: ${mode}`);
  };

  // Initialize theme
  const savedTheme = localStorage.getItem("theme") || "dark";
  toggleTheme(savedTheme);
  darkModeSwitch.checked = savedTheme === "light";

  darkModeSwitch.addEventListener("change", () => {
    const newTheme = darkModeSwitch.checked ? "light" : "dark";
    toggleTheme(newTheme);
  });

  console.log("Theme switch initialized successfully.");

  // ===== Admission Note Reset =====
  admissionNote.addEventListener("click", () => {
    if (admissionNote.value.trim() !== "") {
      const confirmClear = confirm("Do you want to start a new note? This will clear the current content.");
      if (confirmClear) {
        admissionNote.value = "";
      }
    }
  });

  // ===== Fetch ICD-10 Data =====
 const fetchICD10Data = async () => {
  try {
    const response = await fetch('./ICD10_Data_DRG_Weighted.json'); // Correct path to JSON file
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log("ICD-10 JSON data loaded:", data);
    return data;
  } catch (error) {
    console.error("Error loading or parsing JSON:", error);
    
    // Update the UI with a user-friendly error message
    if (summaryICD10) {
      summaryICD10.textContent = "Unable to load ICD-10 data. Please try again later.";
    }
    return []; // Return an empty array to prevent further errors
  }
};

  // ===== Function to Search ICD-10 Codes =====
  const searchICD10 = (data, code) => {
    return data.find(entry => entry.icd10 === code) || null;
  };

  // ===== Function to Update the Summary Section =====
  const updateSummary = (icd10Result) => {
    if (icd10Result) {
      summaryICD10.textContent = `Primary ICD-10: ${icd10Result.icd10} (${icd10Result.description})`;
      summaryDRG.textContent = `DRG: ${icd10Result.drg}`;
      summaryGMLOS.textContent = `GMLOS: ${icd10Result.gmlos}`;
      summaryCMI.textContent = `CMI: ${icd10Result.weight}`;
    } else {
      console.log("No matching ICD-10 found.");
      summaryICD10.textContent = "No matching ICD-10 code found.";
      summaryDRG.textContent = "DRG: --";
      summaryGMLOS.textContent = "GMLOS: --";
      summaryCMI.textContent = "CMI: --";
    }
  };

  // ===== Parse ICD-10 Codes from Admission Note =====
  const parseICD10Codes = (note) => {
    const icd10Pattern = /\b[A-Z][0-9][0-9A-Z]\.?[0-9A-Z]{0,4}\b/g; // Regex pattern for ICD-10
    const extractedCodes = note.match(icd10Pattern) || [];
    console.log("Extracted ICD-10 codes:", extractedCodes);
    return extractedCodes;
  };

  // ===== Link Parsed ICD-10 Codes to Table =====
  const linkICD10ToTable = (codes, data) => {
    icd10TableBody.innerHTML = ""; // Clear existing rows

    codes.forEach(code => {
      const icd10Entry = data.find(entry => entry.icd10 === code);
      if (icd10Entry) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><input type="checkbox" class="icd10-checkbox" data-code="${icd10Entry.icd10}"></td>
          <td>${icd10Entry.icd10}</td>
          <td>${icd10Entry.description}</td>
          <td>${icd10Entry.drg}</td>
          <td>${icd10Entry.gmlos}</td>
          <td><button class="primary-icd10-btn" data-code="${icd10Entry.icd10}">Set Primary</button></td>
        `;
        icd10TableBody.appendChild(row);
      }
    });

    // Attach event listeners for primary ICD-10 selection
    handlePrimaryICD10Selection();
  };

  // ===== Handle Primary ICD-10 Selection =====
  const handlePrimaryICD10Selection = () => {
    const primaryButtons = document.querySelectorAll('.primary-icd10-btn');

    primaryButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        // Unmark all other buttons
        primaryButtons.forEach(btn => btn.classList.remove('selected'));
        event.target.classList.add('selected'); // Mark this button as selected

        // Get the selected ICD-10 code and update the summary
        const selectedCode = event.target.dataset.code;
        fetchICD10Data().then(data => {
          const icd10Result = searchICD10(data, selectedCode);
          updateSummary(icd10Result);
        });
      });
    });
  };

  // ===== Handle Admission Note Input =====
  admissionNote.addEventListener("blur", () => {
    const noteContent = admissionNote.value;
    const parsedCodes = parseICD10Codes(noteContent);
    fetchICD10Data().then(data => {
      linkICD10ToTable(parsedCodes, data);
    });
  });

  // ===== Initialize Summary on Page Load =====
  const initializeSummary = async () => {
    const data = await fetchICD10Data();
    const exampleICD10Code = "I50.9"; // Placeholder: Replace with dynamic input
    const icd10Result = searchICD10(data, exampleICD10Code);
    updateSummary(icd10Result);
  };

  initializeSummary();

  console.log("Initialization complete.");
});


