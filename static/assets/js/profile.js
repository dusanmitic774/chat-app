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

    // Create FormData object
    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('profilePicture', document.getElementById('profilePicture').files[0]);

    fetch('/update-profile', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        console.log(data.message);
        // Additional handling (e.g., display a success message)
      })
      .catch(error => console.error('Error:', error));
  });
});
