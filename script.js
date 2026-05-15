/* =============================================
   JNTUK Grade Predictor — Main Script
   Modular JavaScript | Chart.js | html2pdf
   ============================================= */

// ====== JNTUK GRADING SYSTEM ======
const GRADING = [
  { grade: 'S', min: 90, max: 100, points: 10 },
  { grade: 'A', min: 80, max: 89,  points: 9 },
  { grade: 'B', min: 70, max: 79,  points: 8 },
  { grade: 'C', min: 60, max: 69,  points: 7 },
  { grade: 'D', min: 50, max: 59,  points: 6 },
  { grade: 'E', min: 40, max: 49,  points: 5 },
  { grade: 'F', min: 0,  max: 39,  points: 0 },
];

// Performance zone definitions
const ZONES = {
  excellent: { label: 'Excellent Zone', cls: 'zone-excellent', icon: 'fa-star',         minSGPA: 8.0 },
  safe:      { label: 'Safe Zone',      cls: 'zone-safe',      icon: 'fa-shield-halved', minSGPA: 6.0 },
  average:   { label: 'Average Zone',   cls: 'zone-average',   icon: 'fa-triangle-exclamation', minSGPA: 4.5 },
  risk:      { label: 'Risk Zone',      cls: 'zone-risk',      icon: 'fa-circle-exclamation',   minSGPA: 0 },
};

// ====== DOM REFERENCES ======
const dom = {
  subjectCount:      () => document.getElementById('subject-count'),
  subjectsContainer: () => document.getElementById('subjects-container'),
  calculateBtn:      () => document.getElementById('calculate-btn'),
  resetBtn:          () => document.getElementById('reset-btn'),
  resultsDashboard:  () => document.getElementById('results-dashboard'),
  sgpaValue:         () => document.getElementById('sgpa-value'),
  sgpaRing:          () => document.getElementById('sgpa-ring'),
  overallGrade:      () => document.getElementById('overall-grade'),
  passStatus:        () => document.getElementById('pass-status'),
  totalCredits:      () => document.getElementById('total-credits'),
  performanceZone:   () => document.getElementById('performance-zone'),
  passStatusChip:    () => document.getElementById('pass-status-chip'),
  overallGradeChip:  () => document.getElementById('overall-grade-chip'),
  analysisMessages:  () => document.getElementById('analysis-messages'),
  subjectResults:    () => document.getElementById('subject-results'),
  requiredTable:     () => document.getElementById('required-marks-table'),
  gradeChart:        () => document.getElementById('grade-chart'),
  themeToggle:       () => document.getElementById('theme-toggle'),
  themeIcon:         () => document.getElementById('theme-icon'),
  copyBtn:           () => document.getElementById('copy-btn'),
  pdfBtn:            () => document.getElementById('pdf-btn'),
  shareBtn:          () => document.getElementById('share-btn'),
  saveBtn:           () => document.getElementById('save-btn'),
  toast:             () => document.getElementById('toast'),
};

// Chart.js instance reference
let chartInstance = null;

// ====== INITIALISATION ======
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderSubjectRows();
  loadSavedData();
  bindEvents();

  // Inject SVG gradient definition for the SGPA ring
  injectSVGGradient();
});

/**
 * Inject a reusable SVG gradient for the SGPA circular ring.
 */
function injectSVGGradient() {
  const svg = document.querySelector('.circular-indicator svg');
  if (!svg) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="sgpa-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>`;
  svg.prepend(defs);
}

// ====== THEME MANAGEMENT ======

/** Initialise theme from localStorage or default to dark. */
function initTheme() {
  const saved = localStorage.getItem('gp-theme') || 'dark';
  applyTheme(saved);
}

/** Apply the given theme and update icon. */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('gp-theme', theme);
  const icon = dom.themeIcon();
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }
}

/** Toggle between dark and light themes. */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ====== SUBJECT ROWS ======

