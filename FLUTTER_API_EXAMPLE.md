# Flutter Chat API Integration

## API Endpoints for Flutter Users

### 1. Send Message (Auto-creates conversation if needed)
**POST** `/api/v1/chat/user/send-message`

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "messageType": "text", // "text", "image", "audio", "video"
  "content": "Hello, I need help with my order",
  "fileUrl": null, // Optional: URL if file was uploaded
  "fileName": null, // Optional: Original filename
  "fileSize": null // Optional: File size in bytes
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "message_id",
      "conversationId": "conversation_id",
      "senderId": "user_id",
      "messageType": "text",
      "content": "Hello, I need help with my order",
      "fileUrl": null,
      "fileName": null,
      "fileSize": null,
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "conversation": {
      "_id": "conversation_id",
      "status": "open"
    }
  }
}
```

### 2. Get User's Conversation and Messages
**GET** `/api/v1/chat/user/conversation`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "_id": "conversation_id",
      "userId": {
        "_id": "user_id",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890"
      },
      "assignedTo": null,
      "status": "open",
      "lastMessage": "2024-01-01T00:00:00.000Z",
      "lastMessageContent": "Hello, I need help",
      "unreadCount": 0,
      "priority": "medium",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "messages": [
      {
        "_id": "message_id",
        "conversationId": "conversation_id",
        "senderId": {
          "_id": "user_id",
          "first_name": "John",
          "last_name": "Doe"
        },
        "receiverId": null,
        "messageType": "text",
        "content": "Hello, I need help with my order",
        "fileUrl": null,
        "fileName": null,
        "fileSize": null,
        "isRead": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 3. Upload File (for images, audio, video)
**POST** `/api/v1/chat/upload`

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <file_data>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "/uploads/support/filename.jpg",
    "fileName": "filename.jpg",
    "originalName": "original.jpg",
    "fileSize": 12345,
    "mimeType": "image/jpeg"
  }
}
```

## Flutter Implementation Example

```dart
class ChatService {
  static const String baseUrl = 'http://your-backend-url/api/v1/chat';
  
  // Send text message
  static Future<Map<String, dynamic>> sendTextMessage(String content, String token) async {
    final response = await http.post(
      Uri.parse('$baseUrl/user/send-message'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'messageType': 'text',
        'content': content,
      }),
    );
    
    return jsonDecode(response.body);
  }
  
  // Send image message
  static Future<Map<String, dynamic>> sendImageMessage(String imagePath, String token) async {
    // First upload the file
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/upload'),
    );
    
    request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('file', imagePath));
    
    var uploadResponse = await request.send();
    var uploadData = jsonDecode(await uploadResponse.stream.bytesToString());
    
    if (uploadData['success']) {
      // Then send the message with file info
      return await sendTextMessage(
        uploadData['data']['fileName'],
        token,
        messageType: 'image',
        fileUrl: uploadData['data']['fileUrl'],
        fileName: uploadData['data']['fileName'],
        fileSize: uploadData['data']['fileSize'],
      );
    }
    
    throw Exception('File upload failed');
  }
  
  // Get conversation
  static Future<Map<String, dynamic>> getConversation(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/user/conversation'),
      headers: {
        'Authorization': 'Bearer $token',
      },
    );
    
    return jsonDecode(response.body);
  }
}
```

## How It Works

1. **User sends first message** → Conversation is automatically created
2. **Support staff sees the conversation** in their admin panel
3. **Support staff responds** → User gets the response
4. **Real-time updates** via Socket.IO (optional for Flutter)

## Socket.IO Integration (Optional)

If you want real-time updates in Flutter, you can use the `socket_io_client` package:

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;
  
  void connect(String token) {
    socket = IO.io('http://your-backend-url', <String, dynamic>{
      'transports': ['websocket', 'polling'],
      'auth': {'token': token},
    });
    
    socket.on('new_message', (data) {
      // Handle new message
      print('New message: $data');
    });
    
    socket.on('message_notification', (data) {
      // Handle notification
      print('Notification: $data');
    });
  }
  
  void disconnect() {
    socket.disconnect();
  }
}
```

## Message Types

- **text**: Plain text messages
- **image**: Image files (jpg, png, gif, webp)
- **audio**: Audio files (mp3, wav, ogg, m4a)
- **video**: Video files (mp4, avi, mov, wmv, webm)

## File Upload Limits

- Maximum file size: 50MB
- Supported formats: Images, Audio, Video
- Files are stored in `uploads/support/` directory
