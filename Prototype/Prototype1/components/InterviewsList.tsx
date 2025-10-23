'use client'

import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '@/firebase'
import { useUser } from '@clerk/nextjs'
import InterviewCard from './InterviewCard'

const InterviewsList = () => {
  const { user } = useUser()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    // Set up real-time listener
    const q = query(
      collection(db, 'interviews'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interviewList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Interview[]
      
      setInterviews(interviewList)
      setLoading(false)
    })

    // Cleanup subscription
    return () => unsubscribe()
  }, [user?.id])

  return (
    <div className='interviews-section'>
      {loading ? (
        <p className='text-gray-500'>Loading your interviews...</p>
      ) : interviews.length > 0 ? (
        interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            {...interview}
          />
        ))
      ) : (
        <p className='text-gray-500'>You have no interviews yet. Start practicing now!</p>
      )}
    </div>
  )
}

export default InterviewsList
