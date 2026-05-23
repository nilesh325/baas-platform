import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Tickets from './pages/Tickets'
import Profile from './pages/Profile'
import ContactUs from './pages/ContactUs'
import ChatbotLogin from './pages/ChatbotLogin'
import ChatbotWindow from './pages/ChatbotWindow'

function App() {
  const basename = (import.meta.env.DEV || window.location.pathname.startsWith('/static')) ? '/static' : '/';
  return (
    <Router basename={basename}>
      <div className="flex flex-col min-h-screen">
        {/* Navbar displays dynamically except on customer support paths */}
        <Navbar />
        
        {/* Main content body */}
        <div className="flex-1 w-full relative">
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/home" element={<Home />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/contactus" element={<ContactUs />} />
            <Route path="/ai/:company_id/login" element={<ChatbotLogin />} />
            <Route path="/ai/:company_id/:session_id" element={<ChatbotWindow />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
