# Clarity Retina Care - AI-Powered Diabetic Retinopathy Detection System

A comprehensive full-stack healthcare application for early detection and management of diabetic retinopathy using deep learning, with integrated doctor finder, AI chat assistant, and health reminder features.

## Demo Video

[**Watch Project Demo Video**](https://drive.google.com/file/d/1eeUjscZdhrJTFgO1HOKJz9EoOh610uTH/view?usp=sharing)

---

## Project Overview

Clarity Retina Care is an end-to-end healthcare platform that combines:
- **AI-powered retina scan analysis** using a custom CNN model for 5-stage diabetic retinopathy classification
- **Intelligent RAG-based chat assistant** for medical information and health queries
- **Location-based doctor finder** with Google Maps integration
- **Automated health reminders** with email notifications
- **Comprehensive patient management** with secure authentication and role-based access

---

## Architecture

### Frontend

- React App
- Runs on: Port 5173 (development)
- Communicates with Backend API

### Backend API

- Express.js server
- Runs on: Port 5000
- Handles:  Authentication, User management, Report storage, Reminders
- Connects to MongoDB and other services

### Database

- MongoDB
- QdrantDB

### Microservices
1. CNN Service

- FastAPI (Python- 3.11.9 version only)
- Runs on: Port 8501
- Performs CNN classification tasks

2. RAG Service

- FastAPI (Python)
- Runs on: Port 8502
- Performs RAG-based retrieval + generation

3. Cloudinary

- External cloud storage
- Stores uploaded images (e.g., retinal scans)

---

## Features

### Patient Features
- **Retina Scan Analysis**: Upload fundus images for AI-powered 5-stage diabetic retinopathy detection
- **Doctor Finder**: Search nearby ophthalmologists with filters (specialization, rating, distance)
- **AI Chat Assistant**: Get instant medical information using RAG-powered chat
- **Health Reminders**: Set medication and appointment reminders with email notifications
- **Report History**: Track all scan reports with detailed analysis
- **Secure Authentication**: OTP-based email verification for enhanced security

### Admin Features
- **User Management**: View, search, and manage all users
- **System Analytics**: Dashboard with statistics and insights
- **Document Management**: Upload PDFs and URLs to RAG knowledge base
- **Report Monitoring**: Track all patient scans and results

### Technical Features
- **5-Stage DR Classification**: No DR, Mild, Moderate, Severe, Proliferative DR
- **Geospatial Search**: Find doctors within specified radius using MongoDB geospatial queries
- **RAG Architecture**: Retrieval-Augmented Generation for accurate medical responses
- **Email Notifications**: Automated reminders using Nodemailer with Gmail
- **Real-time Updates**: WebSocket support for instant notifications

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: React Context API
- **Routing**: React Router v6
- **Maps**: Google Maps JavaScript API
- **HTTP Client**: Axios & Fetch API

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + OTP (Email)
- **Email Service**: Nodemailer with Gmail SMTP
- **Image Storage**: Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet.js, CORS, bcryptjs

### ML Services

#### CNN Model Service (Port 8501)
- **Framework**: TensorFlow/Keras
- **API**: FastAPI
- **Server**: Uvicorn
- **Model**: Custom CNN for DR classification
- **Image Processing**: OpenCV, Pillow

#### RAG Service (Port 8502)
- **Framework**: LangChain
- **Vector DB**: ChromaDB
- **Embeddings**: Sentence Transformers
- **LLM**: Google Gemini API
- **API**: FastAPI
- **Document Processing**: PyPDF2, BeautifulSoup4

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **Python**: 3.11.9 ([Download](https://www.python.org/downloads/))
- **MongoDB**: Atlas account or local installation ([MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git**: For cloning the repository ([Download](https://git-scm.com/))

### Required API Keys & Accounts

1. **MongoDB Atlas**: Database hosting
2. **Google Cloud Platform**:
   - Maps JavaScript API key
   - Gemini API key for RAG
3. **Cloudinary**: Image storage account
4. **Gmail**: App-specific password for email notifications

---

## 📁 Project Structure

```
clarity-retina-care/
│
├── src/                          # Frontend source code
│   ├── components/              
│   │   ├── layout/              # Header, Footer, Navigation
│   │   ├── ui/                  # Shadcn UI components
│   │   ├── chat_components/     # Chat interface components
│   │   └── marketing/           # Landing page components
│   ├── contexts/                # React Context providers
│   │   ├── AuthContext.tsx      # Authentication state
│   │   └── ChatContext.tsx      # Chat state
│   ├── lib/                     # Utility functions
│   │   ├── api.ts               # API service layer
│   │   └── utils.ts             # Helper functions
│   ├── pages/                   # Route pages
│   │   ├── Auth.tsx             # Login/Signup with OTP
│   │   ├── Chat.tsx             # RAG chat interface
│   │   ├── Doctors.tsx          # Doctor finder with maps
│   │   ├── Reminders.tsx        # Health reminders
│   │   ├── Reports.tsx          # Scan reports
│   │   └── admin/               # Admin dashboard
│   └── App.tsx                  # Root component
│
├── backend/                      # Backend API server
│   ├── models/                  # MongoDB schemas
│   │   ├── User.js              # User model
│   │   ├── Doctor.js            # Doctor model
│   │   ├── Report.js            # Scan report model
│   │   ├── Reminder.js          # Reminder model
│   │   └── Otp.js               # OTP verification
│   ├── routes/                  # API endpoints
│   │   ├── auth.js              # Authentication & OTP
│   │   ├── users.js             # User management
│   │   ├── doctors.js           # Doctor operations
│   │   ├── reports.js           # Report management
│   │   ├── reminders.js         # Reminder CRUD
│   │   ├── upload.js            # Cloudinary uploads
│   │   └── admin.js             # Admin operations
│   ├── middleware/              
│   │   └── auth.js              # JWT verification
│   ├── utils/                   
│   │   └── email.js             # Email templates & sender
│   ├── notificationService.js   # Reminder scheduler
│   └── server.js                # Express app entry
│
├── backend/cnn_model/            # CNN prediction service
│   ├── models/                  
│   │   └── dr_model.h5          # Trained CNN model
│   ├── predict_service.py       # FastAPI prediction endpoint
│   ├── predict_requirements.txt # Python dependencies
│   └── Dockerfile               # Docker configuration
│
├── backend/rag_service/          # RAG chat service
│   ├── main.py                  # FastAPI RAG endpoints
│   ├── rag_manager.py           # ChromaDB operations
│   ├── requirements.txt         # Python dependencies
│   └── chroma_db/               # Vector database storage
│
├── public/                       # Static assets
├── .env                         # Frontend environment variables
├── backend/.env                 # Backend environment variables
├── package.json                 # Frontend dependencies
├── vite.config.ts               # Vite configuration
└── README.md                    # This file
```

---

## Environment Variables

### Frontend `.env`

```env
# Google Maps API Key (Enable Maps JavaScript API)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Backend API URL (Development)
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend `.env`

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clarity_retina_care

# JWT Authentication
JWT_SECRET_KEY=your_very_secure_32_character_secret_key_here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Service (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password_no_spaces

# Admin Secret Key (for admin registration)
ADMIN_SECRET_KEY=your_admin_secret_key

# Google Gemini API (for RAG service)
GOOGLE_GENAI_API_KEY=your_gemini_api_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Microservices URLs
PREDICT_SERVICE_URL=http://127.0.0.1:8501
RAG_SERVICE_URL=http://127.0.0.1:8502
```

### Python Services `.env` (Optional)

Create a `.env` file in `backend/rag_service/`:

```env
GOOGLE_API_KEY=your_gemini_api_key
```

---

## >> Installation & Setup

### 1️> Clone the Repository

```bash
git clone https://github.com/yourusername/clarity-retina-care.git
cd clarity-retina-care
```

### 2️> Install Frontend Dependencies

```bash
npm install
```

### 3️> Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4️> Setup Python Virtual Environments

#### CNN Model Service

```bash
cd backend/cnn_model
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r predict_requirements.txt
cd ../..
```

#### RAG Service

```bash
cd backend/rag_service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cd ../..
```

### 5️> Configure Environment Variables

1. Copy `.env.example` to `.env` in root directory
2. Copy `backend/.env.example` to `backend/.env`
3. Fill in all required API keys and credentials

### 6️> Setup MongoDB Database

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Add your IP address to the whitelist
4. Create a database user
5. Copy the connection string to `MONGODB_URI` in `backend/.env`

### 7️> Setup Gmail App Password

1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account > Security > App passwords
3. Generate a new app password for "Mail"
4. Copy the 16-character password (remove spaces)
5. Add to `EMAIL_PASSWORD` in `backend/.env`

---

## >> Running the Application

You need to run **4 services** simultaneously. Open 4 separate terminal windows:

### Terminal 1: Frontend

```bash
npm run dev
```
Frontend runs at: http://localhost:5173

### Terminal 2: Backend API

```bash
cd backend
npm run dev
```
Backend API runs at: http://localhost:5000

### Terminal 3: CNN Model Service

```bash
cd backend/cnn_model

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Start service
uvicorn predict_service:app --reload --port 8501
```
CNN Service runs at: http://localhost:8501

### Terminal 4: RAG Chat Service

```bash
cd backend/rag_service

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Start service
uvicorn main:app --reload --port 8502
```
RAG Service runs at: http://localhost:8502

---

## Docker Deployment (CNN Model Service)

### Build Docker Image

```bash
cd backend/cnn_model
docker build -t clarity-cnn-service .
```

### Run Docker Container

```bash
docker run -d -p 8501:8501 --name clarity-cnn clarity-cnn-service
```

### Docker Commands

```bash
# Check running containers
docker ps

# View logs
docker logs clarity-cnn

# Stop container
docker stop clarity-cnn

# Remove container
docker rm clarity-cnn

# Remove image
docker rmi clarity-cnn-service
```

### Docker Compose (All Services)

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  # CNN Model Service
  cnn-service:
    build: ./backend/cnn_model
    ports:
      - "8501:8501"
    environment:
      - PORT=8501
    restart: unless-stopped

  # RAG Service
  rag-service:
    build: ./backend/rag_service
    ports:
      - "8502:8502"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_GENAI_API_KEY}
    restart: unless-stopped

  # Backend API
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - cnn-service
      - rag-service
    restart: unless-stopped

  # Frontend
  frontend:
    build: .
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped
```

Run with Docker Compose:

```bash
docker-compose up -d
```

---

## API Documentation

### Authentication Endpoints

#### Request OTP
```http
POST /api/auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "type": "login" | "signup" | "admin"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "type": "login"
}
```

### Doctor Endpoints

#### Find Nearby Doctors
```http
GET /api/doctors/nearby?lat=40.7128&lng=-74.0060&maxDistance=50&specialization=Retina%20Specialist
```

#### Get All Doctors
```http
GET /api/doctors?page=1&limit=20&specialization=Ophthalmologist
```

### Report Endpoints

#### Analyze Retina Scan
```http
POST /api/reports/analyze
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "imageUrl": "https://cloudinary.com/image.jpg",
  "publicId": "clarity-retina-care/scan123"
}
```

#### Get User Reports
```http
GET /api/reports
Authorization: Bearer <jwt_token>
```

### Reminder Endpoints

#### Create Reminder
```http
POST /api/reminders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Take Metformin",
  "note": "500mg after breakfast",
  "dateTime": "2025-01-15T09:00:00Z",
  "notificationType": "email",
  "contactInfo": "user@example.com"
}
```

### RAG Chat Endpoints

#### Send Message
```http
POST http://localhost:8502/api/rag/chat
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "What are the symptoms of diabetic retinopathy?",
  "chat_id": "optional-existing-chat-id"
}
```

#### Upload Document to RAG
```http
POST http://localhost:8502/api/rag/ingest/pdf
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <pdf_file>
```

---

## Testing

### Run Frontend Tests
```bash
npm run test
```

### Run Backend Tests
```bash
cd backend
npm run test
```

### Test CNN Service
```bash
curl -X POST http://localhost:8501/predict \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/retina.jpg"}'
```

### Test RAG Service
```bash
curl -X POST http://localhost:8502/api/rag/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "What is diabetic retinopathy?"}'
```

---

## -> Production Deployment

### Frontend (Vercel/Netlify)

1. **Build the project**:
```bash
npm run build
```

2. **Deploy to Vercel**:
```bash
npm install -g vercel
vercel --prod
```

3. **Environment Variables**: Add in Vercel dashboard
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_API_BASE_URL` (your backend URL)

### Backend (Railway/Render)

1. **Create `Procfile`** in backend folder:
```
web: node server.js
```

2. **Deploy to Railway**:
   - Connect GitHub repository
   - Set environment variables
   - Deploy automatically

3. **Environment Variables**: Add all backend `.env` variables

### CNN Service (Docker + Cloud Run)

1. **Build and push to Container Registry**:
```bash
docker build -t gcr.io/your-project/cnn-service ./backend/cnn_model
docker push gcr.io/your-project/cnn-service
```

2. **Deploy to Google Cloud Run**:
```bash
gcloud run deploy cnn-service \
  --image gcr.io/your-project/cnn-service \
  --port 8501 \
  --allow-unauthenticated
```

### RAG Service (Docker + Cloud Run)

```bash
docker build -t gcr.io/your-project/rag-service ./backend/rag_service
docker push gcr.io/your-project/rag-service

gcloud run deploy rag-service \
  --image gcr.io/your-project/rag-service \
  --port 8502 \
  --set-env-vars GOOGLE_API_KEY=your_key
```

---

## -> Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization with Cloudinary transforms
- Caching with React Query
- Lazy loading for maps

### Backend
- MongoDB indexing on frequently queried fields
- Rate limiting with express-rate-limit
- Compression middleware
- JWT token expiration strategy

### ML Services
- Model quantization for faster inference
- Batch processing for multiple images
- Caching predictions in Redis (optional)

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Code Style Guidelines
- Use TypeScript for frontend code
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic
- Update README if adding new features

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Made with ❤️ for better health**
