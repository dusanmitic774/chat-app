document.addEventListener('DOMContentLoaded', function() {
  const userProfileButton = document.getElementById('openUserProfile');
  const toggleChatButton = document.getElementById('toggleChat');
  const chatContainer = document.getElementById('chatContainer');
  const userProfileContainer = document.getElementById('userProfile');

  userProfileButton.addEventListener('click', function() {
    chatContainer.style.display = 'none';
    userProfileContainer.style.display = 'block';
    userProfileButton.style.display = 'none';
    toggleChatButton.style.display = 'block';
  });

  toggleChatButton.addEventListener('click', function() {
    chatContainer.style.display = 'block';
    userProfileContainer.style.display = 'none';
    userProfileButton.style.display = 'block';
    toggleChatButton.style.display = 'none';
  });

  // Update user profile
  const editUsernameBtn = document.getElementById('editUsername');
  const editEmailBtn = document.getElementById('editEmail');
  const userProfileForm = document.getElementById('userProfileForm');

  // Enable editing for username
  editUsernameBtn.addEventListener('click', function() {
    document.getElementById('username').removeAttribute('readonly');
  });

  // Enable editing for email
  editEmailBtn.addEventListener('click', function() {
    document.getElementById('email').removeAttribute('readonly');
  });

  // Handle form submission
  userProfileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;

    // Add validation for password and repeatPassword match here if required

    const data = { username, email, password };
    fetch('/update-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
      console.log(data.message);
      // Additional handling (e.g., display a success message)
    })
    .catch(error => console.error('Error:', error));
  });
});
