# 💬 Chat System API Documentation

**Version:** 1.0  
**Last Updated:** October 24, 2025  
**Base URL:** `http://localhost:5000/api/v1` (Development)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [REST API Endpoints](#rest-api-endpoints)
4. [Socket.IO Real-Time Events](#socketio-real-time-events)
5. [Implementation Examples](#implementation-examples)
6. [Error Handling](#error-handling)
7. [Message Flow Diagrams](#message-flow-diagrams)

---

## 🔍 Overview

The chat system provides real-time communication between Users (farmers) and Support/Admin staff.

### Architecture

- **Primary Method:** Socket.IO for real-time messaging
- **Fallback Method:** REST API for message history and offline support
- **Media Upload:** Separate endpoint before sending media messages

### User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **User** | Farmers using mobile app | Create conversations, send messages, view their chats |
| **Support** | Support agents | Respond to assigned conversations, view assigned chats |
| **Admin** | Administrators | Access all conversations, reassign chats, view statistics |

---

## 🔐 Authentication

All API endpoints and Socket.IO connections require JWT authentication.

### HTTP Requests

Include token in Authorization header:

Authorization: Bearer YOUR_JWT_TOKEN

text

### Socket.IO Connection

Send token during connection:

**Flutter (socket_io_client):**
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io('http://localhost:5000', <String, dynamic>{
'transports': ['websocket'],
'auth': {
'token': 'YOUR_JWT_TOKEN'
}
});
socket.connect();

text

**Next.js (socket.io-client):**
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
auth: {
token: 'YOUR_JWT_TOKEN'
}
});

text

---

## 🌐 REST API Endpoints

### Base Information

- **Base URL:** `/api/v1/chat`
- **Content-Type:** `application/json`
- **Authentication:** Required for all endpoints

---

### 1. Create/Get Conversation

Creates new conversation or returns existing one between user and support.

**Endpoint:** `POST /conversations`

**Who calls:** User (farmers)

**When to call:** When user clicks "Contact Support" button

**Headers:**
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

text

**Request Body:** None (user ID comes from token)

**Success Response (200):**
{
"message": "Conversation retrieved successfully",
"data": {
"_id": "671234567890abcdef123456",
"userId": {
"_id": "user123",
"first_name": "Rajesh",
"last_name": "Kumar",
"phone": "+919876543210",
"email": "rajesh@example.com",
"image": "http://localhost:5000/uploads/users/profile.jpg",
"isOnline": true,
"lastSeen": "2025-10-24T10:30:00.000Z"
},
"assignedSupportId": {
"_id": "support123",
"first_name": "Support",
"last_name": "Agent",
"phone": "+919123456789",
"email": "support@example.com",
"image": null,
"role": "Support",
"isOnline": false,
"lastSeen": "2025-10-24T09:15:00.000Z"
},
"status": "open",
"lastMessage": null,
"unreadCount": {
"user123": 0,
"support123": 0
},
"isActive": true,
"createdAt": "2025-10-24T10:00:00.000Z",
"updatedAt": "2025-10-24T10:00:00.000Z"
}
}

text

**Error Response (401):**
{
"success": false,
"message": "No token provided"
}

text

**Flutter Example:**
Future<Map<String, dynamic>> createOrGetConversation(String token) async {
final response = await http.post(
Uri.parse('http://localhost:5000/api/v1/chat/conversations'),
headers: {
'Authorization': 'Bearer $token',
'Content-Type': 'application/json',
},
);

if (response.statusCode == 200) {
return jsonDecode(response.body);
} else {
throw Exception('Failed to create conversation');
}
}

text

**Next.js Example:**
async function createOrGetConversation(token) {
const response = await fetch('/api/v1/chat/conversations', {
method: 'POST',
headers: {
'Authorization': Bearer ${token},
'Content-Type': 'application/json',
},
});

if (!response.ok) throw new Error('Failed to create conversation');
return await response.json();
}

text

---

### 2. Get My Conversations

Fetches list of conversations for logged-in user.

**Endpoint:** `GET /conversations`

**Who calls:** User, Support, Admin

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number |
| `limit` | Number | No | 20 | Items per page |
| `status` | String | No | - | Filter by status: "open", "waiting", "resolved", "closed" |

**Success Response (200):**
{
"message": "Conversations fetched successfully",
"data": [
{
"_id": "conv123",
"userId": { /* user object / },
"assignedSupportId": { / support object */ },
"status": "waiting",
"lastMessage": {
"_id": "msg123",
"messageType": "text",
"content": "Hello, I need help",
"createdAt": "2025-10-24T10:30:00.000Z"
},
"unreadCount": {
"support123": 1
},
"createdAt": "2025-10-24T10:00:00.000Z",
"updatedAt": "2025-10-24T10:30:00.000Z"
}
],
"pagination": {
"currentPage": 1,
"totalPages": 3,
"totalItems": 45,
"itemsPerPage": 20,
"hasNextPage": true,
"hasPrevPage": false
}
}

text

**Flutter Example:**
Future<Map<String, dynamic>> getConversations({
required String token,
int page = 1,
int limit = 20,
String? status,
}) async {
String url = 'http://localhost:5000/api/v1/chat/conversations?page=$page&limit=$limit';
if (status != null) url += '&status=$status';

final response = await http.get(
Uri.parse(url),
headers: {'Authorization': 'Bearer $token'},
);

return jsonDecode(response.body);
}

text

---

### 3. Get Conversation by ID

Fetches single conversation with full details.

**Endpoint:** `GET /conversations/:id`

**URL Parameters:**
- `id` - Conversation ID

**Success Response (200):**
{
"message": "Conversation fetched successfully",
"data": {
/* Full conversation object with populated fields */
}
}

text

**Error Response (404):**
{
"success": false,
"message": "Conversation not found"
}

text

---

### 4. Send Message (HTTP Fallback)

Sends a message via HTTP (use Socket.IO for real-time).

**Endpoint:** `POST /messages`

**Request Body:**
{
"conversationId": "conv123",
"messageType": "text",
"content": "Hello, I need help with my crops"
}

text

**For Media Messages:**
{
"conversationId": "conv123",
"messageType": "image",
"mediaId": "media123"
}

text

**Message Types:**
- `text` - Plain text (requires `content` field)
- `image` - Image attachment (requires `mediaId`)
- `audio` - Audio message (requires `mediaId`)
- `video` - Video attachment (requires `mediaId`)

**Success Response (201):**
{
"message": "Message sent successfully",
"data": {
"_id": "msg123",
"conversationId": "conv123",
"senderId": {
"_id": "user123",
"first_name": "Rajesh",
"last_name": "Kumar",
"role": "User"
},
"messageType": "text",
"content": "Hello, I need help with my crops",
"isRead": false,
"deliveredAt": "2025-10-24T10:35:00.000Z",
"createdAt": "2025-10-24T10:35:00.000Z"
}
}

text

---

### 5. Get Messages

Fetches message history for a conversation.

**Endpoint:** `GET /messages/:conversationId`

**URL Parameters:**
- `conversationId` - Conversation ID

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number |
| `limit` | Number | No | 50 | Messages per page |

**Success Response (200):**
{
"message": "Messages fetched successfully",
"data": [
{
"_id": "msg1",
"senderId": { /* sender details / },
"messageType": "text",
"content": "Hello",
"isRead": true,
"readAt": "2025-10-24T10:36:00.000Z",
"deliveredAt": "2025-10-24T10:35:00.000Z",
"createdAt": "2025-10-24T10:35:00.000Z"
},
{
"_id": "msg2",
"senderId": { / sender details */ },
"messageType": "image",
"mediaId": {
"_id": "media123",
"name": "crop_issue.jpg",
"type": "image",
"url": "http://localhost:5000/uploads/chat/crop_issue.jpg",
"format": "image/jpeg",
"size": 245678
},
"isRead": false,
"deliveredAt": "2025-10-24T10:37:00.000Z",
"createdAt": "2025-10-24T10:37:00.000Z"
}
],
"pagination": {
"currentPage": 1,
"totalPages": 2,
"totalItems": 87,
"itemsPerPage": 50,
"hasNextPage": true,
"hasPrevPage": false
}
}

text

**Flutter Example:**
Future<Map<String, dynamic>> getMessages({
required String token,
required String conversationId,
int page = 1,
int limit = 50,
}) async {
final url = 'http://localhost:5000/api/v1/chat/messages/$conversationId?page=$page&limit=$limit';

final response = await http.get(
Uri.parse(url),
headers: {'Authorization': 'Bearer $token'},
);

return jsonDecode(response.body);
}

text

---

### 6. Upload Chat Media

Uploads media files before sending media messages.

**Endpoint:** `POST /media`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `media` - File(s) to upload (max 5 files, max 10MB each)
- `type` - Media type: "image", "audio", or "video"

**Allowed File Types:**
- **Images:** PNG, JPEG, JPG, WEBP
- **Videos:** MP4, MPEG, MOV
- **Audio:** MP3, WAV, OGG

**Success Response (201):**
{
"message": "Media uploaded successfully",
"data": [
{
"_id": "media123",
"name": "crop_disease.jpg",
"type": "image",
"url": "http://localhost:5000/uploads/chat/crop_disease.jpg",
"format": "image/jpeg",
"size": 345678,
"createdAt": "2025-10-24T10:40:00.000Z"
}
]
}

text

**Flutter Example:**
import 'package:http/http.dart' as http;
import 'dart:io';

Future<String> uploadChatMedia({
required String token,
required File file,
required String type, // "image", "audio", or "video"
}) async {
var request = http.MultipartRequest(
'POST',
Uri.parse('http://localhost:5000/api/v1/chat/media'),
);

request.headers['Authorization'] = 'Bearer $token';
request.fields['type'] = type;
request.files.add(await http.MultipartFile.fromPath('media', file.path));

var response = await request.send();
var responseData = await response.stream.bytesToString();
var jsonData = jsonDecode(responseData);

// Return media ID for use in message
return jsonData['data']['_id'];
}

text

**Next.js Example:**
async function uploadChatMedia(token, file, type) {
const formData = new FormData();
formData.append('media', file);
formData.append('type', type);

const response = await fetch('/api/v1/chat/media', {
method: 'POST',
headers: {
'Authorization': Bearer ${token},
},
body: formData,
});

const data = await response.json();
return data.data._id; // Return media ID
}

text

---

### 7. Mark Conversation as Read

Marks all messages in conversation as read.

**Endpoint:** `PATCH /conversations/:conversationId/read`

**Success Response (200):**
{
"message": "All messages marked as read"
}

text

---

### 8. Update Conversation Status (Support/Admin)

Changes conversation status.

**Endpoint:** `PATCH /conversations/:id/status`

**Request Body:**
{
"status": "resolved"
}

text

**Valid Status Values:**
- `open` - Active conversation
- `waiting` - User waiting for response
- `resolved` - Issue resolved
- `closed` - Conversation ended

---

### 9. Get All Conversations (Support/Admin)

Fetches all conversations in system.

**Endpoint:** `GET /support/conversations`

**Permissions:** Support, Admin only

**Query Parameters:** Same as "Get My Conversations" plus:
- `assignedTo` - Filter by support agent ID (Admin only)

---

### 10. Reassign Conversation (Admin)

Transfers conversation to another support agent.

**Endpoint:** `POST /support/reassign`

**Permissions:** Admin only

**Request Body:**
{
"conversationId": "conv123",
"newSupportId": "support456"
}

text

---

### 11. Get Statistics (Support/Admin)

Fetches dashboard statistics.

**Endpoint:** `GET /support/stats`

**Permissions:** Support, Admin

**Success Response (200):**
{
"message": "Statistics fetched successfully",
"data": {
"totalConversations": 127,
"activeConversations": 45,
"statusBreakdown": {
"open": 20,
"waiting": 25,
"resolved": 67,
"closed": 15
},
"perAgentStats": [
{
"agentId": "support123",
"agentName": "Support Agent",
"agentEmail": "support@example.com",
"totalConversations": 65,
"activeConversations": 22
}
],
"totalMessages": 3456,
"generatedAt": "2025-10-24T10:50:00.000Z"
}
}

text

---

## 🔌 Socket.IO Real-Time Events

### Connection Setup

**Connect to Socket.IO server:**

**Flutter:**
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatSocketService {
late IO.Socket socket;

void connect(String token) {
socket = IO.io('http://localhost:5000', <String, dynamic>{
'transports': ['websocket'],
'autoConnect': false,
'auth': {
'token': token
}
});

text
socket.connect();

socket.onConnect((_) {
  print('Connected to chat server');
});

socket.onDisconnect((_) {
  print('Disconnected from chat server');
});
}

void disconnect() {
socket.disconnect();
}
}

text

**Next.js:**
import io from 'socket.io-client';

let socket;

export function connectSocket(token) {
socket = io('http://localhost:5000', {
auth: {
token: token
}
});

socket.on('connect', () => {
console.log('Connected to chat server');
});

socket.on('disconnect', () => {
console.log('Disconnected from chat server');
});

return socket;
}

export function disconnectSocket() {
if (socket) socket.disconnect();
}

text

---

### Events Reference

#### CLIENT → SERVER (Emit)

Events that client sends to server.

---

##### 1. `conversation:join`

Join a conversation room to receive real-time messages.

**When to emit:** When user opens a conversation

**Data to send:**
{
"conversationId": "conv123"
}

text

**Flutter:**
void joinConversation(String conversationId) {
socket.emit('conversation:join', {
'conversationId': conversationId
});
}

text

**Next.js:**
function joinConversation(conversationId) {
socket.emit('conversation:join', {
conversationId: conversationId
});
}

text

**Server Response:** `conversation:joined` event

---

##### 2. `conversation:leave`

Leave a conversation room.

**When to emit:** When user closes conversation or navigates away

**Data to send:**
{
"conversationId": "conv123"
}

text

**Flutter:**
void leaveConversation(String conversationId) {
socket.emit('conversation:leave', {
'conversationId': conversationId
});
}

text

---

##### 3. `message:send`

Send a message in real-time.

**When to emit:** When user types message and clicks send

**Data to send (Text Message):**
{
"conversationId": "conv123",
"messageType": "text",
"content": "Hello, I need help"
}

text

**Data to send (Media Message):**
{
"conversationId": "conv123",
"messageType": "image",
"mediaId": "media123"
}

text

**Flutter Example (Text):**
void sendTextMessage(String conversationId, String content) {
socket.emit('message:send', {
'conversationId': conversationId,
'messageType': 'text',
'content': content,
});
}

text

**Flutter Example (Image):**
Future<void> sendImageMessage(String conversationId, File imageFile) async {
// Step 1: Upload image first
String mediaId = await uploadChatMedia(
token: userToken,
file: imageFile,
type: 'image',
);

// Step 2: Send message with media ID
socket.emit('message:send', {
'conversationId': conversationId,
'messageType': 'image',
'mediaId': mediaId,
});
}

text

**Next.js Example:**
function sendMessage(conversationId, type, content, mediaId = null) {
const data = {
conversationId: conversationId,
messageType: type,
};

if (type === 'text') {
data.content = content;
} else {
data.mediaId = mediaId;
}

socket.emit('message:send', data);
}

text

**Server Response:** `message:sent` (confirmation) and `message:new` (broadcasted to conversation)

---

##### 4. `typing:start`

Indicate user started typing.

**When to emit:** When user types in input field

**Data to send:**
{
"conversationId": "conv123"
}

text

**Flutter:**
// Call this when TextField changes
void onTypingStart(String conversationId) {
socket.emit('typing:start', {
'conversationId': conversationId
});
}

text

**Recommendation:** Add debounce to avoid sending too many events

---

##### 5. `typing:stop`

Indicate user stopped typing.

**When to emit:** After 2-3 seconds of no typing

**Data to send:**
{
"conversationId": "conv123"
}

text

**Flutter with Debounce:**
Timer? _typingTimer;

void onTextChanged(String text, String conversationId) {
// Cancel previous timer
_typingTimer?.cancel();

// Emit typing start
socket.emit('typing:start', {'conversationId': conversationId});

// Set timer to emit typing stop after 2 seconds
_typingTimer = Timer(Duration(seconds: 2), () {
socket.emit('typing:stop', {'conversationId': conversationId});
});
}

text

---

##### 6. `message:read`

Mark a single message as read.

**When to emit:** When message appears on screen

**Data to send:**
{
"messageId": "msg123",
"conversationId": "conv123"
}

text

**Flutter:**
void markMessageAsRead(String messageId, String conversationId) {
socket.emit('message:read', {
'messageId': messageId,
'conversationId': conversationId
});
}

text

---

##### 7. `conversation:mark-all-read`

Mark all messages in conversation as read.

**When to emit:** When user opens conversation

**Data to send:**
{
"conversationId": "conv123"
}

text

**Flutter:**
void markAllAsRead(String conversationId) {
socket.emit('conversation:mark-all-read', {
'conversationId': conversationId
});
}

text

---

#### SERVER → CLIENT (Listen)

Events that server sends to client.

---

##### 1. `conversation:joined`

Confirmation that you joined conversation.

**Listen for:**
socket.on('conversation:joined', (data) {
print('Joined conversation: ${data['conversationId']}');
});

text

---

##### 2. `message:new`

New message received in conversation.

**Data received:**
{
"message": {
"_id": "msg123",
"senderId": {
"_id": "user123",
"first_name": "Rajesh",
"last_name": "Kumar",
"role": "User"
},
"messageType": "text",
"content": "Hello",
"isRead": false,
"deliveredAt": "2025-10-24T10:45:00.000Z",
"createdAt": "2025-10-24T10:45:00.000Z"
},
"conversationId": "conv123"
}

text

**Flutter:**
socket.on('message:new', (data) {
var message = data['message'];
String conversationId = data['conversationId'];

// Add message to UI
setState(() {
messages.add(Message.fromJson(message));
});

// Scroll to bottom
scrollToBottom();
});

text

**Next.js:**
socket.on('message:new', (data) => {
const { message, conversationId } = data;

// Update messages in state
setMessages(prev => [...prev, message]);

// Play notification sound
playNotificationSound();
});

text

---

##### 3. `message:sent`

Confirmation that your message was sent.

**Data received:**
{
"messageId": "msg123",
"timestamp": "2025-10-24T10:45:00.000Z"
}

text

**Flutter:**
socket.on('message:sent', (data) {
String messageId = data['messageId'];

// Update temporary message with real ID
updateMessageId(tempId, messageId);

// Show checkmark (delivered)
showDeliveredStatus(messageId);
});

text

---

##### 4. `notification:new-message`

Notification for new message (when not in conversation room).

**Data received:**
{
"conversationId": "conv123",
"message": { /* message object */ },
"sender": {
"id": "user123",
"name": "Rajesh Kumar",
"role": "User"
}
}

text

**Flutter:**
socket.on('notification:new-message', (data) {
// Show local notification
showNotification(
title: 'New message from ${data['sender']['name']}',
body: data['message']['content'] ?? 'Sent a media file',
);

// Update badge count
updateUnreadCount();
});

text

---

##### 5. `typing:user-typing`

Other user started typing.

**Data received:**
{
"conversationId": "conv123",
"userId": "user123",
"userName": "Rajesh Kumar"
}

text

**Flutter:**
socket.on('typing:user-typing', (data) {
String conversationId = data['conversationId'];
String userName = data['userName'];

// Show "Rajesh Kumar is typing..."
setState(() {
typingUsers[conversationId] = userName;
});
});

text

---

##### 6. `typing:user-stopped`

Other user stopped typing.

**Data received:**
{
"conversationId": "conv123",
"userId": "user123"
}

text

**Flutter:**
socket.on('typing:user-stopped', (data) {
String conversationId = data['conversationId'];

// Hide typing indicator
setState(() {
typingUsers.remove(conversationId);
});
});

text

---

##### 7. `message:read-receipt`

Someone read your message.

**Data received:**
{
"messageId": "msg123",
"conversationId": "conv123",
"readBy": "support123",
"readAt": "2025-10-24T10:50:00.000Z"
}

text

**Flutter:**
socket.on('message:read-receipt', (data) {
String messageId = data['messageId'];

// Update message status to "read" (double checkmark)
updateMessageReadStatus(messageId, true);
});

text

---

##### 8. `user:online`

A user came online.

**Data received:**
{
"userId": "support123",
"timestamp": "2025-10-24T11:00:00.000Z"
}

text

**Flutter:**
socket.on('user:online', (data) {
String userId = data['userId'];

// Update user status
updateUserOnlineStatus(userId, true);
});

text

---

##### 9. `user:offline`

A user went offline.

**Data received:**
{
"userId": "support123",
"lastSeen": "2025-10-24T11:05:00.000Z"
}

text

**Flutter:**
socket.on('user:offline', (data) {
String userId = data['userId'];
String lastSeen = data['lastSeen'];

// Update user status
updateUserOnlineStatus(userId, false);
updateLastSeen(userId, lastSeen);
});

text

---

##### 10. `error`

Error occurred.

**Data received:**
{
"message": "Error message here"
}

text

**Flutter:**
socket.on('error', (data) {
String errorMessage = data['message'];

// Show error to user
showErrorSnackbar(errorMessage);
});

text

---

## 📱 Implementation Examples

### Complete Flutter Chat Screen Example

import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:http/http.dart' as http;
import 'dart:convert';

class ChatScreen extends StatefulWidget {
final String token;
final String conversationId;

ChatScreen({required this.token, required this.conversationId});

@override
_ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
late IO.Socket socket;
List<dynamic> messages = [];
TextEditingController messageController = TextEditingController();
bool isTyping = false;

@override
void initState() {
super.initState();
initializeChat();
}

void initializeChat() async {
// 1. Load message history (HTTP)
await loadMessages();

text
// 2. Connect to Socket.IO
connectSocket();

// 3. Join conversation room
socket.emit('conversation:join', {
  'conversationId': widget.conversationId
});

// 4. Listen for new messages
socket.on('message:new', (data) {
  setState(() {
    messages.add(data['message']);
  });
});

// 5. Listen for typing indicators
socket.on('typing:user-typing', (data) {
  setState(() {
    isTyping = true;
  });
});

socket.on('typing:user-stopped', (data) {
  setState(() {
    isTyping = false;
  });
});

// 6. Mark all as read when opening
socket.emit('conversation:mark-all-read', {
  'conversationId': widget.conversationId
});
}

Future<void> loadMessages() async {
final response = await http.get(
Uri.parse('http://localhost:5000/api/v1/chat/messages/${widget.conversationId}'),
headers: {'Authorization': 'Bearer ${widget.token}'},
);

text
if (response.statusCode == 200) {
  var data = jsonDecode(response.body);
  setState(() {
    messages = data['data'];
  });
}
}

void connectSocket() {
socket = IO.io('http://localhost:5000', <String, dynamic>{
'transports': ['websocket'],
'auth': {'token': widget.token}
});
socket.connect();
}

void sendMessage() {
String text = messageController.text.trim();
if (text.isEmpty) return;

text
socket.emit('message:send', {
  'conversationId': widget.conversationId,
  'messageType': 'text',
  'content': text,
});

messageController.clear();
}

@override
Widget build(BuildContext context) {
return Scaffold(
appBar: AppBar(
title: Text('Chat with Support'),
),
body: Column(
children: [
// Messages list
Expanded(
child: ListView.builder(
itemCount: messages.length,
itemBuilder: (context, index) {
var message = messages[index];
return MessageBubble(message: message);
},
),
),

text
      // Typing indicator
      if (isTyping)
        Padding(
          padding: EdgeInsets.all(8),
          child: Text('Support is typing...'),
        ),
      
      // Input field
      Padding(
        padding: EdgeInsets.all(8),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: messageController,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                ),
                onChanged: (text) {
                  socket.emit('typing:start', {
                    'conversationId': widget.conversationId
                  });
                },
              ),
            ),
            IconButton(
              icon: Icon(Icons.send),
              onPressed: sendMessage,
            ),
          ],
        ),
      ),
    ],
  ),
);
}

