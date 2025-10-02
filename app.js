// ======= Storage Helpers =======
let currentDate = todayStr();

const LS_KEY = "clinic_patients_v2";
let patients = JSON.parse(localStorage.getItem(LS_KEY) || "[]");

function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify(patients));
  renderCards();
  if (!document.getElementById('reportsView').classList.contains('hidden')) {
    renderReports();
  }
}

// ======= Utilities =======
const byId = (id) => document.getElementById(id);
function currency(n){ return '₹' + (Number(n || 0).toFixed(2)); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function within(dateStr, from, to){
  if (!from && !to) return true;
  const d = dateStr;
  return (!from || d >= from) && (!to || d <= to);
}

// ======= UI State =======
const patientModal = byId('patientModal');
const patientForm = byId('patientForm');
const visitForm = byId('visitForm');
const paymentForm = byId('paymentForm');
let currentIndex = null;
byId('globalDate').value = currentDate;
byId('globalDate').addEventListener('change', (e) => {
  currentDate = e.target.value || todayStr();
});

// ======= Dashboard =======
let isCardView = true;  // Track the current view (card view by default)
// Toggle between Card and List View
toggleViewBtn.addEventListener('click', () => {
  isCardView = !isCardView;  // Toggle the view 
  renderCards();  // Re-render cards based on the new view mode
});

function toggleActiveStatus(idx) {
  const p = patients[idx];
  p.isActive = !p.isActive;  // Toggle active status
  persist();  // Save the changes to LocalStorage
  renderCards();  // Re-render the patient list with updated order
}


function renderCards(filter = '') {
  patientList.innerHTML = '';  // Clear the current content
  let data = patients;

  // Filter patients if necessary
  if (filter) {
    data = data.filter(p => (p.name || '').toLowerCase().includes(filter) || (p.phone || '').includes(filter));
  }

  // Sort patients to put active ones on top
  data.sort((a, b) => {
    if (a.isActive === b.isActive) {
      return 0; // No change if both have the same status
    }
    return a.isActive ? -1 : 1; // Active ones come first
  });

  byId('emptyState').classList.toggle('hidden', data.length !== 0);

  if (isCardView) {
    // Render in Card View (Grid)
    patientList.classList.add('card-view');
    patientList.classList.remove('list-view');
    data.forEach((p, idx) => {
      const totalCharges = (p.visits || []).reduce((a, v) => a + Number(v.charge || 0), 0);
      const totalPayments = (p.payments || []).reduce((a, v) => a + Number(v.amount || 0), 0);
      const balance = totalCharges - totalPayments;

      const card = document.createElement('div');
      card.className = 'card' + (visitedToday(p) ? ' highlight-card' : '') + (p.isActive ? ' active-patient' : '');
      card.innerHTML = `
        <div class="row">
          <img class="avatar" src="${p.photo || 'icons/other.png'}" alt="photo"/>
          <div style="flex:1; padding-left:10px">
            <div class="name">${p.name || ''}</div>
            <div class="muted">${p.age || ''} • ${p.gender || ''}</div>
            <div class="muted">${p.phone || ''}</div>
          </div>
        </div>
        <div class="row">
          <span class="badge">₹${(p.charge || 0)}/visit</span>
          <span class="badge ${balance < 0 ? 'positive' : (balance > 0 ? 'negative' : '')}">
            ${balance < 0 ? 'Advance' : 'Due'}: ${currency(Math.abs(balance))}
          </span>
        </div>
        <div class="row" style="gap:8px; margin-top:6px;">
          <button onclick="openPatient(${idx})">View</button>
          <button class="ghost" onclick="quickVisit(${idx})">+ Visit</button>
          <button class="ghost" onclick="quickPayment(${idx})">+ Payment</button>
          <button class="ghost" onclick="toggleActiveStatus(${idx})">${p.isActive ? 'Deactivate' : 'Activate'}</button>
        </div>
      `;
      patientList.appendChild(card);
    });
  } else {
    // Render in List View (Table/List)
    patientList.classList.add('list-view');
    patientList.classList.remove('card-view');
    data.forEach((p, idx) => {
      const totalCharges = (p.visits || []).reduce((a, v) => a + Number(v.charge || 0), 0);
      const totalPayments = (p.payments || []).reduce((a, v) => a + Number(v.amount || 0), 0);
      const balance = totalCharges - totalPayments;

      const row = document.createElement('div');
      row.className = 'list-item' + (p.isActive ? ' active-patient' : '');
      row.innerHTML = `
        <span class="name">${p.name || ''}</span>
        <span class="info">${p.phone || ''}</span>
        <span class="info">${p.age || ''} • ${p.gender || ''}</span>
        <span class="info">₹${currency(totalCharges)}</span>
        <span class="balance">${balance < 0 ? 'Advance' : 'Due'}: ₹${currency(Math.abs(balance))}</span>
        <span class="status">
          <button onclick="openPatient(${idx})">View</button>
          <button class="ghost" onclick="quickVisit(${idx})">+ Visit</button>
          <button class="ghost" onclick="quickPayment(${idx})">+ Payment</button>
          <button class="ghost" onclick="toggleActiveStatus(${idx})">${p.isActive ? 'Deactivate' : 'Activate'}</button>
        </span>
      `;
      patientList.appendChild(row);
    });
  }
}


// Function to check if the patient visited today
function visitedToday(p) {
  return (p.visits || []).some(v => v.date === todayStr());
}


// ======= Modals & Forms =======
function openAddPatient(){
  currentIndex = null;
  byId('modalTitle').textContent = 'Add Patient';
  patientForm.reset();
  byId('photoPreview').src = "icons/other.png";  // default icon for new patient
  byId('visitTable').querySelector('tbody').innerHTML = '';
  byId('paymentTable').querySelector('tbody').innerHTML = '';
  byId('profileHeader').textContent = 'Save the patient to start adding visits and payments.';
  byId('btnDeletePatient').disabled = true;
  byId('visitDate').value = todayStr();
  byId('payDate').value = todayStr();
  patientModal.classList.remove('hidden');
}
function closePatientModal(){ patientModal.classList.add('hidden'); }

function openPatient(idx){
  currentIndex = idx;
  const p = patients[idx];
  byId('modalTitle').textContent = 'Edit / Profile';
  byId('patientId').value = idx;
  byId('name').value = p.name || '';
  byId('age').value = p.age || '';
  byId('gender').value = p.gender || 'Male';
  byId('phone').value = p.phone || '';
  byId('address').value = p.address || '';
  byId('charge').value = p.charge || 0;
  byId('details').value = p.details || '';
  byId('notes').value = p.notes || '';
  byId('photoPreview').src = p.photo || '';
  byId('btnDeletePatient').disabled = false;
  byId('visitDate').value = todayStr();
  byId('payDate').value = todayStr();
  byId('profileHeader').textContent = p.name + ' • ₹' + (p.charge||0) + '/visit';
  
  // Set the default value for the "Add Payment" amount (same as patient's charge)
  byId('payAmount').value = p.charge || '0.00';  // Set the default payment amount
   byId('visitCharge').value = p.charge || '0.00';  // Set the default payment amount
  
  renderSubTables();
  patientModal.classList.remove('hidden');
}

// Handle photo to data URL
byId('photo').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { byId('photoPreview').src = reader.result; };
  reader.readAsDataURL(file);
});

patientForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const payload = {
    name: byId('name').value.trim(),
    age: Number(byId('age').value||0),
    gender: byId('gender').value,
    phone: byId('phone').value.trim(),
    address: byId('address').value.trim(),
    charge: Number(byId('charge').value||0),
    details: byId('details').value.trim(),
    notes: byId('notes').value.trim(),
    photo: byId('photoPreview').src || '',
    visits: currentIndex!=null ? (patients[currentIndex].visits||[]) : [],
    payments: currentIndex!=null ? (patients[currentIndex].payments||[]) : []
  };
  if (currentIndex!=null){
    patients[currentIndex] = payload;
  } else {
    patients.push(payload);
    currentIndex = patients.length - 1;
  }
  persist();
  openPatient(currentIndex);
});

byId('btnDeletePatient').addEventListener('click', ()=>{
  if (currentIndex==null) return;
  if (confirm('Delete this patient and all their data?')){
    patients.splice(currentIndex,1);
    currentIndex=null;
    persist();
    closePatientModal();
  }
});

// ======= Visits =======
visitForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  if (currentIndex==null) return alert('Save patient first.');
  const p = patients[currentIndex];
  p.visits = p.visits || [];
  const visitCount = Number(byId('visitCount').value||1);
  let charge = byId('visitCharge').value;
  charge = charge ? Number(charge) : (Number(p.charge||0) * visitCount);
  p.visits.push({ date: byId('visitDate').value || currentDate, count: visitCount, charge });
  byId('visitCount').value = 1;
  byId('visitCharge').value = '';
  persist();
  renderSubTables();
});