/** Render the appropriate number of subject input rows. */
function renderSubjectRows() {
  const count = parseInt(dom.subjectCount().value, 10);
  const container = dom.subjectsContainer();

  // Build label row
  let html = `
    <div class="subjects-labels">
      <span>#</span>
      <span>Subject Name</span>
      <span>Credits</span>
      <span>Internal (30)</span>
      <span>External (70)</span>
      <span>Total</span>
    </div>`;

  for (let i = 1; i <= count; i++) {
    html += `
      <div class="subject-row" data-index="${i}" style="animation-delay:${i * 0.04}s">
        <span class="row-num">${i}</span>
        <input type="text"   id="name-${i}"  placeholder="Subject Name" aria-label="Subject ${i} Name" />
        <input type="number" id="credit-${i}" placeholder="Credits" min="1" max="10" aria-label="Subject ${i} Credits" />
        <input type="number" id="int-${i}"    placeholder="Internal" min="0" max="30" aria-label="Subject ${i} Internal Marks" />
        <input type="number" id="ext-${i}"    placeholder="External" min="0" max="70" aria-label="Subject ${i} External Marks" />
        <input type="text"   id="total-${i}"  placeholder="—" readonly tabindex="-1" aria-label="Subject ${i} Total" class="total-field" />
      </div>`;
  }

  container.innerHTML = html;

  // Bind live total calculation on input change
  for (let i = 1; i <= count; i++) {
    const intEl = document.getElementById(`int-${i}`);
    const extEl = document.getElementById(`ext-${i}`);
    const totEl = document.getElementById(`total-${i}`);
    const updateTotal = () => {
      const intVal = clamp(parseFloat(intEl.value) || 0, 0, 30);
      const extVal = clamp(parseFloat(extEl.value) || 0, 0, 70);
      totEl.value = intVal + extVal;
    };
    intEl.addEventListener('input', updateTotal);
    extEl.addEventListener('input', updateTotal);
  }
}

// ====== EVENT BINDING ======
function bindEvents() {
  dom.subjectCount().addEventListener('change', renderSubjectRows);
  dom.calculateBtn().addEventListener('click', handleCalculate);
  dom.resetBtn().addEventListener('click', handleReset);
  dom.themeToggle().addEventListener('click', toggleTheme);
  dom.copyBtn().addEventListener('click', handleCopy);
  dom.pdfBtn().addEventListener('click', handlePDF);
  dom.shareBtn().addEventListener('click', handleShare);
  dom.saveBtn().addEventListener('click', handleSave);
}

// ====== CORE CALCULATION ======

/** Collect input data and return an array of subject objects. Returns null if validation fails. */
function collectSubjects() {
  const count = parseInt(dom.subjectCount().value, 10);
  const subjects = [];
  let valid = true;

  for (let i = 1; i <= count; i++) {
    const nameEl   = document.getElementById(`name-${i}`);
    const creditEl = document.getElementById(`credit-${i}`);
    const intEl    = document.getElementById(`int-${i}`);
    const extEl    = document.getElementById(`ext-${i}`);

    const name   = nameEl.value.trim() || `Subject ${i}`;
    const credit = parseInt(creditEl.value, 10);
    const int_   = parseFloat(intEl.value);
    const ext_   = parseFloat(extEl.value);

    // Clear previous invalid states
    [creditEl, intEl, extEl].forEach(el => el.classList.remove('invalid'));

    // Validate
    if (isNaN(credit) || credit < 1) { creditEl.classList.add('invalid'); valid = false; }
    if (isNaN(int_) || int_ < 0 || int_ > 30) { intEl.classList.add('invalid'); valid = false; }
    if (isNaN(ext_) || ext_ < 0 || ext_ > 70) { extEl.classList.add('invalid'); valid = false; }

    if (!valid) continue; // still check all rows for red highlights

    const total = clamp(int_, 0, 30) + clamp(ext_, 0, 70);
    const gradeInfo = getGrade(total);

    subjects.push({
      index: i,
      name,
      credit,
      internal: int_,
      external: ext_,
      total,
      grade: gradeInfo.grade,
      gradePoints: gradeInfo.points,
      passed: total >= 40 && ext_ >= 26,
    });
  }

  return valid ? subjects : null;
}

/** Determine grade & points for a given total mark (0–100). */
function getGrade(total) {
  for (const g of GRADING) {
    if (total >= g.min) return { grade: g.grade, points: g.points };
  }
  return { grade: 'F', points: 0 };
}

/** Calculate SGPA from subjects array. */
function calculateSGPA(subjects) {
  let totalWeighted = 0;
  let totalCredits = 0;
  for (const s of subjects) {
    totalWeighted += s.credit * s.gradePoints;
    totalCredits += s.credit;
  }
  return totalCredits > 0 ? totalWeighted / totalCredits : 0;
}

