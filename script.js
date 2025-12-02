// script.js

// Temporary bypass for testing
const tempBypassAuth = true;

if (tempBypassAuth) {
    // Create a mock user session
    currentUser = {
        email: 'test@company.com'
    };
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Load files without auth check
    setupEventListeners();
    loadFiles();
    
    // Override logout
    window.logout = function() {
        if (confirm('Log out?')) {
            window.location.href = 'login.html';
        }
    };
    
    // Skip the rest of the auth initialization
    // Don't run the original DOMContentLoaded code
    document.addEventListener('DOMContentLoaded', function() {
        // Already handled above
    });
} else {
    // Original code here...
    // [Keep all your original code after this else block]
}
let currentUser = null;
let allFiles = [];
let currentFilter = 'all';
let isUploading = false;

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = session.user;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Setup event listeners first
    setupEventListeners();
    
    // Then load files
    await loadFiles();
    
    // Set up auto-refresh every 30 seconds
    setInterval(loadFiles, 30000);
});

// Setup event listeners
function setupEventListeners() {
    // File input change
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: { files } });
        }
    });
    
    // Click on upload area to trigger file input
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== fileInput && e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterAndDisplayFiles();
        }, 300);
    });
    
    // Enter key in description
    document.getElementById('description').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            uploadFiles();
        }
    });
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        let fileList = '';
        for (let i = 0; i < Math.min(files.length, 3); i++) {
            fileList += files[i].name;
            if (i < Math.min(files.length, 3) - 1) fileList += ', ';
        }
        if (files.length > 3) {
            fileList += ` and ${files.length - 3} more`;
        }
        document.querySelector('.upload-area p').textContent = fileList;
    }
}

// Upload files to Supabase
async function uploadFiles() {
    if (isUploading) return;
    
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    const description = document.getElementById('description').value;
    
    if (files.length === 0) {
        showToast('Please select files to upload', 'error');
        return;
    }
    
    // Check total size (limit to 50MB per upload)
    let totalSize = 0;
    for (let file of files) {
        totalSize += file.size;
    }
    if (totalSize > 50 * 1024 * 1024) {
        showToast('Total file size exceeds 50MB limit', 'error');
        return;
    }
    
    isUploading = true;
    const uploadBtn = document.querySelector('.upload-btn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            // Upload file to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('files')
                .upload(fileName, file);
            
            if (uploadError) {
                console.error('Upload error for', file.name, uploadError);
                errorCount++;
                continue;
            }
            
            // Insert file record into database
            const { error: dbError } = await supabase
                .from('files')
                .insert({
                    name: file.name,
                    storage_path: fileName,
                    size: file.size,
                    type: file.type,
                    description: description,
                    uploaded_by: currentUser.email,
                    uploaded_at: new Date().toISOString()
                });
            
            if (dbError) {
                console.error('Database error for', file.name, dbError);
                errorCount++;
                // Try to delete the uploaded file if DB insert failed
                await supabase.storage.from('files').remove([fileName]);
            } else {
                successCount++;
            }
        }
        
        // Clear form
        fileInput.value = '';
        document.getElementById('description').value = '';
        document.querySelector('.upload-area p').textContent = 
            'Drag & drop files here or click to browse';
        
        // Refresh file list
        await loadFiles();
        
        // Show success message
        if (successCount > 0) {
            showToast(`Successfully uploaded ${successCount} file(s)`, 'success');
        }
        if (errorCount > 0) {
            showToast(`Failed to upload ${errorCount} file(s)`, 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Error uploading files: ' + error.message, 'error');
    } finally {
        isUploading = false;
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
}

// Load files from Supabase
async function loadFiles() {
    try {
        const { data: files, error } = await supabase
            .from('files')
            .select('*')
            .order('uploaded_at', { ascending: false });
        
        if (error) throw error;
        
        allFiles = files || [];
        
        // Update stats
        updateStats();
        
        // Display files
        filterAndDisplayFiles();
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files', 'error');
    }
}

// Update statistics
function updateStats() {
    const totalFiles = allFiles.length;
    const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const storageUsed = (totalSize / (1024 * 1024)).toFixed(2);
    
    document.getElementById('totalFiles').textContent = totalFiles;
    document.getElementById('storageUsed').textContent = `${storageUsed} MB`;
}

// Filter and display files
function filterAndDisplayFiles() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredFiles = allFiles.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm) ||
                             (file.description && file.description.toLowerCase().includes(searchTerm));
        
        if (!matchesSearch) return false;
        
        if (currentFilter === 'all') return true;
        
        const fileType = file.type || '';
        if (currentFilter === 'pdf' && fileType.includes('pdf')) return true;
        if (currentFilter === 'image' && fileType.startsWith('image/')) return true;
        if (currentFilter === 'document' && (
            fileType.includes('word') || 
            fileType.includes('excel') ||
            fileType.includes('powerpoint') ||
            fileType.includes('text') ||
            file.name.toLowerCase().endsWith('.doc') ||
            file.name.toLowerCase().endsWith('.docx') ||
            file.name.toLowerCase().endsWith('.xls') ||
            file.name.toLowerCase().endsWith('.xlsx') ||
            file.name.toLowerCase().endsWith('.ppt') ||
            file.name.toLowerCase().endsWith('.pptx') ||
            file.name.toLowerCase().endsWith('.txt')
        )) return true;
        if (currentFilter === 'other' && !fileType.includes('pdf') && 
            !fileType.startsWith('image/') && !(
                fileType.includes('word') || 
                fileType.includes('excel') ||
                fileType.includes('powerpoint') ||
                fileType.includes('text')
            )) return true;
        
        return false;
    });
    
    displayFiles(filteredFiles);
}

