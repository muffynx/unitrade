# UniTrade Backend API

## การติดตั้งและรัน Backend

### 1. ติดตั้ง Dependencies
```bash
cd server
npm install
```

### 2. ตั้งค่า Environment Variables
สร้างไฟล์ `.env` ในโฟลเดอร์ `server` และเพิ่มข้อมูลดังนี้:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/unitrade

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Server Port
PORT=3000

# Environment
NODE_ENV=development

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 3. รัน Backend
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/me` - ดูข้อมูลผู้ใช้ปัจจุบัน

### Products
- `GET /api/product` - ดูสินค้าทั้งหมด
- `POST /api/product` - เพิ่มสินค้า
- `GET /api/product/:id` - ดูสินค้าตาม ID
- `PUT /api/product/:id` - แก้ไขสินค้า
- `DELETE /api/product/:id` - ลบสินค้า

### Conversations (Chat System)
- `GET /api/conversations` - ดูการสนทนาทั้งหมดของผู้ใช้
- `POST /api/conversations` - สร้างหรือดึงการสนทนา
- `GET /api/conversations/:id` - ดูการสนทนาตาม ID
- `GET /api/conversations/:id/messages` - ดูข้อความในการสนทนา
- `POST /api/conversations/:id/messages` - ส่งข้อความ
- `PATCH /api/conversations/:id/read` - ทำเครื่องหมายว่าอ่านแล้ว
- `DELETE /api/conversations/:id` - ลบการสนทนา

### Messages (Marketplace Posts)
- `GET /api/messages` - ดูโพสต์ทั้งหมด
- `POST /api/messages/create` - สร้างโพสต์ใหม่
- `GET /api/messages/:id` - ดูโพสต์ตาม ID
- `PUT /api/messages/:id` - แก้ไขโพสต์
- `DELETE /api/messages/:id` - ลบโพสต์
- `POST /api/messages/:id/like` - กดไลค์/ยกเลิกไลค์
- `POST /api/messages/:id/comment` - เพิ่มความคิดเห็น

### Users
- `GET /api/users` - ดูผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ดูผู้ใช้ตาม ID
- `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้

### Favorites
- `GET /api/favorites` - ดูรายการโปรด
- `POST /api/favorites` - เพิ่มรายการโปรด
- `DELETE /api/favorites/:id` - ลบรายการโปรด

### Cart
- `GET /api/cart` - ดูตะกร้าสินค้า
- `POST /api/cart` - เพิ่มสินค้าในตะกร้า
- `PUT /api/cart/:id` - แก้ไขจำนวนสินค้า
- `DELETE /api/cart/:id` - ลบสินค้าจากตะกร้า

## Database Models

### User
- `_id`: ObjectId
- `name`: String
- `email`: String
- `password`: String (hashed)
- `profileImage`: String
- `createdAt`: Date
- `updatedAt`: Date

### Product
- `_id`: ObjectId
- `title`: String
- `description`: String
- `price`: Number
- `images`: [String]
- `category`: String
- `condition`: String
- `seller`: ObjectId (ref: User)
- `createdAt`: Date
- `updatedAt`: Date

### Conversation
- `_id`: ObjectId
- `product`: ObjectId (ref: Product)
- `participants`: [ObjectId] (ref: User)
- `lastMessage`: Object
- `unreadCount`: Map
- `isActive`: Boolean
- `createdAt`: Date
- `updatedAt`: Date

### ChatMessage
- `_id`: ObjectId
- `conversationId`: ObjectId (ref: Conversation)
- `sender`: ObjectId (ref: User)
- `content`: String
- `read`: Boolean
- `readAt`: Date
- `messageType`: String
- `attachments`: [Object]
- `createdAt`: Date
- `updatedAt`: Date

### Message (Marketplace Posts)
- `_id`: ObjectId
- `title`: String
- `description`: String
- `category`: String
- `user`: ObjectId (ref: User)
- `location`: String
- `budget`: Number
- `urgency`: String
- `status`: String
- `likes`: [ObjectId] (ref: User)
- `comments`: [Object]
- `views`: Number
- `createdAt`: Date
- `updatedAt`: Date
