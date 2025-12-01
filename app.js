// Supabase File Portal — app.js
// Replace the placeholders below with your Supabase credentials
const SUPABASE_URL = 'https://sbexusqjvmfbumnedfey.supabase.co'; // <-- replace
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZXh1c3Fqdm1mYnVtbmVkZmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1ODAzNjYsImV4cCI6MjA4MDE1NjM2Nn0.KHjvE8TII5lqAT_jorvCZl9HsMWQ3h8KYTwapQMH9rQ'; // <-- replace
const BUCKET = 'companyfiles'; // Ensure you created this bucket in Supabase

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// UI elements
const authView = document.getElementById('authView');
const dashboardView = document.getElementById('dashboardView');
const filesView = document.getElementById('filesView');
const profileView = document.getElementById('profileView');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const authMessage = document.getElementById('authMessage');
const signOutBtn = document.getElementById('signOutBtn');
const userEmailEl = document.getElementById('userEmail');

const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const filesList = document.getElementById('filesList');
const filesTable = document.getElementById('filesTable');
const refreshBtn = document.getElementById('refreshBtn');

// Navigation buttons
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click', e=>{
  document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('active'));
  e.target.classList.add('active');
  const view = e.target.dataset.view;
  showView(view);
}));

function showView(name){
  authView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  filesView.classList.add('hidden');
  profileView.classList.add('hidden');

  if(name==='dashboard') dashboardView.classList.remove('hidden');
  if(name==='files') filesView.classList.remove('hidden');
  if(name==='profile') profileView.classList.remove('hidden');
}

// Auth handlers
signInBtn.addEventListener('click', async ()=>{
  authMessage.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if(!email || !password){ authMessage.textContent = 'Enter email and password.'; return; }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){ authMessage.textContent = error.message; return; }
  await onAuthChange(data.user);
});

signUpBtn.addEventListener('click', async ()=>{
  authMessage.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if(!email || !password){ authMessage.textContent = 'Enter email and password.'; return; }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if(error){ authMessage.textContent = error.message; return; }
  authMessage.textContent = 'Account created — check your email to verify (if enabled).';
});

signOutBtn.addEventListener('click', async ()=>{
  await supabase.auth.signOut();
  window.location.reload();
});

// On auth change
supabase.auth.onAuthStateChange((event, session)=>{
  const user = session?.user ?? null;
  onAuthChange(user);
});

async function onAuthChange(user){
  if(!user){
    authView.classList.remove('hidden');
    document.querySelector('.sidebar').style.display = 'none';
    return;
  }
  document.querySelector('.sidebar').style.display = 'flex';
  userEmailEl.textContent = user.email;
  document.getElementById('profileEmail').textContent = 'Email: ' + (user.email || '—');
  document.getElementById('profileId').textContent = 'User ID: ' + user.id;
  showView('dashboard');
  await listFiles();
}

// Upload
uploadBtn.addEventListener('click', async ()=>{
  const files = fileInput.files;
  const folder = (folderInput.value || '').replace(/^\/+|\/+$/g, '');
  if(!files || files.length===0){ uploadStatus.textContent = 'No files selected.'; return; }
  uploadStatus.textContent = 'Uploading...';

  for(const f of files){
    const path = (folder ? folder + '/' : '') + Date.now() + '_' + f.name;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { cacheControl: '3600', upsert: false });
    if(error){ uploadStatus.textContent = 'Upload failed: ' + error.message; console.error(error); return; }
  }
  uploadStatus.textContent = 'Upload complete.';
  fileInput.value = '';
  folderInput.value = '';
  await listFiles();
});

// List files (simple recent list)
async function listFiles(){
  filesList.innerHTML = 'Loading...';
  filesTable.innerHTML = 'Loading...';

  const { data, error } = await supabase.storage.from(BUCKET).list('', {limit: 100, offset: 0, sortBy: { column: 'updated_at', order: 'desc' }});
  if(error){ filesList.innerHTML = 'Could not load files: ' + error.message; return; }

  if(!data || data.length===0){ filesList.innerHTML = '<div class="small">No files yet.</div>'; filesTable.innerHTML = '<div class="small">No files yet.</div>'; return; }

  filesList.innerHTML = '';
  filesTable.innerHTML = '';

  data.forEach(item=>{
    const el = document.createElement('div');
    el.className = 'file-item';
    const meta = document.createElement('div');
    meta.className = 'file-meta';
    meta.innerHTML = `<strong>${item.name}</strong><div class="small">${item.id || ''} • ${item.updated_at || ''}</div>`;

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const dl = document.createElement('button'); dl.className='btn small ghost'; dl.textContent='Download';
    dl.addEventListener('click', ()=>downloadFile(item.name));

    const del = document.createElement('button'); del.className='btn small'; del.textContent='Delete';
    del.addEventListener('click', ()=>deleteFile(item.name));

    actions.appendChild(dl); actions.appendChild(del);

    el.appendChild(meta); el.appendChild(actions);
    filesList.appendChild(el);

    // table row
    const row = document.createElement('div'); row.className='file-item';
    row.innerHTML = `<div class="file-meta"><strong>${item.name}</strong><div class='small'>${item.updated_at || ''}</div></div>`;
    const rowActions = document.createElement('div'); rowActions.className = 'file-actions';
    const dl2 = document.createElement('button'); dl2.className='btn small ghost'; dl2.textContent='Download'; dl2.addEventListener('click', ()=>downloadFile(item.name));
    const del2 = document.createElement('button'); del2.className='btn small'; del2.textContent='Delete'; del2.addEventListener('click', ()=>deleteFile(item.name));
    rowActions.appendChild(dl2); rowActions.appendChild(del2);
    row.appendChild(rowActions);

    filesTable.appendChild(row);
  });
}

refreshBtn.addEventListener('click', listFiles);

// Download file
async function downloadFile(path){
  try{
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if(error){ alert('Download failed: ' + error.message); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch(err){ alert('Download error: ' + err.message); }
}

// Delete file
async function deleteFile(path){
  if(!confirm('Delete "' + path + '"? This cannot be undone.')) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if(error){ alert('Delete failed: ' + error.message); return; }
  await listFiles();
}

// Initial check
(async ()=>{
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user ?? null;
  onAuthChange(user);
})();