// Display files in table
function displayFiles(files) {
    const tbody = document.getElementById('fileTableBody');
    
    if (files.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-folder-open" style="font-size: 48px; margin-bottom: 15px; display: block; color: #ddd;"></i>
                    No files found. Upload some files to get started!
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    files.forEach(file => {
        const fileSize = file.size ? formatFileSize(file.size) : 'Unknown';
        const uploadDate = new Date(file.uploaded_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        html += `
            <tr>
                <td>
                    <div class="file-name-cell">
                        ${getFileIcon(file.type)}
                        <span style="font-weight: 500;" title="${file.name}">${truncateFileName(file.name, 30)}</span>
                    </div>
                </td>
                <td title="${file.description || ''}">${truncateText(file.description || '-', 40)}</td>
                <td>${fileSize}</td>
                <td>${file.uploaded_by}</td>
                <td>${uploadDate}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn download-btn" onclick="downloadFile('${file.storage_path}', '${file.name}')" title="Download">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="action-btn preview-btn" onclick="previewFile('${file.storage_path}', '${file.type}', '${file.name}')" title="Preview">
                            <i class="fas fa-eye"></i> Preview
                        </button>
                        ${currentUser.email === file.uploaded_by ? `
                        <button class="action-btn delete-btn" onclick="deleteFile('${file.id}', '${file.storage_path}', '${file.name}')" title="Delete">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Truncate file name for display
function truncateFileName(name, maxLength) {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.slice(0, -(extension.length + 1));
    const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 3);
    return `${truncatedName}...${extension}`;
}

// Truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

// Get file icon based on type
function getFileIcon(fileType) {
    if (!fileType) return '<i class="fas fa-file" style="color: #666;"></i>';
    
    if (fileType.includes('pdf')) {
        return '<i class="fas fa-file-pdf" style="color: #e74c3c;"></i>';
    } else if (fileType.startsWith('image/')) {
        return '<i class="fas fa-file-image" style="color: #3498db;"></i>';
    } else if (fileType.includes('word') || fileType.includes('msword') || fileType.includes('document')) {
        return '<i class="fas fa-file-word" style="color: #2c3e50;"></i>';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
        return '<i class="fas fa-file-excel" style="color: #27ae60;"></i>';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
        return '<i class="fas fa-file-powerpoint" style="color: #e67e22;"></i>';
    } else if (fileType.includes('text') || fileType.includes('plain')) {
        return '<i class="fas fa-file-alt" style="color: #9b59b6;"></i>';
    } else if (fileType.includes('zip') || fileType.includes('compressed')) {
        return '<i class="fas fa-file-archive" style="color: #f39c12;"></i>';
    } else {
        return '<i class="fas fa-file" style="color: #666;"></i>';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Download file
async function downloadFile(storagePath, fileName) {
    try {
        const { data, error } = await supabase.storage
            .from('files')
            .download(storagePath);
        
        if (error) throw error;
        
        // Create download link
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Download started', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Error downloading file', 'error');
    }
}

// Preview file
async function previewFile(storagePath, fileType, fileName) {
    try {
        // Get public URL for the file
        const { data } = supabase.storage
            .from('files')
            .getPublicUrl(storagePath);
        
        const publicUrl = data.publicUrl;
        
        const modal = document.getElementById('previewModal');
        const previewContent = document.getElementById('previewContent');
        
        previewContent.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #2c3e50;">
                <i class="fas ${getPreviewIcon(fileType)}"></i> ${fileName}
            </h3>
            <div style="margin-top: 20px;">
        `;
        
        if (fileType.startsWith('image/')) {
            previewContent.innerHTML += `
                <div style="text-align: center;">
                    <img src="${publicUrl}" alt="${fileName}" style="max-width: 100%; max-height: 500px; border-radius: 5px; box-shadow: 0 3px 10px rgba(0,0,0,0.1);">
                </div>
            `;
        } else if (fileType.includes('pdf')) {
            previewContent.innerHTML += `
                <iframe src="${publicUrl}" width="100%" height="500px" style="border: none; border-radius: 5px; box-shadow: 0 3px 10px rgba(0,0,0,0.1);"></iframe>
            `;
        } else if (fileType.includes('text') || fileType.includes('plain')) {
            // For text files, fetch and display content
            const { data: fileData, error } = await supabase.storage
                .from('files')
                .download(storagePath);
            
            if (!error) {
                const text = await fileData.text();
                previewContent.innerHTML += `
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; max-height: 500px; overflow: auto; font-family: monospace; white-space: pre-wrap;">
                        ${escapeHtml(text)}
                    </div>
                `;
            } else {
                throw error;
            }
        } else {
            previewContent.innerHTML += `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-file" style="font-size: 72px; margin-bottom: 20px; display: block; color: #ddd;"></i>
                    <h4 style="margin-bottom: 10px;">Preview not available</h4>
                    <p style="margin-bottom: 20px;">This file type cannot be previewed in the browser.</p>
                    <button class="action-btn download-btn" onclick="downloadFile('${storagePath}', '${fileName}')" style="margin: 0 auto;">
                        <i class="fas fa-download"></i> Download File
                    </button>
                </div>
            `;
        }
        
        previewContent.innerHTML += '</div>';
        modal.style.display = 'block';
    } catch (error) {
        console.error('Preview error:', error);
        showToast('Error previewing file', 'error');
    }
}

// Get preview icon
function getPreviewIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-image';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('text') || fileType.includes('plain')) return 'fa-file-alt';
    return 'fa-file';
}

// Escape HTML for text preview
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close preview modal
function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
    document.getElementById('previewContent').innerHTML = '';
}

// Delete file
async function deleteFile(fileId, storagePath, fileName) {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('files')
            .remove([storagePath]);
        
        if (storageError) throw storageError;
        
        // Delete from database
        const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId);
        
        if (dbError) throw dbError;
        
        // Refresh file list
        await loadFiles();
        
        showToast('File deleted successfully', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error deleting file', 'error');
    }
}

// Filter files by type
function filterFiles(type) {
    currentFilter = type;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    filterAndDisplayFiles();
}

// Logout
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear local storage
        localStorage.removeItem('supabase.auth.token');
        
        // Redirect to login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}