let socket = io.connect(
  window.location.protocol +
  '//'
  + window.location.hostname
  + (window.location.port ? ':'
    + window.location.port : '')
  + '/chat', {
  transports: ['polling']
});

let currentRecipientId = null;
const messageStore = {};

document.getElementById('friendsList').addEventListener('click', function(event) {
  let targetElement = event.target;

  // Find the parent .user element
  while (targetElement && !targetElement.hasAttribute('data-user-id')) {
    targetElement = targetElement.parentElement;
  }

  if (targetElement && targetElement.hasAttribute('data-user-id')) {
    const userId = targetElement.getAttribute('data-user-id');
    const username = targetElement.getAttribute('data-username');
    const profilePicture = targetElement.getAttribute('data-profile-picture');
    switchUser(userId, username, profilePicture);
  }
});

function switchUser(recipientId, recipientUsername, profilePicture) {
  currentRecipientId = recipientId;
  document.getElementById('chatUsername').textContent = recipientUsername;

  const profilePicElement = document.querySelector("#friendInfoContainer img");
  profilePicElement.src = profilePicture || '/static/uploads/default_profile_pic.png';

  if (!messageStore[recipientId]) {
    fetchAndDisplayHistory(recipientId);
  } else {
    displayMessages(recipientId);
  }
}

function fetchAndDisplayHistory(recipientId) {
  fetch(`/get-messages?recipient_id=${recipientId}`)
    .then(response => response.json())
    .then(data => {
      messageStore[recipientId] = data.messages.map(msg => ({
        userId: msg.sender_id.toString(),
        username: msg.sender_username,
        message: msg.content,
        isSender: msg.sender_id.toString() === currentUserId.toString(),
        timestamp: msg.timestamp,
        profilePicture: msg.sender_profile_picture
      }));
      displayMessages(recipientId);
    });
}

function escapeHTML(html) {
  var text = document.createTextNode(html);
  var p = document.createElement('p');
  p.appendChild(text);
  return p.innerHTML;
}


function displayMessages(recipientId) {
  var chatMessages = document.querySelector(".chat-messages");
  chatMessages.textContent = "";

  let messages = messageStore[recipientId] || [];
  messages.forEach(function(msg) {
    appendMessage(
      msg.userId,
      msg.username,
      msg.message,
      msg.isSender,
      msg.timestamp,
      msg.profilePicture
    );
  });

  scrollToBottom();
}

socket.on('connect', function() {
  console.log('Connected to Socket.IO server.');

  fetch('/get-friend-statuses').then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Could not fetch friend statuses');
    }
  }).then(data => {
    for (const [friendId, isOnline] of Object.entries(data.friends_status)) {
      updateFriendStatus(friendId, isOnline);
    }
  }).catch(error => console.error(error));
});

// Emit online status periodically
setInterval(() => {
  socket.emit('update_status', { userId: currentUserId });
}, 5000);  // Every 5 seconds, for example

// Update friend status upon receiving a broadcast
socket.on('friend_status_update', function(data) {
  updateFriendStatus(data.friend_id, data.is_online);
});

function updateFriendStatus(friendId, isOnline) {
  const friendElement = document.querySelector(`[data-user-id="${friendId}"]`);
  if (friendElement) {
    // Update the friend's status indicator
  }
}

socket.on('friend_online_status', function(data) {
  const friendElement = document.querySelector(`[data-user-id="${data.friend_id}"]`);
  if (friendElement) {
    let statusContainer = friendElement.querySelector('.small');

    // If the statusContainer does not exist, create it
    if (!statusContainer) {
      statusContainer = document.createElement('div');
      statusContainer.className = 'small';
      friendElement.appendChild(statusContainer);
    }

    // Clear the existing content
    statusContainer.innerHTML = '';

    // Create and add the circle span element
    const statusCircle = document.createElement('span');
    statusCircle.className = 'fas fa-circle';
    statusCircle.classList.add(data.is_online ? 'chat-online' : 'chat-offline');
    statusContainer.appendChild(statusCircle);

    // Create and add the text node
    const statusText = document.createTextNode(` ${data.is_online ? 'Online' : 'Offline'}`);
    statusContainer.appendChild(statusText);
  }
});

document.getElementById('sendButton').addEventListener('click', function() {
  var message = document.getElementById('messageInput').value;
  sendMessage(message);
  document.getElementById('messageInput').value = '';
});

const messageInput = document.getElementById('messageInput');

messageInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage(this.value);
    this.value = '';
  }
});

messageInput.addEventListener('input', () => {
  if (currentRecipientId) {
    console.log(`currentUserId: ${currentUserId}`)
    console.log(`currentRecipientId: ${currentRecipientId}`)
    socket.emit('typing', { sender_id: currentUserId, recipient_id: currentRecipientId });
  }
});

