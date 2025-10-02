// ======= Storage Helpers =======
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

// ======= Dashboard =======
function renderCards(filter=''){
  const list = byId('patientList');
  list.innerHTML = '';
  let data = patients;
  if (filter) {
    data = data.filter(p => (p.name||'').toLowerCase().includes(filter) || (p.phone||'').includes(filter));
  }
  byId('emptyState').classList.toggle('hidden', data.length !== 0);
  data.forEach((p, idx) => {
    const totalCharges = (p.visits||[]).reduce((a,v)=>a+Number(v.charge||0),0);
    const totalPayments = (p.payments||[]).reduce((a,v)=>a+Number(v.amount||0),0);
    const balance = totalCharges - totalPayments;
    const card = document.createElement('div');
    card.className = 'card';
    const imgSrc = p.photo || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22><rect width=%2272%22 height=%2272%22 fill=%22%23f3f4f6%22/><text x=%2236%22 y=%2238%22 font-size=%2214%22 text-anchor=%22middle%22 fill=%22%23999%22>Photo</text></svg>';
    card.innerHTML = `
      <div class="row">
        <img class="avatar" src="${imgSrc}" alt="photo"/>
        <div style="flex:1; padding-left:10px">
          <div class="name">${p.name || ''}</div>
          <div class="muted">${p.age||''} • ${p.gender||''}</div>
          <div class="muted">${p.phone||''}</div>
        </div>
      </div>
      <div class="row">
        <span class="badge">₹${(p.charge||0)}/visit</span>
        <span class="badge">Balance: ${currency(balance)}</span>
      </div>
      <div class="row" style="gap:8px; margin-top:6px;">
        <button onclick="openPatient(${idx})">View</button>
        <button class="ghost" onclick="quickVisit(${idx})">+ Visit</button>
        <button class="ghost" onclick="quickPayment(${idx})">+ Payment</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// ======= Modals & Forms =======
function openAddPatient(){
  currentIndex = null;
  byId('modalTitle').textContent = 'Add Patient';
  patientForm.reset();
  byId('photoPreview').src = '';
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
  p.visits.push({ date: byId('visitDate').value || todayStr(), count: visitCount, charge });
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
  p.visits.push({ date: todayStr(), count: 1, charge });
  persist();
}
function quickPayment(idx){
  const amount = prompt('Enter payment amount (₹):');
  if (amount==null) return;
  const num = Number(amount);
  if (isNaN(num) || num<=0) return alert('Invalid amount.');
  const p = patients[idx];
  p.payments = p.payments || [];
  p.payments.push({ date: todayStr(), amount: num, mode: 'Cash' });
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
    tr.innerHTML = `<td>${r.date}</td><td>${currency(r.amount)}</td><td>${r.mode||''}</td><td><button class="ghost" onclick="deletePayment(${i})">Delete</button></td>`;
    pbody.appendChild(tr);
  });
  const sumCharges = (p.visits||[]).reduce((a,v)=>a+Number(v.charge||0),0);
  const sumPays = (p.payments||[]).reduce((a,v)=>a+Number(v.amount||0),0);
  byId('sumCharges').textContent = currency(sumCharges);
  byId('sumPayments').textContent = currency(sumPays);
  byId('balance').textContent = currency(sumCharges - sumPays);
}

// ======= Reports =======
function renderReports(){
  const from = byId('fromDate').value || null;
  const to = byId('toDate').value || null;

  const tbody = byId('reportTable').querySelector('tbody');
  tbody.innerHTML='';
  let totalVisits=0, totalCharges=0, totalPays=0;

  patients.forEach(p=>{
    const visits = (p.visits||[]).filter(v=>within(v.date,from,to));
    const pays = (p.payments||[]).filter(r=>within(r.date,from,to));
    const vCount = visits.reduce((a,v)=>a + Number(v.count||0),0);
    const vCharges = visits.reduce((a,v)=>a + Number(v.charge||0),0);
    const pSum = pays.reduce((a,v)=>a + Number(v.amount||0),0);
    const balance = vCharges - pSum;
    totalVisits += vCount;
    totalCharges += vCharges;
    totalPays += pSum;

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.name||''}</td><td>${p.phone||''}</td><td>${vCount}</td><td>${currency(vCharges)}</td><td>${currency(pSum)}</td><td>${currency(balance)}</td>`;
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
        alert('Restore complete.');
      } else {
        alert('Invalid backup file.');
      }
    }catch(e){
      alert('Invalid JSON.');
    }
  };
  reader.readAsText(file);
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
renderCards();
