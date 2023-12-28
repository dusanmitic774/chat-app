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
    switchUser(userId, username);
  }
});

function switchUser(recipientId, recipientUsername) {
  currentRecipientId = recipientId;
  document.getElementById('chatUsername').textContent = recipientUsername;

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
        timestamp: msg.timestamp
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
    appendMessage(msg.userId, msg.username, msg.message, msg.isSender, msg.timestamp);
  });

  scrollToBottom();
}

socket.on('connect', function() {
  console.log('Connected to Socket.IO server.');
});

document.getElementById('sendButton').addEventListener('click', function() {
  var message = document.getElementById('messageInput').value;
  sendMessage(message);
  document.getElementById('messageInput').value = '';
});

document.getElementById('messageInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage(this.value);
    this.value = '';
  }
});

function sendMessage(message) {
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
    currentUsername
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
  });

  scrollToBottom()
}

function storeAndAppendMessage(
  senderId,
  recipientId,
  message,
  isSender,
  timestamp,
  username
) {
  if (!messageStore[recipientId]) {
    messageStore[recipientId] = [];
  }

  messageStore[recipientId].push({
    userId: senderId,
    username: username,
    message: message,
    isSender: isSender,
    timestamp: timestamp
  });

  if (currentRecipientId && (senderId == currentRecipientId || recipientId == currentRecipientId)) {
    appendMessage(
      senderId,
      username,
      message,
      isSender,
      timestamp
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
    data.sender_username
  );
});

function appendMessage(
  userId,
  username,
  message,
  isSender,
  timestamp
) {
  let messageElement = document.createElement('div');
  messageElement.className = isSender ? 'chat-message-right pb-4' : 'chat-message-left pb-4';

  let formattedTimestamp = timestamp ? formatTimestamp(timestamp) : '';
  let messageContent = `
    <div>
      <!-- Placeholder for user image -->
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
