"use client"
import Agent from '@/components/Agent'
import { useUser } from '@clerk/nextjs'
import React from 'react'

const page = () => {

    const { user } = useUser()

    return (
        <>
            <h3>Interview Generation</h3>

            <Agent firstName={user?.firstName!} userId={user?.id!} type='generate' />
        </>

    )
}

export default page