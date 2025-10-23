
import { adminDb } from "@/firebase-admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { google } from "@ai-sdk/google";
import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};


// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
    console.log("GET request received at /api/vapi/generate");
    auth.protect();
    return new NextResponse("This endpoint only supports POST requests", {
        status: 200,
        headers: corsHeaders
    });
}


export async function POST(request: NextRequest) {
    console.log("Request received at /api/vapi/generate");
    const { type, role, level, techStack, amount, userid } = await request.json();


    console.log({ type, role, level, techStack, amount, userid });


    try {
        const { text: questions } = await generateText({
            model: google('gemini-2.0-flash-001'),
            prompt: `Prepare questions for a job interview.
            The job role is: ${role}.
            The job experience level is: ${level}.
            The tech stack used in the job is: ${techStack}.
            The focus between behavioral and technical questions should lean towards: ${type}.
            The amount of questions required is: ${amount}.
            Please return only the questions, without any additional text.
            The questions are going to be read by a voice assistant so donot use "/" or "*" or any other special characters that might break the voice assistant.
            Return the questions formatted like this:
            ["Question 1", "Question 2", "Question 3"]

            Thank you! <3
            `,

        });

        const interview = {
            role, type, level,
            techstack: techStack.split(','),
            questions: JSON.parse(questions),
            userId: userid,
            createdAt: new Date().toISOString(),
            finalized: true,
            coverImage: getRandomInterviewCover(),
        }


        const docCollectionRef = adminDb.collection('interviews');
        const docRef = await docCollectionRef.add(interview);

        await adminDb
            .collection('users')
            .doc(userid)
            .collection('interviews')
            .doc(docRef.id)
            .set({
                userId: userid,
                interviewId: docRef.id,
                createdAt: new Date().toISOString(),
            });

        return NextResponse.json({
            success: true
        }, {
            status: 200,
            headers: corsHeaders
        })
    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json("Failed to generate questions", {
            status: 500,
            headers: corsHeaders
        });
    }
}
