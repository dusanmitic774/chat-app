document.addEventListener('DOMContentLoaded', function() {
  const addFriendButton = document.getElementById('addFriendButton');

  addFriendButton.addEventListener('click', function() {
    const identifier = document.getElementById('identifier').value;
    sendFriendRequestByUsernameOrEmail(identifier);
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

  // Delegate event listener for dynamic elements
  const pendingRequestsContainer = document.getElementById('pendingRequests');
  pendingRequestsContainer.addEventListener('click', function(event) {
    const requestId = event.target.getAttribute('data-request-id');
    if (event.target.classList.contains('accept-request')) {
      updateFriendRequest(requestId, 'accept');
    } else if (event.target.classList.contains('decline-request')) {
      updateFriendRequest(requestId, 'decline');
    }
  });

  let socket = io(
    window.location.protocol +
    '//'
    + window.location.hostname
    + (window.location.port ? ':'
      + window.location.port : '')
    + '/chat', {
    transports: ['polling']
  });

  socket.on('connect', function() {
    console.log('Connected to friend requests namespace.');
  });

  socket.on('new_friend_request', function(data) {
    console.log("New friend request received");
    displayNewRequest(data);
  });
});

function displayNewRequest(data) {
  const pendingRequestsContainer = document.getElementById('pendingRequests');
  const newRequestHTML = `
    <div class="friend-request">
        <span>${data.requester_username}</span>
        <button class="accept-request" data-request-id="${data.friend_request_id}">Accept</button>
        <button class="decline-request" data-request-id="${data.friend_request_id}">Decline</button>
    </div>`;
  pendingRequestsContainer.insertAdjacentHTML('beforeend', newRequestHTML);
}

function sendFriendRequestByUsernameOrEmail(identifier) {
  fetch('/send-friend-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ identifier: identifier }),
    credentials: 'same-origin'
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      displayFlashMessage(data.message, data.error);
    })
    .catch(error => {
      displayFlashMessage(error, true);
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
      displayFlashMessage(data.message, data.error);
      location.reload(); // Reload the page to update the UI
    }).catch(error => {
      console.error(`Error updating friend request:`, error);
      displayFlashMessage('An error occurred while accepting the friend request.', true);
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
      displayFlashMessage(data.message, data.error);
      location.reload(); // Reload the page to update the UI
    }).catch(error => {
      console.error('Error removing friend:', error);
      displayFlashMessage('An error occurred while removing a friend.', true);
    });
}

function displayFlashMessage(message, isError = false) {
  const messageClass = isError ? 'alert-danger' : 'alert-success';
  const flashContainer = document.getElementById('flash-messages');
  flashContainer.innerHTML += `<div class="alert ${messageClass}">${message}</div>`;
  setTimeout(() => {
    flashContainer.innerHTML = '';
  }, 5000);
}