socket.on('user_typing', (data) => {
  console.log(`data: ${data}`)
  if (data.sender_id !== currentUserId) {
    showTypingIndicator(data.sender_id);
  }
});

let typingTimeout;
function showTypingIndicator(senderId) {
  const typingIndicator = document.querySelector("#typingIndicator");
  if (typingIndicator) {
    typingIndicator.style.display = 'block';
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    hideTypingIndicator(senderId);
  }, 3000);
}

function hideTypingIndicator(senderId) {
  const typingIndicator = document.querySelector("#typingIndicator");
  if (typingIndicator) {
    typingIndicator.style.display = 'none';
  }
}

function sendMessage(message) {
  if (!message.trim()) {
    return;
  }

  if (!currentRecipientId) {
    alert("Please select a recipient.");
    return;
  }

  // Optimistically display the message
  const timestamp = new Date().toISOString();
  storeAndAppendMessage(
    currentUserId,
    currentRecipientId,
    message,
    true,
    timestamp,
    currentUsername,
    currentUserProfilePicture
  );

  socket.emit('send_message', {
    sender_id: currentUserId,
    recipient_id: currentRecipientId,
    message: message
  }, function(success) {
    if (!success) {
      // Remove the optimistic message and show error
      // removeMessage(messageId);
      appendErrorMessage("Failed to send");
    }

    if (success) {
      moveFriendToTop(currentRecipientId)
    }
  });

  scrollToBottom()
}

function moveFriendToTop(friendId) {
  const friendsListContainer = document.getElementById('friendsList');
  const friendElement = friendsListContainer.querySelector(`[data-user-id="${friendId}"]`);

  if (friendElement) {
    friendsListContainer.removeChild(friendElement);
    friendsListContainer.insertAdjacentElement('afterbegin', friendElement);
  }
}

function storeAndAppendMessage(
  senderId,
  recipientId,
  message,
  isSender,
  timestamp,
  username,
  profilePicture
) {
  if (!messageStore[recipientId]) {
    messageStore[recipientId] = [];
  }

  messageStore[recipientId].push({
    userId: senderId,
    username: username,
    message: message,
    isSender: isSender,
    timestamp: timestamp,
    profilePicture: profilePicture
  });

  if (currentRecipientId && (senderId == currentRecipientId || recipientId == currentRecipientId)) {
    appendMessage(
      senderId,
      username,
      message,
      isSender,
      timestamp,
      profilePicture
    );
  }
}

function appendErrorMessage(errorMessage) {
  let errorElement = document.createElement('div');
  errorElement.className = 'message error-message';
  errorElement.innerHTML = errorMessage;
  document.getElementById('chatWindow').appendChild(errorElement);
}

// function removeMessage(messageId) {
//   let messageElement = document.getElementById(messageId);
//   if (messageElement) {
//     messageElement.remove();
//   }
// }

socket.on('receive_message', data => {
  storeAndAppendMessage(
    data.sender_id,
    data.recipient_id,
    data.message,
    data.sender_id === currentUserId,
    data.timestamp,
    data.sender_username,
    data.sender_profile_picture
  );
});

function appendMessage(
  userId,
  username,
  message,
  isSender,
  timestamp,
  profilePicture
) {
  let messageElement = document.createElement('div');
  messageElement.className = isSender ? 'chat-message-right pb-4' : 'chat-message-left pb-4';

  let formattedTimestamp = timestamp ? formatTimestamp(timestamp) : '';
  let imageSrc = `/static/uploads/${profilePicture}`;

  let messageContent = `
    <div>
      <img src="${imageSrc}"
           class="rounded-circle mr-1"
           alt="{{ friend.username }}"
           width="40"
           height="40">
      <div class="text-muted small text-nowrap mt-2">${formattedTimestamp}</div>
    </div>
    <div class="flex-shrink-1 bg-light rounded py-2 px-3 ${isSender ? 'mr-3' : 'ml-3'}">
      <div class="font-weight-bold mb-1">${isSender ? 'You' : username}</div>
      ${escapeHTML(message)}
    </div>
  `;

  messageElement.innerHTML = messageContent;
  document.querySelector('.chat-messages').appendChild(messageElement);

  scrollToBottom()
}


function formatTimestamp(isoString) {
  if (!isoString) return '';

  let parts = isoString.split('.');
  let dateTimeWithoutMicroseconds = parts[0];

  // Ensure the timestamp is interpreted as UTC
  dateTimeWithoutMicroseconds += dateTimeWithoutMicroseconds.endsWith('Z') ? '' : 'Z';

  const date = new Date(dateTimeWithoutMicroseconds);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function scrollToBottom() {
  const chatMessages = document.querySelector(".chat-messages");
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