@override
void dispose() {
socket.emit('conversation:leave', {
'conversationId': widget.conversationId
});
socket.disconnect();
super.dispose();
}
}

text

---

### Complete Next.js Chat Component Example

import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export default function ChatComponent({ token, conversationId }) {
const [socket, setSocket] = useState(null);
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');
const [isTyping, setIsTyping] = useState(false);
const messagesEndRef = useRef(null);

useEffect(() => {
// Initialize chat
initializeChat();

text
return () => {
  // Cleanup on unmount
  if (socket) {
    socket.emit('conversation:leave', { conversationId });
    socket.disconnect();
  }
};
}, []);

async function initializeChat() {
// 1. Load message history
await loadMessages();

text
// 2. Connect to Socket.IO
const newSocket = io('http://localhost:5000', {
  auth: { token }
});

setSocket(newSocket);

// 3. Join conversation
newSocket.emit('conversation:join', { conversationId });

// 4. Listen for new messages
newSocket.on('message:new', (data) => {
  setMessages(prev => [...prev, data.message]);
  scrollToBottom();
});

// 5. Listen for typing
newSocket.on('typing:user-typing', () => {
  setIsTyping(true);
});

newSocket.on('typing:user-stopped', () => {
  setIsTyping(false);
});

// 6. Mark all as read
newSocket.emit('conversation:mark-all-read', { conversationId });
}

async function loadMessages() {
const response = await fetch(
/api/v1/chat/messages/${conversationId},
{
headers: { 'Authorization': Bearer ${token} }
}
);
const data = await response.json();
setMessages(data.data);
}

function sendMessage(e) {
e.preventDefault();
if (!newMessage.trim() || !socket) return;

text
socket.emit('message:send', {
  conversationId,
  messageType: 'text',
  content: newMessage,
});

setNewMessage('');
}

function scrollToBottom() {
messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}

return (
<div className="chat-container">
{/* Messages */}
<div className="messages">
{messages.map(message => (
<div key={message._id} className="message">
<strong>{message.senderId.first_name}:</strong> {message.content}
</div>
))}
<div ref={messagesEndRef} />
</div>

text
  {/* Typing indicator */}
  {isTyping && <div className="typing">Support is typing...</div>}
  
  {/* Input */}
  <form onSubmit={sendMessage}>
    <input
      type="text"
      value={newMessage}
      onChange={(e) => {
        setNewMessage(e.target.value);
        if (socket) {
          socket.emit('typing:start', { conversationId });
        }
      }}
      placeholder="Type a message..."
    />
    <button type="submit">Send</button>
  </form>
</div>
);
}

