// login.js - Simplified for testing
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
            // For testing, create a simple test account
            if (!email || !password) {
                throw new Error('Please enter email and password');
            }
            
            // Try to sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                // If user doesn't exist, try to sign up
                if (error.message.includes('Invalid login credentials')) {
                    const { data: signupData, error: signupError } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            emailRedirectTo: window.location.origin + '/login.html'
                        }
                    });
                    
                    if (signupError) throw signupError;
                    
                    // Auto-login after signup
                    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });
                    
                    if (loginError) throw loginError;
                    
                    data = loginData;
                } else {
                    throw error;
                }
            }
            
            // Login successful
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Auth error:', error);
            errorMessage.textContent = error.message || 'Authentication failed';
            errorMessage.style.display = 'block';
            
            // Reset button
            loginButton.innerHTML = originalText;
            loginButton.disabled = false;
        }
    });
    
    // Add test credentials helper
    const testCredentials = document.createElement('div');
    testCredentials.innerHTML = `
        <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #333;">
                <strong>Test Account:</strong> test@company.com / testpassword123
            </p>
        </div>
    `;
    loginForm.parentNode.insertBefore(testCredentials, loginForm.nextSibling);
});