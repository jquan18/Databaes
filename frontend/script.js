// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Sections
    const registerSection = document.getElementById('register-section');
    const loginSection = document.getElementById('login-section');
    const uploadSection = document.getElementById('upload-section');
    const filesSection = document.getElementById('files-section');
    const downloadSection = document.getElementById('download-section');

    // Navigation Links
    const showLoginLink = document.getElementById('show-login');
    const showRegisterLink = document.getElementById('show-register');

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('d-none');
        loginSection.classList.remove('d-none');
    });

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('d-none');
        registerSection.classList.remove('d-none');
    });

    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (token) {
        showAuthenticatedSections();
    } else {
        showUnauthenticatedSections();
    }

    function showAuthenticatedSections() {
        registerSection.classList.add('d-none');
        loginSection.classList.add('d-none');
        uploadSection.classList.remove('d-none');
        filesSection.classList.remove('d-none');
        downloadSection.classList.remove('d-none');
        fetchFiles();
    }

    function showUnauthenticatedSections() {
        registerSection.classList.remove('d-none');
        loginSection.classList.add('d-none');
        uploadSection.classList.add('d-none');
        filesSection.classList.add('d-none');
        downloadSection.classList.add('d-none');
    }

    // Registration
    const registerForm = document.getElementById('register-form');
    const registerMessage = document.getElementById('register-message');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerMessage.innerHTML = '';

        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value.trim();
        const organization = document.getElementById('register-organization').value.trim();

        try {
            const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, organization }),
            });

            const data = await response.json();

            if (response.ok) {
                registerMessage.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                registerForm.reset();
                // Redirect to login
                setTimeout(() => {
                    registerSection.classList.add('d-none');
                    loginSection.classList.remove('d-none');
                }, 2000);
            } else {
                registerMessage.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            registerMessage.innerHTML = `<div class="alert alert-danger">Registration failed. Please try again.</div>`;
            console.error('Error:', error);
        }
    });

    // Login
    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginMessage.innerHTML = '';

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        try {
            const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                loginMessage.innerHTML = `<div class="alert alert-success">Login successful!</div>`;
                loginForm.reset();
                showAuthenticatedSections();
            } else {
                loginMessage.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            loginMessage.innerHTML = `<div class="alert alert-danger">Login failed. Please try again.</div>`;
            console.error('Error:', error);
        }
    });

    // File Upload
    const uploadForm = document.getElementById('upload-form');
    const uploadMessage = document.getElementById('upload-message');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        uploadMessage.innerHTML = '';

        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];

        if (!file) {
            uploadMessage.innerHTML = `<div class="alert alert-warning">Please select a file to upload.</div>`;
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${getApiBaseUrl()}/files/upload`, {
                method: 'POST',
                headers: {
                    // 'Content-Type': 'multipart/form-data', // Let the browser set it
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                uploadMessage.innerHTML = `<div class="alert alert-success">File uploaded successfully! File ID: ${data.fileId}, IPFS CID: ${data.ipfsCID}</div>`;
                uploadForm.reset();
                fetchFiles();
            } else {
                uploadMessage.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            uploadMessage.innerHTML = `<div class="alert alert-danger">File upload failed. Please try again.</div>`;
            console.error('Error:', error);
        }
    });

    // Fetch Files
    const filesTableBody = document.querySelector('#files-table tbody');
    const filesMessage = document.getElementById('files-message');

    async function fetchFiles() {
        filesTableBody.innerHTML = '';
        filesMessage.innerHTML = '';

        try {
            const response = await fetch(`${getApiBaseUrl()}/files`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok) {
                if (data.length === 0) {
                    filesMessage.innerHTML = `<div class="alert alert-info">No files found.</div>`;
                    return;
                }

                data.forEach(file => {
                    const row = document.createElement('tr');

                    const fileIdCell = document.createElement('td');
                    fileIdCell.textContent = file.Record.fileId;
                    row.appendChild(fileIdCell);

                    const fileNameCell = document.createElement('td');
                    fileNameCell.textContent = file.Record.fileName;
                    row.appendChild(fileNameCell);

                    const mimeTypeCell = document.createElement('td');
                    mimeTypeCell.textContent = file.Record.mimeType;
                    row.appendChild(mimeTypeCell);

                    const cidCell = document.createElement('td');
                    cidCell.textContent = file.Record.ipfsCID;
                    row.appendChild(cidCell);

                    const actionsCell = document.createElement('td');
                    const downloadButton = document.createElement('button');
                    downloadButton.className = 'btn btn-warning btn-sm';
                    downloadButton.textContent = 'Download';
                    downloadButton.addEventListener('click', () => {
                        showDownloadForm(file.Record.fileId);
                    });
                    actionsCell.appendChild(downloadButton);
                    row.appendChild(actionsCell);

                    filesTableBody.appendChild(row);
                });
            } else {
                filesMessage.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            filesMessage.innerHTML = `<div class="alert alert-danger">Failed to fetch files.</div>`;
            console.error('Error:', error);
        }
    }

    // Show Download Form
    function showDownloadForm(fileId) {
        downloadSection.classList.remove('d-none');
        document.getElementById('download-fileId').value = fileId;
        window.scrollTo(0, document.body.scrollHeight);
    }

    // File Download
    const downloadForm = document.getElementById('download-form');
    const downloadMessage = document.getElementById('download-message');

    downloadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        downloadMessage.innerHTML = '';

        const fileId = document.getElementById('download-fileId').value.trim();
        const sharesInput = document.getElementById('download-shares').value.trim();

        if (!fileId || !sharesInput) {
            downloadMessage.innerHTML = `<div class="alert alert-warning">Please provide both File ID and shares.</div>`;
            return;
        }

        const shares = sharesInput.split(',').map(share => share.trim()).filter(share => share !== '');

        try {
            const response = await fetch(`${getApiBaseUrl()}/files/${fileId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ shares }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let fileName = 'downloaded_file';

                if (contentDisposition && contentDisposition.includes('filename=')) {
                    fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                downloadMessage.innerHTML = `<div class="alert alert-success">File downloaded successfully!</div>`;
                downloadForm.reset();
            } else {
                const data = await response.json();
                downloadMessage.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }
        } catch (error) {
            downloadMessage.innerHTML = `<div class="alert alert-danger">File download failed. Please try again.</div>`;
            console.error('Error:', error);
        }
    });

    // Utility Function to Get API Base URL
    function getApiBaseUrl() {
        return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
    }
});
