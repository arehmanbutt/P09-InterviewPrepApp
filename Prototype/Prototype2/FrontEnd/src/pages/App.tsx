import React from 'react'
import Header from '../components/layout/Header'
import GlobalGradient from '../components/layout/GlobalGradient'

const App: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <Header />
      <div className="relative">
        <GlobalGradient />
        {children}
      </div>
    </div>
  )
}

export default App