text

---

## ⚠️ Error Handling

### HTTP Errors

All endpoints return errors in this format:

{
"success": false,
"message": "Error description here"
}

text

**Common HTTP Status Codes:**

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check request data format |
| 401 | Unauthorized | Token invalid or expired - re-login |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Try again later, contact support |

**Flutter Error Handling:**
try {
final response = await http.post(...);

if (response.statusCode == 200) {
// Success
} else if (response.statusCode == 401) {
// Token expired, redirect to login
Navigator.pushReplacementNamed(context, '/login');
} else {
var error = jsonDecode(response.body);
showError(error['message']);
}
} catch (e) {
showError('Network error. Please check your connection.');
}

text

### Socket.IO Errors

**Connection Errors:**

socket.onConnectError((error) {
print('Connection error: $error');
// Show error message
// Try to reconnect
});

socket.onError((error) {
print('Socket error: $error');
});

text

**Event Errors:**

Server sends `error` event:

socket.on('error', (data) {
String message = data['message'];
showErrorDialog(message);
});

text

---

## 📊 Message Flow Diagrams

### Sending a Text Message

User types message in TextField

User clicks Send button

App emits: socket.emit('message:send', {data})

Server receives event

Server saves message to database

Server broadcasts 'message:new' to conversation room

Both sender and receiver get 'message:new' event

