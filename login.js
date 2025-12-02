// login.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = 'index.html';
        }
    });
    
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Disable button and show loading
        const originalText = loginButton.innerHTML;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginButton.disabled = true;
        errorMessage.style.display = 'none';
        
        try {
            // For demo purposes - hardcoded credentials
            if (email === 'demo@company.com' && password === 'demopassword123') {
                // Create a dummy session for demo
                localStorage.setItem('demo_user', JSON.stringify({
                    email: 'demo@company.com',
                    name: 'Demo User'
                }));
                window.location.href = 'index.html';
                return;
            }
            
            // Real Supabase authentication
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Login successful
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message || 'Invalid email or password';
            errorMessage.style.display = 'block';
            
            // Reset button
            loginButton.innerHTML = originalText;
            loginButton.disabled = false;
        }
    });
});

// Show signup modal
function showSignup() {
    document.getElementById('signupModal').style.display = 'block';
}

// Close signup modal
function closeSignupModal() {
    document.getElementById('signupModal').style.display = 'none';
    document.getElementById('signupForm').reset();
    document.getElementById('signupErrorMessage').style.display = 'none';
}

// Handle signup form submission
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorMessage = document.getElementById('signupErrorMessage');
            
            // Validate passwords match
            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.style.display = 'block';
                return;
            }
            
            // Validate password length
            if (password.length < 6) {
                errorMessage.textContent = 'Password must be at least 6 characters';
                errorMessage.style.display = 'block';
                return;
            }
            
            try {
                // Sign up with Supabase
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        emailRedirectTo: 'https://692e8e85c2aea20cd16a0d3e--primecompanyflies.netlify.app/'
                    }
                });
                
                if (error) throw error;
                
                // Show success message
                alert('Account created successfully! Please check your email to confirm your account.');
                closeSignupModal();
                
            } catch (error) {
                console.error('Signup error:', error);
                errorMessage.textContent = error.message || 'Error creating account';
                errorMessage.style.display = 'block';
            }
        });
    }
});