document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const switchToSignup = document.getElementById('switchToSignup');
  const switchToLogin = document.getElementById('switchToLogin');

  switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  });

  switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
  });
});

// Check URL to show the signup form if needed
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('show') === 'signup') {
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
}

document.getElementById('signupForm').addEventListener('submit', function(event) {
  const passwordInput = document.getElementById('signupPassword');
  const password = passwordInput.value;
  const passwordError = isPasswordStrong(password);

  if (passwordError) {
    event.preventDefault();
    displayPasswordError(passwordError);
  }
});

function displayPasswordError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger';
  errorDiv.textContent = message;
  const form = document.getElementById('signupForm');
  form.prepend(errorDiv);
}
