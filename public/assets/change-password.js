document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/';
                return;
            }

            document.getElementById('change-password-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPass = document.getElementById('new_password').value;
                const confirmPass = document.getElementById('confirm_password').value;

                if (newPass !== confirmPass) {
                    alert('Passwords do not match!');
                    return;
                }

                try {
                    const res = await fetch('/api/auth/change-password', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ newPassword: newPass })
                    });

                    if (res.ok) {
                        alert('Password changed successfully! Please login again.');
                        localStorage.clear();
                        window.location.href = '/';
                    } else {
                        const data = await res.json();
                        alert(data.message || 'Error changing password');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Network error');
                }
            });
        });