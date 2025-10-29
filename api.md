# 💬 Chat System API Documentation

**Version:** 1.0  
**Last Updated:** October 24, 2025  
**Base URL:** `http://localhost:5000/api/v1` (Development)

---

## 📋 Table of Contents

1.  [Overview](#overview)
2.  [Authentication](#authentication)
3.  [REST API Endpoints](#rest-api-endpoints)
4.  [Socket.IO Real-Time Events](#socketio-real-time-events)
5.  [Implementation Examples](#implementation-examples)
6.  [Error Handling](#error-handling)
7.  [Troubleshooting](#troubleshooting)

---

## 🔍 Overview

The chat system provides real-time communication between Users (farmers) and Support/Admin staff.

### Architecture

-   **Primary Method:** Socket.IO for real-time messaging
-   **Fallback Method:** REST API for message history and offline support
-   **Media Upload:** Separate endpoint before sending media messages

### User Roles

Role

Description

Capabilities

**User**

Farmers using mobile app

Create conversations, send messages, view their chats

**Support**

Support agents

Respond to assigned conversations, view assigned chats

**Admin**

Administrators

Access all conversations, reassign chats, view statistics

---

## 🔐 Authentication

All API endpoints and Socket.IO connections require JWT authentication.

### HTTP Requests

Include token in Authorization header:

Authorization: Bearer YOUR_JWT_TOKEN

text

### Socket.IO Connection

Send token during connection:

**Flutter (socket_io_client):**import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io('[http://localhost:5000](http://localhost:5000)', <String, dynamic>{'transports': ['websocket'],'auth': {'token': 'YOUR_JWT_TOKEN'}});socket.connect();

text

**Next.js (socket.io-client):**import io from 'socket.io-client';

const socket = io('[http://localhost:5000](http://localhost:5000)', {auth: {token: 'YOUR_JWT_TOKEN'}});

text

---

## 🌐 REST API Endpoints

### Base Information

-   **Base URL:** `/api/v1/chat`
-   **Content-Type:** `application/json`
-   **Authentication:** Required for all endpoints

---

### 1. Create/Get Conversation

Creates new conversation or returns existing one between user and support.

**Endpoint:** `POST /conversations`

**Who calls:** User (farmers)

**Request Body:** None (user ID comes from token)

**Success Response (200):**{"message": "Conversation retrieved successfully","data": {"_id": "671234567890abcdef123456","userId": {"_id": "user123","first_name": "Rajesh","last_name": "Kumar","phone": "+919876543210","isOnline": true},"assignedSupportId": {"_id": "support123","first_name": "Support","last_name": "Agent","role": "Support"},"status": "open","unreadCount": {},"createdAt": "2025-10-24T10:00:00.000Z"}}

text

**Flutter Example:**Future<Map<String, dynamic>> createConversation(String token) async {final response = await http.post(Uri.parse('[http://localhost:5000/api/v1/chat/conversations](http://localhost:5000/api/v1/chat/conversations)'),headers: {'Authorization': 'Bearer $token','Content-Type': 'application/json',},);return jsonDecode(response.body);}

text

---

### 2. Get My Conversations

**Endpoint:** `GET /conversations`

**Query Parameters:**

-   `page` (optional, default: 1)
-   `limit` (optional, default: 20)
-   `status` (optional: "open", "waiting", "resolved", "closed")

**Success Response (200):**{"message": "Conversations fetched successfully","data": [/* array of conversations */],"pagination": {"currentPage": 1,"totalPages": 3,"totalItems": 45}}

text

---

### 3. Get Messages

**Endpoint:** `GET /messages/:conversationId`

**Query Parameters:**

-   `page` (optional, default: 1)
-   `limit` (optional, default: 50)

**Success Response (200):**{"message": "Messages fetched successfully","data": [{"_id": "msg123","senderId": { /* sender details / },"messageType": "text","content": "Hello","isRead": true,"createdAt": "2025-10-24T10:35:00.000Z"}],"pagination": { / pagination info */ }}

text

---

### 4. Upload Chat Media

**Endpoint:** `POST /media`

**Content-Type:** `multipart/form-data`

**Form Fields:**

-   `media` - File(s) to upload (max 5 files, max 10MB each)
-   `type` - "image", "audio", or "video"

**Success Response (201):**{"message": "Media uploaded successfully","data": [{"_id": "media123","name": "crop_disease.jpg","type": "image","url": "[http://localhost:5000/uploads/chat/crop_disease.jpg](http://localhost:5000/uploads/chat/crop_disease.jpg)","format": "image/jpeg","size": 345678}]}

text

**Flutter Example:**Future uploadMedia(String token, File file, String type) async {var request = http.MultipartRequest('POST',Uri.parse('[http://localhost:5000/api/v1/chat/media](http://localhost:5000/api/v1/chat/media)'),);

request.headers['Authorization'] = 'Bearer $token';request.fields['type'] = type;request.files.add(await http.MultipartFile.fromPath('media', file.path));

var response = await request.send();var responseData = await response.stream.bytesToString();var jsonData = jsonDecode(responseData);

return jsonData['data']['_id']; // Return media ID}

text

---

### 5. Send Message (HTTP)

**Endpoint:** `POST /messages`

**Request Body (Text):**{"conversationId": "conv123","messageType": "text","content": "Hello, I need help"}

text

**Request Body (Media):**{"conversationId": "conv123","messageType": "image","mediaId": "media123"}

text

---

### 6. Other Endpoints

-   `PATCH /conversations/:conversationId/read` - Mark all messages as read
-   `PATCH /conversations/:id/status` - Update conversation status (Support/Admin)
-   `GET /support/conversations` - Get all conversations (Support/Admin)
-   `POST /support/reassign` - Reassign conversation (Admin)
-   `GET /support/stats` - Get statistics (Support/Admin)

---

## 🔌 Socket.IO Real-Time Events

### Connection

**Flutter:**IO.Socket socket = IO.io('[http://localhost:5000](http://localhost:5000)', {'transports': ['websocket'],'auth': {'token': token}});socket.connect();

text

---

### CLIENT → SERVER Events (Emit)

#### 1. `conversation:join`

Join conversation room to receive messages.

**Data:**{"conversationId": "conv123"}

text

**Flutter:**socket.emit('conversation:join', {'conversationId': conversationId});

text

---

#### 2. `message:send`

Send message in real-time.

**Data (Text):**{"conversationId": "conv123","messageType": "text","content": "Hello"}

text

**Data (Media):**{"conversationId": "conv123","messageType": "image","mediaId": "media123"}

text

**Flutter:**socket.emit('message:send', {'conversationId': conversationId,'messageType': 'text','content': messageText,});

text

---

#### 3. `typing:start`

User started typing.

**Data:**{"conversationId": "conv123"}

text

---

#### 4. `typing:stop`

User stopped typing.

---

#### 5. `message:read`

Mark message as read.

**Data:**{"messageId": "msg123","conversationId": "conv123"}

text

---

#### 6. `conversation:mark-all-read`

Mark all messages as read.

**Data:**{"conversationId": "conv123"}

text

---

#### 7. `conversation:leave`

Leave conversation room.

---

### SERVER → CLIENT Events (Listen)

#### 1. `message:new`

New message received.

**Data:**{"message": {"_id": "msg123","senderId": { /* sender details */ },"messageType": "text","content": "Hello","createdAt": "2025-10-24T10:45:00.000Z"},"conversationId": "conv123"}

text

**Flutter:**socket.on('message:new', (data) {setState(() {messages.add(data['message']);});});

text

---

#### 2. `message:sent`

Confirmation that message was sent.

**Data:**{"messageId": "msg123","timestamp": "2025-10-24T10:45:00.000Z"}

text

---

#### 3. `notification:new-message`

Notification for new message.

**Data:**{"conversationId": "conv123","message": { /* message object */ },"sender": {"id": "user123","name": "Rajesh Kumar"}}

text

---

#### 4. `typing:user-typing`

Other user is typing.

**Data:**{"conversationId": "conv123","userId": "user123","userName": "Rajesh Kumar"}

text

---

#### 5. `typing:user-stopped`

Other user stopped typing.

---

#### 6. `message:read-receipt`

Message was read.

**Data:**{"messageId": "msg123","readBy": "support123","readAt": "2025-10-24T10:50:00.000Z"}

text

---

#### 7. `user:online`

User came online.

---

#### 8. `user:offline`

User went offline.

---

#### 9. `error`

Error occurred.

**Data:**{"message": "Error description"}

text

---

## 📱 Implementation Examples

### Flutter Chat Screen

import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatScreen extends StatefulWidget {@override_ChatScreenState createState() => _ChatScreenState();}

class _ChatScreenState extends State {late IO.Socket socket;List messages = [];TextEditingController messageController = TextEditingController();

@overridevoid initState() {super.initState();initializeChat();}

void initializeChat() async {// Load historyawait loadMessages();

text// Connect Socket.IOsocket = IO.io('[http://localhost:5000](http://localhost:5000)', { 'transports': ['websocket'], 'auth': {'token': userToken}});socket.connect();

// Join roomsocket.emit('conversation:join', {'conversationId': conversationId});

// Listen for messagessocket.on('message:new', (data) { setState(() { messages.add(data['message']); });});}

void sendMessage() {socket.emit('message:send', {'conversationId': conversationId,'messageType': 'text','content': messageController.text,});messageController.clear();}

@overrideWidget build(BuildContext context) {return Scaffold(body: Column(children: [Expanded(child: ListView.builder(itemCount: messages.length,itemBuilder: (context, index) => MessageBubble(messages[index]),),),TextField(controller: messageController,onChanged: (_) => socket.emit('typing:start', {'conversationId': conversationId}),),IconButton(icon: Icon(Icons.send),onPressed: sendMessage,),],),);}}

text

---

### Next.js Chat Component

import { useEffect, useState } from 'react';import io from 'socket.io-client';

export default function Chat({ token, conversationId }) {const [socket, setSocket] = useState(null);const [messages, setMessages] = useState([]);const [newMessage, setNewMessage] = useState('');

useEffect(() => {initializeChat();return () => socket?.disconnect();}, []);

async function initializeChat() {// Load historyconst response = await fetch(/api/v1/chat/messages/${conversationId}, {headers: { 'Authorization': Bearer ${token} }});const data = await response.json();setMessages(data.data);

text// Connect Socket.IOconst newSocket = io('[http://localhost:5000](http://localhost:5000)', { auth: { token }});setSocket(newSocket);

// Join roomnewSocket.emit('conversation:join', { conversationId });

// Listen for messagesnewSocket.on('message:new', (data) => { setMessages(prev => [...prev, data.message]);});}

function sendMessage(e) {e.preventDefault();socket?.emit('message:send', {conversationId,messageType: 'text',content: newMessage,});setNewMessage('');}

return (

{messages.map(msg => (

{msg.content}

))}

 setNewMessage(e.target.value)}/>Send

);}

text

---

## ⚠️ Error Handling

### HTTP Status Codes

Code

Meaning

Action

400

Bad Request

Check request format

401

Unauthorized

Re-login required

403

Forbidden

No permission

404

Not Found

Resource doesn't exist

500

Server Error

Try again later

### Error Response Format

{"success": false,"message": "Error description"}

text

---

## 🔧 Troubleshooting

### Socket.IO not connecting

1.  Verify token is valid
2.  Check server URL
3.  Ensure CORS settings allow your domain
4.  Try with `transports: ['websocket']`

### Messages not appearing

1.  Verify you joined conversation room
2.  Check you're listening for `message:new`
3.  Ensure conversationId is correct

### Media upload fails

1.  Check file size (max 10MB)
2.  Verify file type is allowed
3.  Ensure correct type field

---

## 📞 Support

For issues, contact your backend developer.

**Last Updated:** October 24, 2025

---

**End of Documentation** ✅