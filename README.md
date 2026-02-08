# EyeCare: AI-Powered Medical Diagnosis System

[**Live Demo**](https://drive.google.com/file/d/1eeUjscZdhrJTFgO1HOKJz9EoOh610uTH/view?usp=sharing)

A comprehensive full-stack healthcare application for early detection and management of diabetic retinopathy using deep learning, with integrated doctor finder, AI chat assistant, and health reminder features.

## Project Overview

Clarity Retina Care is an end-to-end healthcare platform that combines:
- **AI-powered retina scan analysis** using a custom CNN model for 5-stage diabetic retinopathy classification
- **Intelligent RAG-based chat assistant** for medical information and health queries
- **Location-based doctor finder** with Google Maps integration
- **Automated health reminders** with email notifications
- **Comprehensive patient management** with secure authentication and role-based access

## Architecture
- Frontend
- Backend API
- Database (MongoDB + QdrantDB)
- Microservices (CNN Service + RAG Service)

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

### Tech Stack

1. Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: React Context API
- **Routing**: React Router v6
- **Maps**: Google Maps JavaScript API
- **HTTP Client**: Axios & Fetch API

2. Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + OTP (Email)
- **Email Service**: Nodemailer with Gmail SMTP
- **Image Storage**: Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet.js, CORS, bcryptjs

3. ML Services

-> CNN Model Service (Port 8501)
- **Framework**: TensorFlow/Keras
- **API**: FastAPI
- **Server**: Uvicorn
- **Model**: Custom CNN for DR classification
- **Image Processing**: OpenCV, Pillow

-> RAG Service (Port 8502)
- **Framework**: LangChain
- **Vector DB**: ChromaDB
- **Embeddings**: Sentence Transformers
- **LLM**: Google Gemini API
- **API**: FastAPI
- **Document Processing**: PyPDF2, BeautifulSoup4

## Environment Variables

1. Frontend `.env`

```env
# Google Maps API Key (Enable Maps JavaScript API)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Backend API URL (Development)
VITE_API_BASE_URL=http://localhost:5000/api
```

2. Backend `.env`

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

3. Python Services `.env` (Optional)

Create a `.env` file in `backend/rag_service/`:

```env
GOOGLE_API_KEY=your_gemini_api_key
```

## Installation & Setup

1. Clone the Repository

```bash
git clone https://github.com/yourusername/clarity-retina-care.git
cd clarity-retina-care
```

2. Install Frontend Dependencies

```bash
npm install
```

3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

4. Setup Python Virtual Environments

- CNN Model Service

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

- RAG Service

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

5. Configure Environment Variables

- Copy `.env.example` to `.env` in root directory
- Copy `backend/.env.example` to `backend/.env`
- Fill in all required API keys and credentials

6. Setup MongoDB Database

- Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
- Create a new cluster
- Add your IP address to the whitelist
- Create a database user
- Copy the connection string to `MONGODB_URI` in `backend/.env`

7. Setup Gmail App Password

- Enable 2-Factor Authentication on your Google account
- Go to Google Account > Security > App passwords
- Generate a new app password for "Mail"
- Copy the 16-character password (remove spaces)
- Add to `EMAIL_PASSWORD` in `backend/.env`

## Running the Application locally

You need to run **4 services** simultaneously. Open 4 separate terminal windows:

`>_` Terminal 1: Frontend

```bash
npm run dev
```
Frontend runs at: http://localhost:5173

`>_` Terminal 2: Backend API

```bash
cd backend
npm run dev
```
Backend API runs at: http://localhost:5000

`>_` Terminal 3: CNN Model Service

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

`>_` Terminal 4: RAG Chat Service

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

## Production Deployment

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

2. **Deploy to Render**:
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
