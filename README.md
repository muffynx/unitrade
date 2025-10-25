# project-unitrade

ติดตั้ง packages ที่จำเป็น (Frontend)
npm install
npm install react-router-dom axios formik yup react-icons tailwindcss @headlessui/react
npm install firebase
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-toastify

อย่าพึงรันนะ
สร้างโปรเจค Backend
mkdir server
cd server
npm init -y
npm install @types/nodemailer --save-dev
npm install express mongoose dotenv cors bcrypt jsonwebtoken multer helmet morgan
npm install nodemon -D
npm i --save-dev @types/bcrypt

# ในโฟลเดอร์ server

npm install google-auth-library bcryptjs
npm install -D @types/bcryptjs

รันเซิฟเวอร์ cd server
npm run dev
รันfrontend npm run dev ในไฟล์ project-unitrade

# ติดตั้ง dependencies

npm init -y
npm install express mongoose bcryptjs jsonwebtoken cors dotenv
npm install -D typescript @types/express @types/mongoose @types/bcryptjs @types/jsonwebtoken @types/cors ts-node nodemon

# สร้างไฟล์ tsconfig.json

npx tsc --init

จะเชื่ิอม mongodbเก็บฐานข้อมูล
จะเชื่อม fisebase เพื่อเก็บรูปภาพ

ติดตั้ง mongodb
npm init -y
npm install express mongoose cors dotenv

project-unitrade/
├── client/ # Frontend (React Vite)
│ ├── public/
│ ├── src/
│ │ ├── assets/ # รูปภาพ, ไฟล์ static
│ │ ├── components/ # Reusable components
│ │ ├── contexts/ # React contexts (Auth, Cart, etc.)
│ │ ├── hooks/ # Custom hooks
│ │ ├── pages/ # หน้าต่างๆ ของแอป
│ │ ├── services/ # API services
│ │ ├── utils/ # Utility functions
│ │ ├── App.jsx # Main App component
│ │ ├── main.jsx # Entry point
│ │ └── routes.jsx # Router configuration
│ └── package.json
│
├── server/ # Backend (Express, MongoDB)
│ ├── config/ # Configuration files
│ ├── controllers/ # Route controllers
│ ├── middleware/ # Middleware functions
│ ├── models/ # MongoDB models
│ ├── routes/ # API routes
│ ├── utils/ # Utility functions
│ ├── index.js # Entry point
│ └── package.json
│
└── README.md
