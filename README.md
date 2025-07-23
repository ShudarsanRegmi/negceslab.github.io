# Negces Lab Tracking System

A full-stack MERN application for managing lab slot bookings and reservations in educational or research environments.

## 🚀 Features

- User authentication with Firebase
- Role-based access control (User & Admin)
- Lab slot booking and management
- Real-time booking status updates
- Automatic and manual notifications (system-generated for booking events)
- Admin dashboard for booking and user management
- Booking expiration and auto-release of computers
- Modern, responsive UI with React + Material-UI

## 🛠️ Tech Stack

- **Frontend:** React.js (TypeScript, Vite, Material-UI)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Atlas)
- **Authentication:** Firebase Auth

## 📁 Project Structure

```
.
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React context providers
│   │   ├── services/      # API services
│   │   └── assets/        # Static assets
│   └── public/            # Static files
│
├── server/                # Node.js backend
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   └── services/          # Background services (e.g., booking expiration)
└── README.md              # Project documentation
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Firebase project for authentication

### 1. Clone the repository
```bash
# Clone the repo
git clone <your-repo-url>
cd negsus-lab-2/negsus-lab-tracking
```

### 2. Install dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Configure Environment Variables
- Copy your MongoDB connection string and Firebase credentials to the appropriate config files or environment variables.
- Example for backend (`server/.env`):
  ```env
  MONGODB_URI=your_mongodb_connection_string
  FIREBASE_PROJECT_ID=your_firebase_project_id
  ...
  ```

### 4. Start the development servers
```bash
# Backend
cd server
npm run dev

# Frontend
cd ../client
npm run dev
```

The frontend will typically run on `http://localhost:5173` and the backend on `http://localhost:5000`.

## 🔐 Authentication & Roles
- **User:** Can book computers, view/cancel their bookings, receive notifications.
- **Admin:** Can approve/reject/cancel bookings, manage computers, view all users, receive all notifications.

## 📲 Key Usage Notes
- **Booking:** Users can book available computers for specific time slots (subject to admin approval).
- **Notifications:**
  - Users and admins receive system-generated notifications for booking creation, approval, rejection, expiration, and cancellation.
  - Admins can send manual notifications to users.
- **Booking Expiration:**
  - When a booking ends, the computer is automatically released and notifications are sent to both the user and all admins.

## 📝 API Endpoints (Summary)

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user
- `GET /api/bookings` — Get bookings (user or admin)
- `POST /api/bookings` — Create new booking
- `PUT /api/bookings/:id/status` — Update booking status (admin)
- `GET /api/computers/with-bookings` — Get computers with current/future bookings
- `GET /api/notifications` — Get notifications for user/admin

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

**For questions or support, please open an issue or contact the maintainers.**