function deleteVisit(i){
  if (currentIndex==null) return;
  const p = patients[currentIndex];
  p.visits.splice(i,1);
  persist();
  renderSubTables();
}

// ======= Payments =======
paymentForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  if (currentIndex==null) return alert('Save patient first.');
  const p = patients[currentIndex];
  p.payments = p.payments || [];
  const amount = Number(byId('payAmount').value||0);
  if (amount<=0) return;
  p.payments.push({ date: byId('payDate').value || todayStr(), amount, mode: byId('payMode').value });
  byId('payAmount').value='';
  persist();
  renderSubTables();
});

function deletePayment(i){
  if (currentIndex==null) return;
  const p = patients[currentIndex];
  p.payments.splice(i,1);
  persist();
  renderSubTables();
}

// Quick add from card
function quickVisit(idx){
  const p = patients[idx];
  p.visits = p.visits || [];
  const charge = Number(p.charge||0);
  p.visits.push({ date: currentDate, count: 1, charge });
  persist();
}


function renderSubTables(){
  const p = patients[currentIndex];
  // visits
  const vbody = byId('visitTable').querySelector('tbody');
  vbody.innerHTML = '';
  (p.visits||[]).forEach((v,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${v.date}</td><td>${v.count}</td><td>${currency(v.charge)}</td><td><button class="ghost" onclick="deleteVisit(${i})">Delete</button></td>`;
    vbody.appendChild(tr);
  });

	 // payments
	const pbody = byId('paymentTable').querySelector('tbody');
	pbody.innerHTML = '';
	(p.payments||[]).forEach((r,i)=>{
	  const tr = document.createElement('tr');
	  const isToday = (r.date === todayStr());
	  tr.className = isToday ? 'highlight' : '';
	  tr.innerHTML = `
		<td>${r.date}</td>
		<td>${currency(r.amount)}</td>
		<td>${r.mode||''}</td>
		<td><button class="ghost" onclick="deletePayment(${i})">Delete</button></td>
	  `;
	  pbody.appendChild(tr);
	});

  const sumCharges = (p.visits||[]).reduce((a,v)=>a+Number(v.charge||0),0);
  const sumPays = (p.payments||[]).reduce((a,v)=>a+Number(v.amount||0),0);
  byId('sumCharges').textContent = currency(sumCharges);
  byId('sumPayments').textContent = currency(sumPays);
  byId('balance').textContent = currency(sumCharges - sumPays);
}

// ======= Reports =======
// Set the default date range to the current month
function setDefaultDateRange() {
  const today = new Date();

  // First day of the current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  // Last day of the current month
  // This logic is correct: month + 1, day 0 gets the last day of the previous month
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0); 

  // Format dates to 'YYYY-MM-DD' using local date components
  const formatLocal = (date) => {
    const year = date.getFullYear();
    // getMonth() is 0-indexed, so add 1. padStart ensures '01' instead of '1'
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // getDate() is 1-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fromDate = formatLocal(firstDay);
  const toDate = formatLocal(lastDay);

  // Set the input fields to current month
  byId('fromDate').value = fromDate;
  byId('toDate').value = toDate;

  // Render reports with this date range
  renderReports();
}

// Render the report with filtered patients
function renderReports() {
  const from = byId('fromDate').value || null;
  const to = byId('toDate').value || null;

  const tbody = byId('reportTable').querySelector('tbody');
  tbody.innerHTML='';
  let totalVisits=0, totalCharges=0, totalPays=0;

  patients.forEach(p => {
    const visits = (p.visits || []).filter(v => within(v.date, from, to));
    const pays = (p.payments || []).filter(r => within(r.date, from, to));

    // Only include patients who have visits or payments within the date range
    if (visits.length === 0 && pays.length === 0) return;

    const vCount = visits.reduce((a, v) => a + Number(v.count || 0), 0);
    const vCharges = visits.reduce((a, v) => a + Number(v.charge || 0), 0);
    const pSum = pays.reduce((a, v) => a + Number(v.amount || 0), 0);
    const balance = vCharges - pSum;
    totalVisits += vCount;
    totalCharges += vCharges;
    totalPays += pSum;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name || ''}</td><td>${p.phone || ''}</td><td>${vCount}</td>
      <td>${currency(vCharges)}</td><td>${currency(pSum)}</td><td>${currency(balance)}</td>
    `;
    tbody.appendChild(tr);
  });

  byId('rPatients').textContent = String(patients.length);
  byId('rVisits').textContent = String(totalVisits);
  byId('rCharges').textContent = currency(totalCharges);
  byId('rPayments').textContent = currency(totalPays);
  byId('rBalance').textContent = currency(totalCharges - totalPays);

  byId('tVisits').textContent = String(totalVisits);
  byId('tCharges').textContent = currency(totalCharges);
  byId('tPays').textContent = currency(totalPays);
  byId('tBal').textContent = currency(totalCharges - totalPays);
}

