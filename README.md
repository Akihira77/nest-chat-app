# Nest Chat API

## Overview
This is a Nest API project with feature like:  
- CRUD user's account & change password
- CRUD message  
&nbsp; - User can sending file (image, pdf) just for CREATE message feature
- Authentication with JWT

## Stack
- Typescript
- NestJS
- uWebSockets.js
- SQLite
- Prisma ORM
- Cloudinary

## Architecture
&nbsp; &nbsp; &nbsp; &nbsp; The software architecture is just using the default Nest project structure which is Domain-Driven Design.  
In JS/TS-land I usually choose Layered-Architecture or Domain-Driven Design because it is easy to organize and work with it. This also be affected by framework that I usually use which are ExpressJS, Hono, and NestJS.  
&nbsp; &nbsp;&nbsp;&nbsp; Layered-Architecture is traditional architecture especially in JavaScript world. For instance the architecture for this approach is organizing project with directories like (1) routers; (2) controllers; (3) services; (4) models; (5) utils; etc...  
&nbsp;&nbsp;&nbsp;&nbsp; Domain-Driven Design is architecture for organizing project by the entity (table) in database. The easy example is like what NestJS done so each entity will have controller, service, etc itself

With ExpressJS and Hono I can choose whatever architecture I want to use like Domain-Driven or Clean Architecture. While in NestJS I am not often to use it and I haven't done doing large project so I just stick with the default architecture.

## Entity Database
### User
model User {  
&nbsp;&nbsp; &nbsp;   id Int @default(autoincrement()) @id  
 &nbsp;&nbsp; &nbsp; name String   
 &nbsp;&nbsp; &nbsp; email String @unique  
 &nbsp;&nbsp; &nbsp; password String  
 &nbsp;&nbsp; &nbsp; avatar String  
 &nbsp;&nbsp; &nbsp; created_at DateTime  
 &nbsp;&nbsp; &nbsp; userOne Conversation[] @relation("user_one")  
 &nbsp;&nbsp; &nbsp; userTwo Conversation[] @relation("user_two")  

 &nbsp;&nbsp; &nbsp; sender Message[] @relation("sender")  
 &nbsp;&nbsp; &nbsp; receiver Message[] @relation("receiver")  
}

### Conversation
model Conversation {  
  &nbsp;&nbsp; &nbsp;  id String @unique  
  &nbsp;&nbsp; &nbsp;  userOneId Int  
  &nbsp;&nbsp; &nbsp;  userOne User @relation(name:"user_one", fields: [userOneId], references: [id], onDelete: Cascade)  
  &nbsp;&nbsp; &nbsp;  userTwoId Int  
  &nbsp;&nbsp; &nbsp;  userTwo User @relation(name: "user_two", fields: [userTwoId], references: [id], onDelete: Cascade)  
  &nbsp;&nbsp; &nbsp;  messages Message[] @relation("chat")  

  &nbsp;&nbsp; &nbsp;  @@id([id, userOneId, userTwoId])  
}


### Message
model Message {  
   &nbsp;&nbsp; &nbsp; id Int @default(autoincrement()) @id  
   &nbsp;&nbsp; &nbsp; senderId Int  
   &nbsp;&nbsp; &nbsp; sender User @relation(name: "sender", fields: [senderId], references: [id], onDelete: Cascade)  
   &nbsp;&nbsp; &nbsp; receiverId Int  
   &nbsp;&nbsp; &nbsp; receiver User @relation(name: "receiver", fields: [receiverId], references: [id], onDelete: Cascade)  
   &nbsp;&nbsp; &nbsp; message String  
   &nbsp;&nbsp; &nbsp; edited Boolean @default(false)  
   &nbsp;&nbsp; &nbsp; unread Boolean @default(true)  
   &nbsp;&nbsp; &nbsp; fileUrl String?  
   &nbsp;&nbsp; &nbsp; filePublicId String?  
   &nbsp;&nbsp; &nbsp; fileName String?  
   &nbsp;&nbsp; &nbsp; fileType String?  
   &nbsp;&nbsp; &nbsp; created_at DateTime  
   &nbsp;&nbsp; &nbsp; conversationId String  
   &nbsp;&nbsp; &nbsp; conversation Conversation @relation(name: "chat", fields: [conversationId], references: [id], onDelete: Cascade)  
}

## Test
You can use my Postman collection to test this API endpoints and you need to
create WebSocket request collection to see how data from sender being sent to
receiver.
