document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('must_reset', data.must_reset_password);
                    if (data.theme_pref) {
                        localStorage.setItem('themePref', data.theme_pref);
                    } else {
                        localStorage.removeItem('themePref');
                    }
                    
                    if (data.must_reset_password) {
                        window.location.href = '/change-password.html';
                    } else if (data.role === 'Admin') {
                        window.location.href = '/admin/dashboard.html';
                    } else {
                        window.location.href = '/dashboard.html';
                    }
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred');
            }
        });
    }
});
