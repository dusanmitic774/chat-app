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
let loadingMessages = false;
let noMoreMessages = false;

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
    switchUser(parseInt(userId), username, profilePicture);
  }
});

function switchUser(recipientId, recipientUsername, profilePicture) {
  currentRecipientId = recipientId;
  noMoreMessages = false;
  loadingMessages = false;

  document.getElementById('chatUsername').textContent = recipientUsername;
  const profilePicElement = document.querySelector("#friendInfoContainer img");
  profilePicElement.src = profilePicture || '/static/uploads/default_profile_pic.png';

  if (!messageStore[recipientId]) {
    fetchInitialMessages(recipientId);
  } else {
    displayMessages(recipientId);
  }

  fetch(`/reset-unread/${recipientId}`).then(response => response.json()).then(data => {
    if (data.success) {
      updateUnreadCount(recipientId, 0);
    }
  });
}

function fetchInitialMessages(recipientId, limit = 20) {
  fetch(`/get-messages?recipient_id=${recipientId}&offset=0&limit=${limit}`)
    .then(response => response.json())
    .then(data => {
      let formattedMessages = [];
      if (data.messages.length > 0) {
        formattedMessages = data.messages.map(msg => ({
          userId: msg.sender_id.toString(),
          username: msg.sender_username,
          message: msg.content,
          isSender: msg.sender_id.toString() === currentUserId.toString(),
          timestamp: msg.timestamp,
          profilePicture: msg.sender_profile_picture
        }));
      }

      messageStore[recipientId] = formattedMessages;
      displayMessages(recipientId);
    });
}

function updateUnreadCount(userId, count) {
  const friendElement = document.querySelector(`[data-user-id="${userId}"]`);
  if (friendElement) {
    let unreadIndicator = friendElement.querySelector('.unread-count');
    if (!unreadIndicator && count > 0) {
      unreadIndicator = document.createElement('span');
      unreadIndicator.className = 'unread-count';
      friendElement.appendChild(unreadIndicator);
    }
    if (unreadIndicator) {
      unreadIndicator.textContent = count;
      unreadIndicator.style.display = count > 0 ? '' : 'none';
    }
  }
}

function displayLoadingIndicator(show) {
  const loadingText = document.getElementById('loadingText');
  if (show) {
    loadingText.style.display = 'block';
  } else {
    loadingText.style.display = 'none';
  }
}

document.querySelector('.chat-messages').addEventListener('scroll', function() {
  if (this.scrollTop === 0 && !loadingMessages && !noMoreMessages) {
    loadingMessages = true;
    displayLoadingIndicator(true);
    const offset = messageStore[currentRecipientId] ? messageStore[currentRecipientId].length : 0;
    fetchAndDisplayHistory(currentRecipientId, offset);
  }
});

function fetchAndDisplayHistory(recipientId, offset = 0, limit = 20) {
  fetch(`/get-messages?recipient_id=${recipientId}&offset=${offset}&limit=${limit}`)
    .then(response => response.json())
    .then(data => {
      if (data.messages.length === 0) {
        noMoreMessages = true;
        displayLoadingIndicator(false);
        loadingMessages = false;
        return;
      }

      const formattedMessages = data.messages.map(msg => ({
        userId: msg.sender_id.toString(),
        username: msg.sender_username,
        message: msg.content,
        isSender: msg.sender_id.toString() === currentUserId.toString(),
        timestamp: msg.timestamp,
        profilePicture: msg.sender_profile_picture
      }));

      messageStore[recipientId] = [...(messageStore[recipientId] || []), ...formattedMessages];
      prependMessages(formattedMessages);
      loadingMessages = false;
      displayLoadingIndicator(false);
    });
}

function prependMessages(messages) {
  const chatMessages = document.querySelector(".chat-messages");
  const oldScrollHeight = chatMessages.scrollHeight;

  messages.reverse().forEach(msg => {
    const messageElement = createMessageElement(msg);
    chatMessages.insertBefore(messageElement, chatMessages.firstChild);
  });

  const newScrollHeight = chatMessages.scrollHeight;
  chatMessages.scrollTop = newScrollHeight - oldScrollHeight;
}

