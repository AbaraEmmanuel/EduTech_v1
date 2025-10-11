import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  limit,
  where,
  setDoc,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnzUWyfIDIlKtNsjlwHhA3JhR5LHhb9qU",
  authDomain: "edtech-tutors.firebaseapp.com",
  projectId: "edtech-tutors",
  storageBucket: "edtech-tutors.appspot.com",
  messagingSenderId: "87645108821",
  appId: "1:87645108821:web:ff6957f6cb738dc2bcf2dc",
  measurementId: "G-GTXDL1WX0L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Make these available globally
window.currentUser = {
  uid: "IPErXUGI30QnZoSDxhgvYo1g6kr2"
};
window.loadChats = loadChats;

function isRelevantChat(chatData, currentUser) {
  const receiver = chatData.receiver || chatData.reciever;
  return (
    chatData.sender === currentUser.uid ||
    receiver === currentUser.uid ||
    (Array.isArray(chatData.participants) && 
     chatData.participants.includes(currentUser.uid))
  );
}

async function loadChats() {
  try {
    console.log("[DEBUG] Loading chats with enhanced query");
    const chatList = document.getElementById("chat-list");
    chatList.innerHTML = "";

    // Query all chats where current user is a participant
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );
    
    const chatsSnapshot = await getDocs(chatsQuery);
    console.log("[DEBUG] Found", chatsSnapshot.size, "relevant chats");

    let chatCount = 0;

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      const chatData = chatDoc.data();
      console.log("[DEBUG] Processing chat:", chatId, chatData);

      if (!isRelevantChat(chatData, currentUser.uid)) {
        continue;
      }

      // Find the other participant
      const otherParticipants = (chatData.participants || [])
        .filter(uid => uid !== currentUser.uid);
      
      let otherUserId = otherParticipants.length > 0 ? otherParticipants[0] : 
                      (chatData.sender === currentUser.uid ? (chatData.receiver || chatData.reciever) : chatData.sender);

      // Get the last message
      let lastMessage = "No messages yet";
      let lastMessageTime = "";
      let unreadCount = 0;

      try {
        const messagesRef = collection(db, "chats", chatId, "messages");
        const lastMessageQuery = query(
          messagesRef,
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const lastMessageSnap = await getDocs(lastMessageQuery);
        
        if (!lastMessageSnap.empty) {
          const lastMsgData = lastMessageSnap.docs[0].data();
          lastMessage = lastMsgData.text || "Media message";
          
          if (lastMsgData.timestamp) {
            const timestamp = lastMsgData.timestamp.toDate();
            lastMessageTime = timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }

        // Get unread count
        if (chatData.unreadCounts && chatData.unreadCounts[currentUser.uid]) {
          unreadCount = chatData.unreadCounts[currentUser.uid];
        } else if (chatData.unreadCount) {
          unreadCount = chatData.unreadCount;
        }
      } catch (error) {
        console.error("Error fetching message details:", error);
      }

      // Create chat item
      const chatItem = document.createElement("div");
      chatItem.className = "chat-item";
      chatItem.innerHTML = `
        <div class="chat-info">
          <p><strong>Student ID:</strong> ${otherUserId}</p>
          <p><strong>Last Message:</strong> ${lastMessage}</p>
          ${lastMessageTime ? `<p><small>${lastMessageTime}</small></p>` : ''}
          <p><strong>Unread:</strong> ${unreadCount}</p>
        </div>
        <a href="/tutor_chat.html?userId=${otherUserId}&chatId=${chatId}" 
           class="open-chat-btn" target="_blank">
          Open Chat
        </a>
      `;
      chatList.appendChild(chatItem);
      chatCount++;
    }

    if (chatCount === 0) {
      showNoChatsUI();
    }
  } catch (error) {
    console.error("Error loading chats:", error);
    showNoChatsUI();
  }
}

function showNoChatsUI() {
  const chatList = document.getElementById("chat-list");
  chatList.innerHTML = `
    <div class="empty-state">
      <p>No chats yet.</p>
      <p>Students will appear here when they message you.</p>
      <a href="/chat.html?tutorId=${currentUser.uid}&tutorName=Tutor" 
         class="test-chat-link" target="_blank">
        Start a test chat
      </a>
      <button onclick="loadChats()" class="debug-btn">Debug Firestore</button>
    </div>
  `;
}

// Initialize on load
document.addEventListener("DOMContentLoaded", loadChats);