// Helper function to check if the date is within the range
function within(dateStr, from, to) {
  if (!from && !to) return true;
  const d = new Date(dateStr);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return (!from || d >= fromDate) && (!to || d <= toDate);
}


// Export CSV for report table
function exportCSV(){
  const from = byId('fromDate').value || '';
  const to = byId('toDate').value || '';
  let rows = [['Patient','Phone','Visits','Total Charges','Total Payments','Balance']];
  patients.forEach(p=>{
    const visits = (p.visits||[]).filter(v=>within(v.date,from||null,to||null));
    const pays = (p.payments||[]).filter(r=>within(r.date,from||null,to||null));
    const vCount = visits.reduce((a,v)=>a + Number(v.count||0),0);
    const vCharges = visits.reduce((a,v)=>a + Number(v.charge||0),0);
    const pSum = pays.reduce((a,v)=>a + Number(v.amount||0),0);
    rows.push([p.name||'', p.phone||'', vCount, vCharges, pSum, (vCharges-pSum)]);
  });
  const csv = rows.map(r=>r.map(val=>`"${String(val).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clinic-report.csv';
  a.click();
}

// Backup/Restore JSON
function exportJSON(){
  const blob = new Blob([JSON.stringify(patients, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clinic-backup.json';
  a.click();
}
function importJSON(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)){
        patients = data;
        persist();
      } else {
        alert('Invalid backup file.');
      }
    }catch(e){
      alert('Invalid JSON.');
    }
  };
  reader.readAsText(file);
}

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];  // YYYY-MM-DD
}

let currentPaymentFormListener = null;  // Keep track of the current listener to avoid duplicates

// Open Quick Payment Modal with the patient's charge as the default value
function quickPayment(idx) {
  const p = patients[idx];
  const today = todayStr();  // Current date

  // Set the default date for payment
  byId('quickPayDate').value = today;
  
  // Set the default payment amount to the patient's charge per visit (use p.charge)
  byId('quickPayAmount').value = p.charge || '0.00';  // Use patient's charge, default to 0 if not set

  // Show the payment modal
  byId('paymentModal').classList.remove('hidden');

  // Remove any existing event listeners before adding a new one
  if (currentPaymentFormListener) {
    const quickPaymentForm = byId('quickPaymentForm');
    quickPaymentForm.removeEventListener('submit', currentPaymentFormListener);
  }

  // Define the submit handler for this popup session
  currentPaymentFormListener = (e) => handleQuickPaymentSubmit(e, p);

  // Add the event listener for form submission
  const quickPaymentForm = byId('quickPaymentForm');
  quickPaymentForm.addEventListener('submit', currentPaymentFormListener);
}


// Payment submit handler
function handleQuickPaymentSubmit(e, patient) {
  e.preventDefault();

  const amount = Number(byId('quickPayAmount').value || 0);  // Default to 0 if no value entered
  const payDate = byId('quickPayDate').value || todayStr();

  if (amount <= 0) return alert('Invalid amount.');

  // Add payment to the patient
  patient.payments = patient.payments || [];
  patient.payments.push({ date: payDate, amount, mode: 'Cash' });

  // Persist the changes
  persist();  // Save the payment to LocalStorage

  // Close the modal
  closePaymentModal();
}


// Close Payment Modal
function closePaymentModal() {
  byId('paymentModal').classList.add('hidden');

  // Remove the event listener when closing the modal to avoid duplicates
  const quickPaymentForm = byId('quickPaymentForm');
  if (currentPaymentFormListener) {
    quickPaymentForm.removeEventListener('submit', currentPaymentFormListener);
    currentPaymentFormListener = null;  // Clear the listener after removal
  }
}




// ======= Nav & Events =======
byId('btnAdd').addEventListener('click', openAddPatient);
byId('btnReport').addEventListener('click', ()=>{
  byId('dashboardView').classList.add('hidden');
  byId('reportsView').classList.remove('hidden');
  renderReports();
});
byId('btnApplyFilter').addEventListener('click', renderReports);
byId('btnClearFilter').addEventListener('click', ()=>{
  byId('fromDate').value=''; byId('toDate').value=''; renderReports();
});
byId('btnPrint').addEventListener('click', ()=>window.print());
byId('btnExportCSV').addEventListener('click', exportCSV);
byId('btnExport').addEventListener('click', exportJSON);
byId('btnImport').addEventListener('click', ()=> byId('importFile').click());
byId('importFile').addEventListener('change', (e)=>{
  if (e.target.files[0]) importJSON(e.target.files[0]);
});
byId('search').addEventListener('input', (e)=>{
  renderCards((e.target.value||'').toLowerCase());
});

// Simple toggle back to dashboard by clicking title
document.querySelector('.topbar h1').addEventListener('click', ()=>{
  byId('reportsView').classList.add('hidden');
  byId('dashboardView').classList.remove('hidden');
});

// ======= Init =======
 document.getElementById('toggleActionBtn').addEventListener('click', function () {
      const actionsSection = document.getElementById('actionsSection');
      const dropdownIcon = document.getElementById('dropdownIcon');
      actionsSection.classList.toggle('hidden');
      
      // Change the icon based on visibility
      if (actionsSection.classList.contains('hidden')) {
        dropdownIcon.textContent = '▼';  // Show downward arrow
      } else {
        dropdownIcon.textContent = '▲';  // Show upward arrow
      }
    });
	
document.addEventListener('DOMContentLoaded', setDefaultDateRange);
renderCards();