function createMessageElement(msg) {
  let messageElement = document.createElement('div');
  messageElement.className = msg.isSender ? 'chat-message-right pb-4' : 'chat-message-left pb-4';

  let formattedTimestamp = formatTimestamp(msg.timestamp);
  let imageSrc = `/static/uploads/${msg.profilePicture}`;

  let messageContent = `
    <div class="${msg.isSender ? 'sent-message' : ''}">
      <img src="${imageSrc}" class="rounded-circle mr-1" alt="${msg.username}" width="40" height="40">
      <div class="text-muted small text-nowrap mt-2">${formattedTimestamp}</div>
    </div>
    <div class="flex-shrink-1 bg-light rounded py-2 px-3 ${msg.isSender ? 'mr-3 sent-message-container' : 'ml-3'}">
      <div class="font-weight-bold mb-1">${msg.isSender ? 'You' : msg.username}</div>
      ${escapeHTML(msg.message)}
    </div>
  `;

  messageElement.innerHTML = messageContent;
  return messageElement;
}

function escapeHTML(html) {
  var text = document.createTextNode(html);
  var p = document.createElement('p');
  p.appendChild(text);
  return p.innerHTML;
}

function displayMessages(recipientId) {
  const chatMessages = document.querySelector(".chat-messages");
  chatMessages.innerHTML = '';

  const messages = messageStore[recipientId] || [];
  messages.forEach(msg => {
    const messageElement = createMessageElement(msg);
    chatMessages.appendChild(messageElement);
  });

  scrollToBottom();
}

document.addEventListener('DOMContentLoaded', function() {
  // Fetch friend statuses on page load
  fetch('/get-friend-statuses').then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Could not fetch friend statuses');
    }
  }).then(data => {
    Object.entries(data.friends_status).forEach(([friendId, isOnline]) => {
      updateFriendStatus(friendId, isOnline);
    });
  }).catch(error => console.error(error));

  // Update current user's online status on page load
  fetch('/update-online-status')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log('Online status updated successfully.');
      }
    })
    .catch(error => console.error('Error updating online status:', error));
});

socket.on('friend_online_status', function(data) {
  updateFriendStatus(data.friend_id, data.is_online);
});

function updateFriendStatus(friendId, isOnline) {
  const friendElement = document.querySelector(`[data-user-id="${friendId}"]`);
  if (friendElement) {
    let statusText = friendElement.querySelector('.small');
    if (isOnline) {
      statusText.innerHTML = '<span class="fas fa-circle text-info"></span> Online';
    } else {
      statusText.innerHTML = '<span class="fas fa-circle chat-offline"></span> Offline';
    }
  }
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
    console.log(data)
  }).catch(error => console.error(error));
});

document.getElementById('sendButton').addEventListener('click', function() {
  var message = document.getElementById('messageInput').value;
  sendMessage(message);
  document.getElementById('messageInput').value = '';
});

const messageInput = document.getElementById('messageInput');
let typingTimer;
const typingInterval = 500;

messageInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage(this.value);
    this.value = '';
  }
});

messageInput.addEventListener('input', () => {
  clearTimeout(typingTimer);
  if (messageInput.value.trim()) {
    typingTimer = setTimeout(() => {
      if (currentRecipientId) {
        socket.emit('typing', { sender_id: currentUserId, recipient_id: currentRecipientId });
      }
    }, typingInterval);
  }
});

socket.on('user_typing', (data) => {
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

socket.on('receive_message', data => {
  const messageRecipientId = data.sender_id === currentUserId ? data.recipient_id : data.sender_id;

  storeAndAppendMessage(
    data.sender_id,
    messageRecipientId,
    data.message,
    data.sender_id === currentUserId,
    data.timestamp,
    data.sender_username,
    data.sender_profile_picture
  );

  if (data.sender_id !== currentUserId) {
    updateUnreadCount(data.sender_id, data.unread_count);

    if (data.sender_id !== currentRecipientId) {
      console.log("Move to the top")
      moveFriendToTop(data.sender_id);
    }
  }
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
    <div class="${isSender ? 'sent-message' : ''}">
      <img src="${imageSrc}"
           class="rounded-circle mr-1"
           alt="{{ friend.username }}"
           width="40"
           height="40">
      <div class="text-muted small text-nowrap mt-2">${formattedTimestamp}</div>
    </div>
    <div class="flex-shrink-1 bg-light rounded py-2 px-3 ${isSender ? 'mr-3 sent-message-container' : 'ml-3'}">
      <div class="font-weight-bold mb-1">${isSender ? 'You' : username}</div>
      ${escapeHTML(message)}
    </div>
  `;

  messageElement.innerHTML = messageContent;
  document.querySelector('.chat-messages').appendChild(messageElement);

  scrollToBottom()
}

document.getElementById('messageInput').addEventListener('focus', function() {
  if (currentRecipientId) {
    fetch(`/reset-unread/${currentRecipientId}`).then(response => response.json()).then(data => {
      if (data.success) {
        updateUnreadCount(currentRecipientId, 0);
      }
    });
  }
});

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