/** Get performance zone from SGPA value. */
function getZone(sgpa) {
  if (sgpa >= ZONES.excellent.minSGPA) return ZONES.excellent;
  if (sgpa >= ZONES.safe.minSGPA)      return ZONES.safe;
  if (sgpa >= ZONES.average.minSGPA)   return ZONES.average;
  return ZONES.risk;
}

// ====== DISPLAY / RENDER RESULTS ======

function handleCalculate() {
  const subjects = collectSubjects();
  if (!subjects) {
    showToast('⚠️ Please fill in all fields correctly.');
    return;
  }

  const sgpa = calculateSGPA(subjects);
  const totalCredits = subjects.reduce((s, sub) => s + sub.credit, 0);
  const allPassed = subjects.every(s => s.passed);
  const zone = getZone(sgpa);

  // Show dashboard
  dom.resultsDashboard().classList.remove('hidden');

  // Re-trigger animations
  document.querySelectorAll('.result-card').forEach(card => {
    card.classList.remove('animate-in');
    // force reflow
    void card.offsetWidth;
    card.classList.add('animate-in');
  });

  // SGPA ring
  updateSGPARing(sgpa);

  // Stat chips
  dom.sgpaValue().textContent = sgpa.toFixed(2);
  dom.overallGrade().textContent = getGrade(sgpa * 10).grade; // approximate overall
  dom.passStatus().textContent = allPassed ? 'PASSED ✅' : 'FAILED ❌';
  dom.totalCredits().textContent = totalCredits;

  // Zone
  const zoneEl = dom.performanceZone();
  zoneEl.textContent = zone.label;
  zoneEl.className = `stat-value ${zone.cls}`;

  // Pass status chip colour
  dom.passStatusChip().style.borderColor = allPassed ? 'var(--success)' : 'var(--danger)';
  dom.overallGradeChip().style.borderColor = 'var(--accent-primary)';

  // Smart analysis
  renderAnalysis(subjects, sgpa, zone, allPassed);

  // Subject cards
  renderSubjectCards(subjects);

  // Required marks table
  renderRequiredMarksTable(subjects);

  // Pie chart
  renderChart(subjects);

  // Smooth scroll to results
  dom.resultsDashboard().scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Animate the SGPA circular ring. */
function updateSGPARing(sgpa) {
  const ring = dom.sgpaRing();
  if (!ring) return;
  const circumference = 2 * Math.PI * 52; // r=52
  const ratio = clamp(sgpa / 10, 0, 1);
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference * (1 - ratio);
}

// ====== SMART ANALYSIS MESSAGES ======

function renderAnalysis(subjects, sgpa, zone, allPassed) {
  const msgs = [];

  // Zone message
  msgs.push({ text: `You are currently in the <strong>${zone.label}</strong>.`, type: zone.cls.replace('zone-', 'msg-').replace('excellent', 'info') });

  // Pass/Fail
  if (!allPassed) {
    const failed = subjects.filter(s => !s.passed);
    failed.forEach(s => {
      msgs.push({ text: `❌ <strong>${s.name}</strong> — FAILED. ${s.external < 26 ? 'External marks below 26.' : 'Total below 40.'}`, type: 'msg-danger' });
    });
  } else {
    msgs.push({ text: '✅ All subjects passed! Great job.', type: 'msg-success' });
  }

  // Next grade hints per subject
  subjects.forEach(s => {
    // GRADING is sorted descending (S→F). Find the next grade above the current one.
    // We iterate in reverse (F→S) to find the first grade whose min > s.total.
    const reversed = [...GRADING].reverse();
    const nextUp = reversed.find(g => g.min > s.total);
    if (nextUp) {
      const diff = nextUp.min - s.total;
      msgs.push({ text: `📈 <strong>${s.name}</strong>: You need <strong>${diff}</strong> more marks for <strong>${nextUp.grade} Grade</strong>.`, type: 'msg-warning' });
    }
    // Already top grade?
    if (s.total >= 90) {
      msgs.push({ text: `🌟 <strong>${s.name}</strong>: Outstanding! S Grade achieved.`, type: 'msg-info' });
    }
  });

  // Internal strength detection
  subjects.forEach(s => {
    if (s.internal >= 25) {
      msgs.push({ text: `💪 <strong>${s.name}</strong>: Strong internal performance detected.`, type: 'msg-success' });
    }
  });

  // Weak subjects
  subjects.forEach(s => {
    if (s.total < 50 && s.total >= 40) {
      msgs.push({ text: `⚠️ <strong>${s.name}</strong> score needs improvement.`, type: 'msg-warning' });
    }
  });

  const container = dom.analysisMessages();
  container.innerHTML = msgs.map((m, i) =>
    `<div class="analysis-msg ${m.type}" style="animation-delay:${i * 0.06}s">
       <i class="fa-solid fa-circle-dot"></i>
       <span>${m.text}</span>
     </div>`
  ).join('');
}

// ====== SUBJECT RESULT CARDS ======

function renderSubjectCards(subjects) {
  const container = dom.subjectResults();
  container.innerHTML = subjects.map((s, i) => {
    const zone = getZoneForTotal(s.total);
    return `
      <div class="subject-result-card" style="animation-delay:${i * 0.06}s">
        <div class="src-header">
          <span class="src-name">${s.name}</span>
          <span class="src-grade ${zone.cls}">${s.grade}</span>
        </div>
        <div class="src-details">
          <span><em>Internal</em> <strong>${s.internal}/30</strong></span>
          <span><em>External</em> <strong>${s.external}/70</strong></span>
          <span><em>Total</em> <strong>${s.total}/100</strong></span>
          <span><em>Credits</em> <strong>${s.credit}</strong></span>
          <span><em>Grade Points</em> <strong>${s.gradePoints}</strong></span>
          <span><em>Status</em> <strong>${s.passed ? 'Pass ✅' : 'Fail ❌'}</strong></span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${zone.cls}" style="width:${s.total}%"></div>
        </div>
      </div>`;
  }).join('');
}

/** Return zone object based on total marks (for per-subject colouring). */
function getZoneForTotal(total) {
  if (total >= 80) return ZONES.excellent;
  if (total >= 60) return ZONES.safe;
  if (total >= 40) return ZONES.average;
  return ZONES.risk;
}

// ====== REQUIRED MARKS TABLE ======

function renderRequiredMarksTable(subjects) {
  const grades = ['E', 'D', 'C', 'B', 'A', 'S'];
  const boundaries = { E: 40, D: 50, C: 60, B: 70, A: 80, S: 90 };

  let html = `<table>
    <thead><tr>
      <th>Subject</th>
      ${grades.map(g => `<th>${g} Grade (${boundaries[g]}+)</th>`).join('')}
    </tr></thead><tbody>`;

  subjects.forEach(s => {
    html += `<tr><td>${s.name}</td>`;
    grades.forEach(g => {
      const needed = boundaries[g] - s.internal; // external marks needed
      if (s.total >= boundaries[g]) {
        html += `<td class="mark-achieved">✔ Achieved</td>`;
      } else if (needed > 70) {
        html += `<td class="mark-na">N/A</td>`;
      } else {
        html += `<td class="mark-needed">${needed}/70 ext</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  dom.requiredTable().innerHTML = html;
}

// ====== PIE CHART (Chart.js) ======

function renderChart(subjects) {
  const ctx = dom.gradeChart();
  if (!ctx) return;

  // Destroy old chart
  if (chartInstance) chartInstance.destroy();

  // Count grades
  const gradeCounts = {};
  GRADING.forEach(g => gradeCounts[g.grade] = 0);
  subjects.forEach(s => gradeCounts[s.grade]++);

  const labels = Object.keys(gradeCounts).filter(g => gradeCounts[g] > 0);
  const data   = labels.map(g => gradeCounts[g]);

  const colorMap = {
    S: '#818cf8', A: '#60a5fa', B: '#34d399', C: '#6ee7b7',
    D: '#fbbf24', E: '#fb923c', F: '#f87171'
  };
  const colors = labels.map(g => colorMap[g] || '#94a3b8');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: isDark ? '#111827' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 12,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDark ? '#f1f5f9' : '#1e293b',
            font: { family: 'Outfit', size: 13, weight: '600' },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12,
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#1e293b',
          bodyColor: isDark ? '#94a3b8' : '#475569',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: 'Outfit', weight: '700' },
          bodyFont: { family: 'Outfit' },
        }
      },
      cutout: '55%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        easing: 'easeOutQuart',
      }
    }
  });
}

// ====== ACTION HANDLERS ======

/** Reset all inputs and hide results. */
function handleReset() {
  renderSubjectRows();
  dom.resultsDashboard().classList.add('hidden');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  showToast('🔄 All fields reset.');
}

/** Copy results summary to clipboard. */
function handleCopy() {
  const subjects = collectSubjects();
  if (!subjects) { showToast('⚠️ Calculate results first.'); return; }

  const sgpa = calculateSGPA(subjects);
  let text = `🎓 JNTUK Grade Prediction Report\n`;
  text += `══════════════════════════════\n`;
  text += `SGPA: ${sgpa.toFixed(2)}\n\n`;

  subjects.forEach(s => {
    text += `📘 ${s.name}\n`;
    text += `   Internal: ${s.internal}/30 | External: ${s.external}/70 | Total: ${s.total}/100\n`;
    text += `   Grade: ${s.grade} | Points: ${s.gradePoints} | ${s.passed ? 'PASS ✅' : 'FAIL ❌'}\n\n`;
  });

  text += `⚠️ Disclaimer: Estimated results based on JNTUK grading patterns.`;

  navigator.clipboard.writeText(text)
    .then(() => showToast('📋 Results copied to clipboard!'))
    .catch(() => showToast('❌ Copy failed.'));
}

/** Export the results dashboard as a PDF. */
function handlePDF() {
  const dashboard = dom.resultsDashboard();
  if (dashboard.classList.contains('hidden')) { showToast('⚠️ Calculate results first.'); return; }

  showToast('📄 Generating PDF…');

  const opt = {
    margin:      0.4,
    filename:    'JNTUK_Grade_Report.pdf',
    image:       { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0a0e1a' },
    jsPDF:       { unit: 'in', format: 'a4', orientation: 'portrait' },
  };

  html2pdf().set(opt).from(dashboard).save().then(() => {
    showToast('✅ PDF downloaded successfully!');
  });
}

/** Share results via Web Share API, fallback to copy. */
function handleShare() {
  const subjects = collectSubjects();
  if (!subjects) { showToast('⚠️ Calculate results first.'); return; }

  const sgpa = calculateSGPA(subjects);
  const text = `🎓 My JNTUK SGPA: ${sgpa.toFixed(2)} | Predicted via ADITYA Grade Predictor 2026`;

  if (navigator.share) {
    navigator.share({ title: 'JNTUK Grade Prediction', text })
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(text)
      .then(() => showToast('📋 Share text copied to clipboard!'))
      .catch(() => showToast('❌ Sharing not supported on this browser.'));
  }
}

/** Save current input data to localStorage. */
function handleSave() {
  const count = parseInt(dom.subjectCount().value, 10);
  const data = { count, subjects: [] };

  for (let i = 1; i <= count; i++) {
    data.subjects.push({
      name:   document.getElementById(`name-${i}`)?.value   || '',
      credit: document.getElementById(`credit-${i}`)?.value || '',
      int:    document.getElementById(`int-${i}`)?.value     || '',
      ext:    document.getElementById(`ext-${i}`)?.value     || '',
    });
  }

  localStorage.setItem('gp-data', JSON.stringify(data));
  showToast('💾 Data saved to local storage!');
}

/** Load saved data from localStorage on page load. */
function loadSavedData() {
  const raw = localStorage.getItem('gp-data');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    dom.subjectCount().value = data.count;
    renderSubjectRows();

    data.subjects.forEach((s, idx) => {
      const i = idx + 1;
      const nameEl   = document.getElementById(`name-${i}`);
      const creditEl = document.getElementById(`credit-${i}`);
      const intEl    = document.getElementById(`int-${i}`);
      const extEl    = document.getElementById(`ext-${i}`);
      const totEl    = document.getElementById(`total-${i}`);

      if (nameEl)   nameEl.value   = s.name;
      if (creditEl) creditEl.value = s.credit;
      if (intEl)    intEl.value    = s.int;
      if (extEl)    extEl.value    = s.ext;

      // Update total
      if (intEl && extEl && totEl) {
        const intVal = clamp(parseFloat(intEl.value) || 0, 0, 30);
        const extVal = clamp(parseFloat(extEl.value) || 0, 0, 70);
        totEl.value = intVal + extVal;
      }
    });
  } catch (e) {
    console.warn('Failed to load saved data:', e);
  }
}

// ====== TOAST NOTIFICATION ======

let toastTimer = null;

function showToast(message) {
  const el = dom.toast();
  el.innerHTML = message;
  el.classList.remove('hidden');
  el.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 300);
  }, 2800);
}

// ====== UTILITY ======

/** Clamp a value between min and max. */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
