import { adminDb } from '@/firebase-admin'
import { extractUserData } from '@/lib/utils'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const evt = await verifyWebhook(req)
        if (evt.type === 'user.created') {
            const user = evt.data as ClerkUserWebhookPayload
            const userData = extractUserData(user)

            await adminDb
                .collection('users')
                .doc(userData.clerkId)
                .set(userData, { merge: true })

            console.log('User created:', userData)
        }

        return new Response('Webhook received', { status: 200 })
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return new Response('Error verifying webhook', { status: 400 })
    }
}