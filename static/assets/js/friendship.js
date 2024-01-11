let pendingFriendRequests = [];

document.addEventListener('DOMContentLoaded', function() {
  fetchPendingFriendRequests();

  // Attach event listener to the pendingRequestsList for delegation
  const pendingRequestsList = document.getElementById('pendingRequestsList');

  pendingRequestsList.addEventListener('click', function(event) {
    let targetButton = event.target.closest('.accept-request, .decline-request');
    if (targetButton) {
      const requestId = targetButton.getAttribute('data-request-id');
      if (targetButton.classList.contains('accept-request')) {
        updateFriendRequest(requestId, 'accept');
      } else if (targetButton.classList.contains('decline-request')) {
        updateFriendRequest(requestId, 'decline');
      }
    }
  });

  const removeFriendButton = document.getElementById('removeFriendButton');
  removeFriendButton.addEventListener('click', function() {
    if (currentActiveFriendId) {
      removeFriend(currentActiveFriendId);
    }
  });

  // Modal
  const addFriendButton = document.getElementById('addFriendButton');
  const modalElement = document.getElementById('addFriendModal');
  const modal = new bootstrap.Modal(modalElement);

  addFriendButton.addEventListener('click', function() {
    const identifier = document.getElementById('friendIdentifier').value;
    sendFriendRequestByUsernameOrEmail(identifier, modal);
  });
  // End Modal

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
    pendingFriendRequests.push(data);
    displayNewRequest(data);
  });

  socket.on('friend_request_accepted', function(data) {
    console.log("Friend request accepted by", data.receiver_username);
    updateFriendsList()
  });

  socket.on('friend_removed', function(data) {
    // clearChatWindow();
    console.log("You have been removed as a friend")
    removeFriendFromList(data.removed_by_id);
  });

  let toggleRequests = document.getElementById('toggleRequests')
  const toggleChat = document.getElementById('toggleChat');

  toggleRequests.addEventListener('click', function() {
    // Show pending requests and hide chat icon
    document.getElementById('pendingRequestsList').style.display = 'block';
    document.getElementById('friendsList').style.display = 'none';
    toggleChat.style.display = 'inline';
    toggleRequests.style.display = 'none';
    displayAllPendingRequests();
  });

  toggleChat.addEventListener('click', function() {
    // Show friends list and hide requests icon
    document.getElementById('pendingRequestsList').style.display = 'none';
    document.getElementById('friendsList').style.display = 'block';
    toggleChat.style.display = 'none';
    toggleRequests.style.display = 'inline';
  });
});

function displayAllPendingRequests() {
  const container = document.getElementById('pendingRequestsList');
  container.innerHTML = '';
  pendingFriendRequests.forEach(request => {
    displayNewRequest(request);
  });
}

function fetchPendingFriendRequests() {
  fetch('/get-pending-requests', {
    method: 'GET',
    credentials: 'same-origin'
  }).then(response => response.json())
    .then(data => {
      pendingFriendRequests = data;
      displayAllPendingRequests();
    }).catch(error => {
      console.error('Error fetching pending friend requests:', error);
      // Optionally handle error on UI
    });
}

function removeFriendFromList(friendId) {
  const friendElement = document.querySelector(`[data-user-id="${friendId}"]`);
  if (friendElement) {
    friendElement.remove();
  }
}

function displayNewRequest(data) {
  const pendingRequestsContainer = document.getElementById('pendingRequestsList');
  const newRequestHTML = `
    <a href="#" class="list-group-item list-group-item-action border-0 user">
      <div class="d-flex align-items-start justify-content-between">
        <div class="flex-grow-1 ml-3">
          ${data.requester_username}
        </div>
        <div>
          <button class="btn btn-success accept-request" data-request-id="${data.friend_request_id}">
            <i class="fa-regular fa-circle-check"></i>
          </button>
          <button class="btn btn-danger decline-request" data-request-id="${data.friend_request_id}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </a>`;
  pendingRequestsContainer.insertAdjacentHTML('beforeend', newRequestHTML);
}

function updateFriendsList() {
  fetch('/get-latest-friends')
    .then(response => response.json())
    .then(data => {
      const friendsListContainer = document.getElementById('friendsList');
      friendsListContainer.innerHTML = '';

      data.friends.forEach(friend => {
        const friendHTML = createFriendListItem(friend);
        friendsListContainer.insertAdjacentHTML('afterbegin', friendHTML);
      });
    }).catch(error => {
      console.error('Error updating friends list:', error);
    });
}

function createFriendListItem(friend) {
  const profileImageSrc = friend.profile_picture ? `/static/uploads/${friend.profile_picture}` : '/default_profile_pic.png';

  return `
    <a href="#" class="list-group-item list-group-item-action border-0 user" 
       data-user-id="${friend.id}" 
       data-username="${friend.username}" 
       data-profile-picture="${profileImageSrc}" 
       onclick="setActiveFriend('${friend.id}', '${friend.username}')">
        <div class="d-flex align-items-start">
            <img src="${profileImageSrc}" class="rounded-circle mr-1" alt="${friend.username}" width="40" height="40">
            <div class="flex-grow-1 ml-3">
                ${friend.username}
                <div class="small"><span class="fas fa-circle chat-offline"></span> Offline</div>
            </div>
        </div>
    </a>`;
}

function sendFriendRequestByUsernameOrEmail(identifier, modal) {
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
      if (data.error) {
        alert(data.message);
      } else {
        alert("Friend request sent successfully.");
        modal.hide();
      }
    })
    .catch(error => {
      console.error('Error sending friend request:', error);
    });
}

function updateFriendRequest(requestId, action) {
  const url = action === 'accept' ? `/accept-friend-request/${requestId}` : `/decline-friend-request/${requestId}`;
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin'
  }).then(response => response.json())
    .then(data => {
      location.reload();
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
      location.reload(); // Reload the page to update the UI
    }).catch(error => {
      console.error('Error removing friend:', error);
    });
}

function setActiveFriend(friendId, friendUsername) {
  currentActiveFriendId = friendId;

  document.getElementById('chatUsername').textContent = friendUsername;
  document.getElementById('friendInfoContainer').style.display = 'block';
}

function displayFlashMessage(message, isError = false) {
  const messageClass = isError ? 'alert-danger' : 'alert-success';
  const flashContainer = document.getElementById('flash-messages');
  flashContainer.innerHTML += `<div class="alert ${messageClass}">${message}</div>`;
  setTimeout(() => {
    flashContainer.innerHTML = '';
  }, 5000);
}