App adds message to UI

Receiver sees new message instantly

text

### Sending a Media Message

User selects image from gallery

App uploads to: POST /api/v1/chat/media

Server returns mediaId

App emits: socket.emit('message:send', {mediaId})

Server saves message with media reference

Server broadcasts 'message:new' to room

Receiver gets message with populated media URL

App displays image from media.url

text

### Opening a Conversation

User clicks on conversation in list

App loads: GET /api/v1/chat/messages/:conversationId (history)

App displays loaded messages

App emits: socket.emit('conversation:join', {conversationId})

App emits: socket.emit('conversation:mark-all-read', {conversationId})

App starts listening for 'message:new' events

Real-time messages now appear instantly

text

---

## 🔧 Troubleshooting

### Socket.IO not connecting

1. Check token is valid and not expired
2. Verify server URL is correct
3. Check CORS settings on server
4. Ensure firewall allows WebSocket connections
5. Try with `transports: ['websocket']` option

### Messages not appearing

1. Verify you joined conversation room (`conversation:join`)
2. Check you're listening for `message:new` event
3. Ensure conversationId is correct
4. Check console for errors

### Media upload fails

1. Check file size (max 10MB)
2. Verify file type is allowed
3. Ensure correct `type` field ("image", "audio", "video")
4. Check token is valid

---

## 📞 Support

For issues or questions, contact:
- **Email:** support@yourapp.com
- **Developer:** [Your Name]
- **Last Updated:** October 24, 2025

---

**End of Documentation** ✅