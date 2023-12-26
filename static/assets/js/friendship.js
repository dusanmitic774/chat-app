document.addEventListener('DOMContentLoaded', function() {
  const addFriendButton = document.getElementById('addFriendButton');

  addFriendButton.addEventListener('click', function() {
    const identifier = document.getElementById('identifier').value;
    sendFriendRequestByUsername(identifier);
  });

  document.querySelectorAll('.accept-request').forEach(button => {
    button.addEventListener('click', function() {
      const requestId = this.getAttribute('data-request-id');
      updateFriendRequest(requestId, 'accept');
    });
  });

  document.querySelectorAll('.decline-request').forEach(button => {
    button.addEventListener('click', function() {
      const requestId = this.getAttribute('data-request-id');
      updateFriendRequest(requestId, 'decline');
    });
  });


  document.querySelectorAll('.remove-friend').forEach(button => {
    button.addEventListener('click', function() {
      const friendId = this.getAttribute('data-user-id');
      removeFriend(friendId);
    });
  });
});

function sendFriendRequestByUsername(identifier) {
  fetch('/send-friend-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier: identifier }),
    credentials: 'same-origin'
  }).then(response => response.json())
    .then(data => {
      // alert(data.message); // Placeholder for better UI feedback
      console.log("test")
    }).catch(error => {
      // console.error('Error sending friend request:', error);
    });
}

function updateFriendRequest(requestId, action) {
  const url = action === 'accept' ? `/accept-friend-request/${requestId}` : `/decline-friend-request/${requestId}`;
  console.log(url)
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  }).then(response => response.json())
    .then(data => {
      alert(data.message); // Placeholder for better UI feedback
      location.reload(); // Reload the page to update the UI
    }).catch(error => {
      console.error(`Error updating friend request:`, error);
    });
}

function removeFriend(friendId) {
  fetch(`/remove-friend/${friendId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  }).then(response => response.json())
    .then(data => {
      alert(data.message); // Placeholder for better UI feedback
      location.reload(); // Reload the page to update the UI
    }).catch(error => {
      console.error('Error removing friend:', error);
    });
}
